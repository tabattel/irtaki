import { NextResponse } from "next/server";

import { getAuthenticatedUserFromRequest } from "@/auth/http/get-authenticated-user";
import { ChildProfileService } from "@/auth/child-profile/child-profile-service";

export async function GET(request: Request) {
  const user = await getAuthenticatedUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const service = new ChildProfileService();
  const profiles = await service.list(user.id);

  return NextResponse.json({ profiles });
}

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const body = await request.json();

    if (typeof body.name !== "string") {
      return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
    }

    const service = new ChildProfileService();

    const profile = await service.create({
      userId: user.id,
      name: body.name,
    });

    return NextResponse.json({ profile }, { status: 201 });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "INVALID_CHILD_PROFILE_NAME"
    ) {
      return NextResponse.json(
        { error: "INVALID_CHILD_PROFILE_NAME" },
        { status: 400 },
      );
    }

    console.error("Child profile creation error:", error);

    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR" },
      { status: 500 },
    );
  }
}
