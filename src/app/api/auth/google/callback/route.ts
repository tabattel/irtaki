import { NextResponse } from "next/server";

import { GoogleAuthService } from "@/auth/google/google-auth-service";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const cookies = request.headers.get("cookie") ?? "";

    const expectedState = cookies.match(
      /(?:^|;\s*)irtaki_google_state=([^;]+)/,
    )?.[1];

    if (!code || !state || !expectedState || state !== expectedState) {
      return NextResponse.json(
        { error: "INVALID_OAUTH_STATE" },
        { status: 400 },
      );
    }

    const service = new GoogleAuthService();

    const result = await service.authenticate(code);

    const response = NextResponse.redirect(new URL("/", request.url));

    response.cookies.set("irtaki_session", result.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });

    response.cookies.set("irtaki_google_state", "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
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
