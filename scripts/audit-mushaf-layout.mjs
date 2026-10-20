#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { gunzipSync } from "node:zlib";

const [, , htmlFileArg] = process.argv;

const HTML_FILE =
  htmlFileArg ??
  "/mnt/data/Texte collé(20260923-181500).txt";

const RAW_MUSHAF =
  "/home/zaki/irtaki/storage/quranpedia/2026-09-11/raw/mushafs-2.json.gz";

const OUTPUT_DIR = path.resolve("tmp/mushaf-layout-audit");

async function readText(file) {
  return fs.readFile(file, "utf8");
}

async function readGzipJson(file) {
  const buffer = await fs.readFile(file);
  return JSON.parse(gunzipSync(buffer).toString("utf8"));
}

function unique(values) {
  return [...new Set(values)];
}

function extractSvgUrls(html) {
  const matches = [
    ...html.matchAll(
      /data-svg-url=["']([^"']*\/api\/page\/hafs\/[^"']+)["']/g,
    ),
  ];

  return unique(matches.map((match) => match[1]));
}

function normalizeUrl(url) {
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  return `https://quranpedia.net${url}`;
}

function extractNumbers(value, pattern) {
  return unique(
    [...value.matchAll(pattern)].map((match) => match[1]),
  );
}

function analyzeSvg(svg, page) {
  const tagCounts = {};

  for (const match of svg.matchAll(/<([a-zA-Z][\w:-]*)\b/g)) {
    const tag = match[1];
    tagCounts[tag] = (tagCounts[tag] ?? 0) + 1;
  }

  const attributes = {
    viewBox: svg.match(/\bviewBox=["']([^"']+)["']/i)?.[1] ?? null,
    width: svg.match(/\bwidth=["']([^"']+)["']/i)?.[1] ?? null,
    height: svg.match(/\bheight=["']([^"']+)["']/i)?.[1] ?? null,
    dataPage: svg.match(/\bdata-page=["']([^"']+)["']/i)?.[1] ?? null,
    dataMushaf: svg.match(/\bdata-mushaf=["']([^"']+)["']/i)?.[1] ?? null,
    dataRiwayah:
      svg.match(/\bdata-riwayah=["']([^"']+)["']/i)?.[1] ?? null,
    dataQiraah:
      svg.match(/\bdata-qiraah=["']([^"']+)["']/i)?.[1] ?? null,
  };

  const surahs = extractNumbers(svg, /\bsurah=["']([^"']+)["']/g);
  const ayahs = extractNumbers(svg, /\bayah=["']([^"']+)["']/g);

  const hasAyahPolygon =
    /class=["'][^"']*\bayahPolygon\b[^"']*["']/i.test(svg) ||
    /\bayahPolygon\b/i.test(svg);

  const hasLines =
    /data-line=/i.test(svg) ||
    /class=["'][^"']*\bline\b[^"']*["']/i.test(svg) ||
    /<line\b/i.test(svg);

  const hasWords =
    /\bword\b/i.test(svg) ||
    /data-word/i.test(svg);

  const hasText =
    /<text\b/i.test(svg) ||
    /<tspan\b/i.test(svg);

  const hasCoordinates =
    /\bpoints=["']/i.test(svg) ||
    /\bx=["']/i.test(svg) ||
    /\by=["']/i.test(svg) ||
    /\bd=["']/i.test(svg) ||
    /\btransform=["']/i.test(svg);

  return {
    requestedPage: page,
    bytes: Buffer.byteLength(svg, "utf8"),
    tagCounts,
    attributes,
    surahs,
    ayahs,
    ayahPolygon: hasAyahPolygon,
    explicitLines: hasLines,
    explicitWords: hasWords,
    textElements: hasText,
    coordinates: hasCoordinates,
  };
}

async function fetchSvg(url) {
  const response = await fetch(url, {
    headers: {
      accept: "image/svg+xml,text/plain,*/*",
      "user-agent": "IRTAKI-MushafLayoutAudit/1.0",
    },
  });

  const body = await response.text();

  return {
    ok: response.ok,
    status: response.status,
    contentType: response.headers.get("content-type"),
    body,
  };
}

async function main() {
  console.log("=== IRTAKI — Mushaf Layout Audit ===");
  console.log();

  console.log(`HTML source : ${HTML_FILE}`);
  console.log(`RAW source  : ${RAW_MUSHAF}`);
  console.log();

  const html = await readText(HTML_FILE);

  const svgUrls = extractSvgUrls(html);

  console.log(`SVG URLs trouvées : ${svgUrls.length}`);
  console.log();

  if (svgUrls.length === 0) {
    throw new Error(
      "Aucune URL /api/page/hafs/ trouvée dans le fichier HTML.",
    );
  }

  console.log("Premières URLs :");
  for (const url of svgUrls.slice(0, 10)) {
    console.log(`  ${url}`);
  }

  console.log();

  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  // Pages prioritaires : page 4 + premières pages trouvées.
  const priority = [
    ...svgUrls.filter((url) => /\/4(?:\?|$)/.test(url)),
    ...svgUrls,
  ];

  const selected = unique(priority).slice(0, 5);

  const reports = [];

  for (const rawUrl of selected) {
    const url = normalizeUrl(rawUrl);
    const page =
      url.match(/\/api\/page\/hafs\/(\d+)/)?.[1] ?? "unknown";

    console.log(`--- Page ${page} ---`);
    console.log(`GET ${url}`);

    try {
      const result = await fetchSvg(url);

      console.log(`HTTP       : ${result.status}`);
      console.log(`Content-Type: ${result.contentType ?? "unknown"}`);

      if (!result.ok) {
        console.log("ERREUR HTTP");
        console.log();
        continue;
      }

      const outputFile = path.join(
        OUTPUT_DIR,
        `page-${String(page).padStart(3, "0")}.svg`,
      );

      await fs.writeFile(outputFile, result.body, "utf8");

      const report = analyzeSvg(result.body, page);

      reports.push({
        url,
        ...report,
      });

      console.log(`Taille     : ${report.bytes} octets`);
      console.log(`viewBox    : ${report.attributes.viewBox ?? "N/A"}`);
      console.log(`ayahPolygon: ${report.ayahPolygon ? "OUI" : "NON"}`);
      console.log(`lignes     : ${report.explicitLines ? "OUI" : "NON"}`);
      console.log(`mots       : ${report.explicitWords ? "OUI" : "NON"}`);
      console.log(`<text>     : ${report.textElements ? "OUI" : "NON"}`);
      console.log(`coordonnées: ${report.coordinates ? "OUI" : "NON"}`);
      console.log(`surahs     : ${report.surahs.join(", ") || "N/A"}`);
      console.log(`ayahs      : ${report.ayahs.length}`);
      console.log(`SVG sauvegardé : ${outputFile}`);
    } catch (error) {
      console.log(
        `ERREUR réseau : ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    console.log();
  }

  if (reports.length > 0) {
    const reportFile = path.join(OUTPUT_DIR, "report.json");

    await fs.writeFile(
      reportFile,
      JSON.stringify(reports, null, 2),
      "utf8",
    );

    console.log(`Rapport : ${reportFile}`);
  }

  // Audit local du Mushaf 2.
  console.log();
  console.log("=== Audit local mushafs-2.json.gz ===");

  try {
    const mushaf = await readGzipJson(RAW_MUSHAF);
    const data = mushaf.data;

    console.log(`Mushaf ID   : ${data.id}`);
    console.log(`Nom         : ${data.name}`);
    console.log(`Schema      : ${mushaf.schema}`);
    console.log(`Surahs      : ${data.surahs?.length ?? 0}`);

    const ayahs = data.surahs.flatMap((surah) =>
      surah.ayahs.map((ayah) => ({
        ...ayah,
        surah_id: surah.id,
      })),
    );

    const pages = unique(
      ayahs.map((ayah) => Number(ayah.page_number)),
    )
      .filter(Number.isFinite)
      .sort((a, b) => a - b);

    console.log(`Pages       : ${pages.length}`);
    console.log(`Première    : ${pages[0]}`);
    console.log(`Dernière    : ${pages.at(-1)}`);

    const page4 = ayahs.filter(
      (ayah) => Number(ayah.page_number) === 4,
    );

    console.log();
    console.log("Page 4 :");

    for (const ayah of page4) {
      console.log(
        `  ${ayah.surah}:${ayah.number} — ${ayah.text}`,
      );
    }
  } catch (error) {
    console.log(
      `RAW non accessible : ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  console.log();
  console.log("=== FIN AUDIT ===");
}

main().catch((error) => {
  console.error();
  console.error("Audit échoué.");
  console.error(error);
  process.exitCode = 1;
});
