import { NextResponse } from "next/server";

import { ChildProfileService } from "@/auth/child-profile/child-profile-service";
import { getAuthenticatedUserFromRequest } from "@/auth/http/get-authenticated-user";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(request: Request, context: RouteContext) {
  const user = await getAuthenticatedUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { id } = await context.params;

  const service = new ChildProfileService();

  const profile = await service.get({
    userId: user.id,
    childProfileId: id,
  });

  if (!profile) {
    return NextResponse.json(
      { error: "CHILD_PROFILE_NOT_FOUND" },
      { status: 404 },
    );
  }

  return NextResponse.json({ profile });
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const user = await getAuthenticatedUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await request.json();

    if (typeof body.name !== "string") {
      return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
    }

    const service = new ChildProfileService();

    const profile = await service.update({
      userId: user.id,
      childProfileId: id,
      name: body.name,
    });

    return NextResponse.json({ profile });
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

    if (error instanceof Error && error.message === "CHILD_PROFILE_NOT_FOUND") {
      return NextResponse.json(
        { error: "CHILD_PROFILE_NOT_FOUND" },
        { status: 404 },
      );
    }

    console.error("Child profile update error:", error);

    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const user = await getAuthenticatedUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const { id } = await context.params;

    const service = new ChildProfileService();

    await service.delete({
      userId: user.id,
      childProfileId: id,
    });

    return new NextResponse(null, {
      status: 204,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "CHILD_PROFILE_NOT_FOUND") {
      return NextResponse.json(
        { error: "CHILD_PROFILE_NOT_FOUND" },
        { status: 404 },
      );
    }

    console.error("Child profile deletion error:", error);

    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR" },
      { status: 500 },
    );
  }
}
