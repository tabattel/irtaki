import { NextResponse } from "next/server";
import { z } from "zod";
import { createEmailSender } from "@/auth/email/email-sender";
import { PasswordResetService } from "@/auth/password/password-reset-service";

function resolveOrigin(request: Request): string {
  const headers = request.headers;

  // 1. Priorité : variable d'env explicite (recommandé en prod)
  const envUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL;
  if (envUrl) return envUrl.replace(/\/$/, "");

  // 2. Cloudflare Tunnel / reverse proxy
  const forwardedHost = headers.get("x-forwarded-host");
  if (forwardedHost) {
    const proto = headers.get("x-forwarded-proto") ?? "https";
    return `${proto}://${forwardedHost}`;
  }

  // 3. Fallback
  return new URL(request.url).origin;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const parsed = z.object({ email: z.string().email() }).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
  }

  const origin = resolveOrigin(request);
  const service = new PasswordResetService(createEmailSender());

  await service
    .requestPasswordReset({ email: parsed.data.email, origin })
    .catch((e) => console.error("[forgot-password]", e));

  return NextResponse.json({ ok: true }, { status: 200 });
}
