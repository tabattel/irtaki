import { NextResponse } from "next/server";

import { SessionService } from "@/auth/session/session-service";

export async function POST(request: Request) {
  try {
    const sessionToken = request.headers
      .get("cookie")
      ?.match(/(?:^|;\s*)irtaki_session=([^;]+)/)?.[1];

    if (sessionToken) {
      const sessionService = new SessionService();
      await sessionService.revokeSession(sessionToken);
    }

    const response = new NextResponse(null, {
      status: 204,
    });

    response.cookies.set("irtaki_session", "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    });

    return response;
  } catch (error) {
    console.error("Logout error:", error);

    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR" },
      { status: 500 },
    );
  }
}
