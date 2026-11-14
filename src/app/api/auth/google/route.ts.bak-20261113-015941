import { randomBytes } from "node:crypto";

import { NextResponse } from "next/server";

import { GoogleAuthService } from "@/auth/google/google-auth-service";

export async function GET() {
  try {
    const state = randomBytes(32).toString("hex");

    const service = new GoogleAuthService();
    const authorizationUrl = service.getAuthorizationUrl(state);

    const response = NextResponse.redirect(authorizationUrl);

    response.cookies.set("irtaki_google_state", state, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 10 * 60,
    });

    return response;
  } catch (error) {
    console.error("Google OAuth error:", error);

    return NextResponse.json(
      { error: "GOOGLE_OAUTH_NOT_CONFIGURED" },
      { status: 500 },
    );
  }
}
