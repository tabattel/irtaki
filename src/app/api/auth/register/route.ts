import { NextResponse } from "next/server";

import { AuthService } from "@/auth/service/auth-service";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (typeof body.email !== "string" || typeof body.password !== "string") {
      return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
    }

    const authService = new AuthService();

    const result = await authService.register({
      email: body.email,
      password: body.password,
      name: typeof body.name === "string" ? body.name : undefined,
    });

    const response = NextResponse.json(
      {
        user: result.user,
      },
      { status: 201 },
    );

    response.cookies.set("irtaki_session", result.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });

    return response;
  } catch (error) {
    if (error instanceof Error && error.message === "EMAIL_ALREADY_EXISTS") {
      return NextResponse.json(
        { error: "EMAIL_ALREADY_EXISTS" },
        { status: 409 },
      );
    }

    console.error("Registration error:", error);

    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR" },
      { status: 500 },
    );
  }
}
