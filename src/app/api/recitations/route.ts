import { createHash, randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

import { getAuthenticatedUserFromRequest } from "@/auth/http/get-authenticated-user";
import { createLearningEngine } from "@/application/learning/learning-engine";
import {
  compareRecitation,
  isEligibleForServerStorage,
} from "@/application/recitation/recitation-metrics";
import { prisma } from "@irtaki/persistence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

function parsePositiveInteger(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string" || !/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function audioExtension(mimeType: string): string | null {
  if (mimeType.includes("webm")) return "webm";
  if (mimeType.includes("mp4")) return "m4a";
  if (mimeType.includes("ogg")) return "ogg";
  if (mimeType.includes("wav")) return "wav";
  return null;
}

export async function POST(request: Request) {
  let savedPath: string | null = null;

  try {
    const user = await getAuthenticatedUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > MAX_AUDIO_BYTES + 1024 * 1024) {
      return NextResponse.json({ error: "AUDIO_TOO_LARGE" }, { status: 413 });
    }

    const form = await request.formData();
    const learnerId = form.get("learnerId");
    const modeValue = form.get("mode");
    const transcriptValue = form.get("transcript");
    const ayahsValue = form.get("ayahs");
    const audioValue = form.get("audio");

    if (
      typeof learnerId !== "string" ||
      learnerId.length === 0 ||
      (modeValue !== "tarteel1" && modeValue !== "tarteel2") ||
      typeof transcriptValue !== "string" ||
      transcriptValue.trim().length === 0 ||
      transcriptValue.length > 100_000 ||
      typeof ayahsValue !== "string" ||
      typeof File === "undefined" ||
      !(audioValue instanceof File)
    ) {
      return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
    }

    if (audioValue.size === 0 || audioValue.size > MAX_AUDIO_BYTES) {
      return NextResponse.json({ error: "INVALID_AUDIO_SIZE" }, { status: 413 });
    }

    const extension = audioExtension(audioValue.type);
    if (!extension) {
      return NextResponse.json({ error: "UNSUPPORTED_AUDIO_FORMAT" }, { status: 415 });
    }

    const durationMs = parsePositiveInteger(form.get("durationMs"));
    const riwayaId = parsePositiveInteger(form.get("riwayaId"));
    const mushafId = parsePositiveInteger(form.get("mushafId"));
    if (!durationMs || !riwayaId || !mushafId || durationMs > 3_600_000) {
      return NextResponse.json({ error: "INVALID_METADATA" }, { status: 400 });
    }

    let rawAyahs: unknown;
    try {
      rawAyahs = JSON.parse(ayahsValue);
    } catch {
      return NextResponse.json({ error: "INVALID_AYAHS" }, { status: 400 });
    }

    if (
      !Array.isArray(rawAyahs) ||
      rawAyahs.length === 0 ||
      rawAyahs.length > 300 ||
      !rawAyahs.every(
        (item) =>
          typeof item === "object" &&
          item !== null &&
          Number.isSafeInteger((item as { id?: unknown }).id) &&
          (item as { id: number }).id > 0,
      )
    ) {
      return NextResponse.json({ error: "INVALID_AYAHS" }, { status: 400 });
    }

    const ayahIds = [...new Set(rawAyahs.map((item) => (item as { id: number }).id))];
    const engine = createLearningEngine();
    try {
      await engine.assertLearnerAccess(user.id, learnerId);
    } catch {
      return NextResponse.json({ error: "LEARNER_NOT_FOUND" }, { status: 404 });
    }

    let tariqId = parsePositiveInteger(form.get("tariqId"));
    let wajhId = parsePositiveInteger(form.get("wajhId"));
    if (modeValue === "tarteel1") {
      tariqId = null;
      wajhId = null;
    } else if (tariqId !== null) {
      const tariq = await prisma.tariq.findFirst({
        where: { id: tariqId, riwayaId },
        select: { id: true },
      });
      if (!tariq) {
        return NextResponse.json({ error: "INVALID_TARIQ" }, { status: 400 });
      }
      if (wajhId !== null) {
        const wajh = await prisma.wajh.findFirst({
          where: { id: wajhId, tariqId },
          select: { id: true },
        });
        if (!wajh) {
          return NextResponse.json({ error: "INVALID_WAJH" }, { status: 400 });
        }
      }
    } else if (wajhId !== null) {
      return NextResponse.json({ error: "WAJH_REQUIRES_TARIQ" }, { status: 400 });
    }

    const ayahs = await prisma.ayah.findMany({
      where: { id: { in: ayahIds } },
      orderBy: [{ surahNumber: "asc" }, { number: "asc" }],
      select: { id: true, text: true },
    });
    if (ayahs.length !== ayahIds.length) {
      return NextResponse.json({ error: "UNKNOWN_AYAH" }, { status: 400 });
    }

    const comparison = compareRecitation(
      ayahs.map((ayah) => ayah.text).join(" "),
      transcriptValue,
    );
    if (!isEligibleForServerStorage(comparison.werPercent)) {
      return NextResponse.json({
        stored: false,
        reason: "WER_OVER_20_PERCENT",
        werPercent: comparison.werPercent,
      });
    }

    const clientSessionId =
      typeof form.get("clientSessionId") === "string" &&
      (form.get("clientSessionId") as string).length <= 128
        ? (form.get("clientSessionId") as string)
        : randomUUID();

    const existing = await prisma.recitation.findUnique({
      where: { clientSessionId },
      select: { id: true, learnerId: true },
    });
    if (existing) {
      if (existing.learnerId !== learnerId) {
        return NextResponse.json({ error: "SESSION_ID_CONFLICT" }, { status: 409 });
      }
      return NextResponse.json({ stored: true, recitationId: existing.id, duplicate: true });
    }

    const storageRoot = path.resolve(
      process.env.RECITATION_STORAGE_DIR ??
        path.resolve(process.cwd(), "../irtaki-data/recitations"),
    );
    await mkdir(storageRoot, { recursive: true });
    const namingAyahs = await prisma.ayah.findMany({
      where: { id: { in: ayahIds } },
      select: { surahNumber: true, number: true },
      orderBy: [{ surahNumber: "asc" }, { number: "asc" }],
    });
    const firstNamingAyah = namingAyahs[0];
    if (!firstNamingAyah) {
      return NextResponse.json({ error: "RECITATION_AYAH_RANGE_EMPTY" }, { status: 400 });
    }

    const ayahCode =
      `${String(firstNamingAyah.surahNumber).padStart(3, "0")}` +
      `${String(firstNamingAyah.number).padStart(3, "0")}`;
    const qiraatCode =
      wajhId != null ? `wajh${wajhId}` : `tariq${tariqId ?? "unknown"}`;
    const safeTarteelId =
      clientSessionId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 128) || randomUUID();
    const ayahCountCode = String(namingAyahs.length).padStart(3, "0");
    const filename =
      `${ayahCode}-${ayahCountCode}-${comparison.grade}-${qiraatCode}-tarteel${safeTarteelId}.${extension}`;
    savedPath = path.join(storageRoot, filename);

    const bytes = Buffer.from(await audioValue.arrayBuffer());
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    await writeFile(savedPath, bytes, { flag: "wx", mode: 0o600 });

    const recitation = await prisma.recitation.create({
      data: {
        clientSessionId,
        learnerId,
        mode: modeValue,
        riwayaId,
        tariqId,
        wajhId,
        startedAt: new Date(Date.now() - durationMs),
        endedAt: new Date(),
        durationMs,
        status: "uploaded",
        originalPath: path.relative(storageRoot, savedPath),
        originalFormat: audioValue.type.split(";")[0] || "application/octet-stream",
        originalBytes: bytes.length,
        originalSha256: sha256,
        timeline: {
          source: "tarteel",
          mushafId,
          ayahIds,
          transcript: transcriptValue,
          werPercent: comparison.werPercent,
          grade: comparison.grade,
          substitutions: comparison.substitutions,
          deletions: comparison.deletions,
          insertions: comparison.insertions,
          normalizationVersion: comparison.normalizationVersion,
          werAlgorithmVersion: comparison.werAlgorithmVersion,
        },
      },
      select: { id: true },
    });

    return NextResponse.json({
      stored: true,
      recitationId: recitation.id,
      werPercent: comparison.werPercent,
      grade: comparison.grade,
    });
  } catch (error) {
    if (savedPath) await unlink(savedPath).catch(() => {});
    const diagnosticCode =
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      typeof error.code === "string"
        ? error.code
        : error instanceof Error
          ? error.name
          : "UNKNOWN_ERROR";
    console.error("Tarteel recitation upload failed:", diagnosticCode, error);
    return NextResponse.json(
      { error: "RECITATION_UPLOAD_FAILED", diagnosticCode },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const params = new URL(request.url).searchParams;
    const learnerId = params.get("learnerId");
    const mode = params.get("mode");
    const riwayaId = Number(params.get("riwayaId"));
    const mushafId = Number(params.get("mushafId"));

    if (
      !learnerId ||
      (mode !== "tarteel1" && mode !== "tarteel2") ||
      !Number.isSafeInteger(riwayaId) ||
      riwayaId < 1 ||
      !Number.isSafeInteger(mushafId) ||
      mushafId < 1
    ) {
      return NextResponse.json({ error: "INVALID_QUERY" }, { status: 400 });
    }

    const engine = createLearningEngine();
    try {
      await engine.assertLearnerAccess(user.id, learnerId);
    } catch {
      return NextResponse.json({ error: "LEARNER_NOT_FOUND" }, { status: 404 });
    }

    const records = await prisma.recitation.findMany({
      where: { learnerId, mode, riwayaId },
      orderBy: { startedAt: "desc" },
      select: {
        id: true,
        mode: true,
        riwayaId: true,
        tariqId: true,
        wajhId: true,
        startedAt: true,
        durationMs: true,
        originalFormat: true,
        originalBytes: true,
        timeline: true,
        tariq: { select: { name: true } },
        wajh: { select: { name: true } },
      },
    });

    const recordData = records.flatMap((record) => {
      const timeline =
        record.timeline !== null &&
        typeof record.timeline === "object" &&
        !Array.isArray(record.timeline)
          ? (record.timeline as Record<string, unknown>)
          : null;

      if (timeline?.mushafId !== mushafId || !Array.isArray(timeline.ayahIds)) {
        return [];
      }

      const ayahIds = timeline.ayahIds.filter(
        (id): id is number =>
          typeof id === "number" && Number.isSafeInteger(id) && id > 0,
      );

      return [{
        record,
        timeline,
        ayahIds,
      }];
    });

    const allAyahIds = [...new Set(recordData.flatMap((item) => item.ayahIds))];
    const ayahs = allAyahIds.length
      ? await prisma.ayah.findMany({
          where: { id: { in: allAyahIds } },
          orderBy: [{ surahNumber: "asc" }, { number: "asc" }],
          select: {
            id: true,
            number: true,
            surahNumber: true,
            surah: { select: { name: true } },
          },
        })
      : [];

    const ayahById = new Map(ayahs.map((ayah) => [ayah.id, ayah]));

    const data = recordData.map(({ record, timeline, ayahIds }) => ({
      id: record.id,
      mode: record.mode,
      riwayaId: record.riwayaId,
      tariqId: record.tariqId,
      tariqName: record.tariq?.name ?? "",
      wajhId: record.wajhId,
      wajhName: record.wajh?.name ?? "",
      startedAt: record.startedAt.toISOString(),
      durationMs: record.durationMs,
      originalFormat: record.originalFormat,
      originalBytes: record.originalBytes,
      audioUrl: `/api/recitations/${encodeURIComponent(record.id)}/audio`,
      werPercent:
        typeof timeline.werPercent === "number" ? timeline.werPercent : null,
      grade: typeof timeline.grade === "string" ? timeline.grade : null,
      ayahs: ayahIds.flatMap((id) => {
        const ayah = ayahById.get(id);
        return ayah
          ? [{
              id: ayah.id,
              surahNumber: ayah.surahNumber,
              ayahNumber: ayah.number,
              surahName: ayah.surah.name,
            }]
          : [];
      }),
    }));

    return NextResponse.json(
      { data },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    console.error("Tarteel recitation list failed:", error);
    return NextResponse.json(
      { error: "RECITATION_LIST_FAILED" },
      { status: 500 },
    );
  }
}
