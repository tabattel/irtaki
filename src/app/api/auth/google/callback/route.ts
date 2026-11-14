import { createHmac, timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { GoogleAuthService } from "@/auth/google/google-auth-service";

function signState(rawState: string): string {
  const secret =
    process.env.GOOGLE_STATE_SECRET ??
    process.env.GOOGLE_CLIENT_SECRET ??
    "dev-secret";
  const signature = createHmac("sha256", secret)
    .update(rawState)
    .digest("hex")
    .slice(0, 16);
  return `${rawState}.${signature}`;
}

function verifyState(signedState: string): string | null {
  const parts = signedState.split(".");
  if (parts.length !== 2) return null;

  const [rawState, signature] = parts;
  const expectedSignature = createHmac(
    "sha256",
    process.env.GOOGLE_STATE_SECRET ??
      process.env.GOOGLE_CLIENT_SECRET ??
      "dev-secret",
  )
    .update(rawState)
    .digest("hex")
    .slice(0, 16);

  try {
    if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return null;
    }
  } catch {
    return null;
  }

  return rawState;
}

function resolveOrigin(request: Request): string {
  const headers = request.headers;

  // 1. Variable d'env explicite (le plus fiable)
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

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const signedState = url.searchParams.get("state");

    if (!code || !signedState) {
      return NextResponse.json({ error: "INVALID_OAUTH_STATE" }, { status: 400 });
    }

    const verified = verifyState(signedState);
    if (!verified) {
      return NextResponse.json({ error: "INVALID_OAUTH_STATE" }, { status: 400 });
    }

    const service = new GoogleAuthService();
    const result = await service.authenticate(code);

    // ⚠️ CORRECTION : construire l'URL de redirection avec l'origine publique
    const origin = resolveOrigin(request);
    const response = NextResponse.redirect(new URL("/", origin));

    response.cookies.set("irtaki_session", result.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });

    return response;
  } catch (error) {
    console.error("Google OAuth callback error:", error);

    return NextResponse.json(
      { error: "GOOGLE_AUTHENTICATION_FAILED" },
      { status: 401 },
    );
  }
}
