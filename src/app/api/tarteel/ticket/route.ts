import { getAuthenticatedUserFromRequest } from "@/auth/http/get-authenticated-user";
import {
  createTarteelTicket,
  readTarteelTicketSecret,
  TARTEEL_ALLOWED_MODES,
  type TarteelMode,
} from "@/auth/tarteel/tarteel-ticket";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_SIZE = 1024;

function jsonResponse(
  data: Record<string, unknown>,
  status: number,
): Response {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store, private",
      Pragma: "no-cache",
    },
  });
}

async function readBoundedJson(request: Request): Promise<unknown> {
  const reader = request.body?.getReader();

  if (!reader) {
    throw new Error("INVALID_BODY");
  }

  const chunks: Uint8Array[] = [];
  let totalSize = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      totalSize += value.byteLength;

      if (totalSize > MAX_BODY_SIZE) {
        await reader.cancel();
        throw new Error("BODY_TOO_LARGE");
      }

      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(totalSize);
  let offset = 0;

  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return JSON.parse(new TextDecoder().decode(body));
  } catch {
    throw new Error("INVALID_JSON");
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    // 1. Vérification stricte de l'origine.
    const origin = request.headers.get("origin");
    const requestOrigin = new URL(request.url).origin;

    if (!origin || origin !== requestOrigin) {
      return jsonResponse(
        { error: "ORIGIN_NOT_ALLOWED" },
        403,
      );
    }

    // 2. Vérification du type de contenu.
    const contentType = request.headers
      .get("content-type")
      ?.split(";")[0]
      .trim()
      .toLowerCase();

    if (contentType !== "application/json") {
      return jsonResponse(
        { error: "UNSUPPORTED_CONTENT_TYPE" },
        415,
      );
    }

    // 3. Contrôle préliminaire de la taille.
    const contentLength = request.headers.get("content-length");

    if (
      contentLength &&
      /^\d+$/.test(contentLength) &&
      Number(contentLength) > MAX_BODY_SIZE
    ) {
      return jsonResponse(
        { error: "BODY_TOO_LARGE" },
        413,
      );
    }

    // 4. Authentification obligatoire.
    const user = await getAuthenticatedUserFromRequest(request);

    if (!user) {
      return jsonResponse(
        { error: "UNAUTHORIZED" },
        401,
      );
    }

    // 5. Lecture et validation du corps.
    let body: unknown;

    try {
      body = await readBoundedJson(request);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "BODY_TOO_LARGE"
      ) {
        return jsonResponse(
          { error: "BODY_TOO_LARGE" },
          413,
        );
      }

      return jsonResponse(
        { error: "INVALID_REQUEST_BODY" },
        400,
      );
    }

    if (
      typeof body !== "object" ||
      body === null ||
      !("mode" in body) ||
      typeof body.mode !== "string" ||
      !TARTEEL_ALLOWED_MODES.includes(body.mode as TarteelMode)
    ) {
      return jsonResponse(
        { error: "INVALID_MODE" },
        400,
      );
    }

    // 6. Lecture du secret protégé et génération du ticket.
    const secret = await readTarteelTicketSecret();

    const result = createTarteelTicket(
      user.id,
      body.mode as TarteelMode,
      secret,
    );

    // 7. Réponse sans mise en cache.
    return jsonResponse(
      {
        ticket: result.ticket,
        expiresAt: result.expiresAt,
      },
      200,
    );
  } catch {
    // Ne jamais exposer les détails internes ou le secret.
    return jsonResponse(
      { error: "TICKET_ISSUANCE_FAILED" },
      500,
    );
  }
}
