import { NextResponse } from "next/server";

import { AuthService } from "@/auth/service/auth-service";
import { SessionService } from "@/auth/session/session-service";

export async function GET(request: Request) {
  try {
    const sessionToken = request.headers
      .get("cookie")
      ?.match(/(?:^|;\s*)irtaki_session=([^;]+)/)?.[1];

    if (!sessionToken) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    const sessionService = new SessionService();
    const session = await sessionService.getSession(sessionToken);

    if (!session) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    const authService = new AuthService();
    const user = await authService.getAuthenticatedUser(session.userId);

    if (!user) {
      await sessionService.revokeSession(sessionToken);

      return NextResponse.json({ user: null }, { status: 200 });
    }

    return NextResponse.json({ user }, { status: 200 });
  } catch (error) {
    console.error("Session lookup error:", error);

    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR" },
      { status: 500 },
    );
  }
}
