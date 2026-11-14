import { createHmac, randomBytes } from "node:crypto";

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

export async function GET() {
  try {
    const rawState = randomBytes(32).toString("hex");
    const signedState = signState(rawState);

    const service = new GoogleAuthService();
    const authorizationUrl = service.getAuthorizationUrl(signedState);

    return NextResponse.redirect(authorizationUrl);
  } catch (error) {
    console.error("Google OAuth error:", error);

    return NextResponse.json(
      { error: "GOOGLE_OAUTH_NOT_CONFIGURED" },
      { status: 500 },
    );
  }
}
