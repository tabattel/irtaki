import { AnnotationService } from "@/annotation/annotation-service";
import { getAuthenticatedUserFromRequest } from "@/auth/http/get-authenticated-user";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(
  request: Request,
  context: RouteContext,
) {
  const user = await getAuthenticatedUserFromRequest(request);

  if (!user) {
    return Response.json(
      { error: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  const { id } = await context.params;
  const service = new AnnotationService();

  const annotation = await service.get({
    userId: user.id,
    annotationId: id,
  });

  if (!annotation) {
    return Response.json(
      { error: "ANNOTATION_NOT_FOUND" },
      { status: 404 },
    );
  }

  return Response.json(annotation);
}

export async function PATCH(
  request: Request,
  context: RouteContext,
) {
  const user = await getAuthenticatedUserFromRequest(request);

  if (!user) {
    return Response.json(
      { error: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  const { id } = await context.params;

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "INVALID_JSON" },
      { status: 400 },
    );
  }

  if (
    typeof body !== "object" ||
    body === null ||
    typeof (body as { content?: unknown }).content !== "string"
  ) {
    return Response.json(
      { error: "INVALID_ANNOTATION_INPUT" },
      { status: 400 },
    );
  }

  const service = new AnnotationService();

  try {
    const annotation = await service.update({
      userId: user.id,
      annotationId: id,
      content: (body as { content: string }).content,
    });

    return Response.json(annotation);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "INVALID_ANNOTATION_CONTENT"
    ) {
      return Response.json(
        { error: "INVALID_ANNOTATION_CONTENT" },
        { status: 400 },
      );
    }

    if (
      error instanceof Error &&
      error.message === "ANNOTATION_NOT_FOUND"
    ) {
      return Response.json(
        { error: "ANNOTATION_NOT_FOUND" },
        { status: 404 },
      );
    }

    throw error;
  }
}

export async function DELETE(
  request: Request,
  context: RouteContext,
) {
  const user = await getAuthenticatedUserFromRequest(request);

  if (!user) {
    return Response.json(
      { error: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  const { id } = await context.params;
  const service = new AnnotationService();

  try {
    await service.delete({
      userId: user.id,
      annotationId: id,
    });

    return new Response(null, { status: 204 });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "ANNOTATION_NOT_FOUND"
    ) {
      return Response.json(
        { error: "ANNOTATION_NOT_FOUND" },
        { status: 404 },
      );
    }

    throw error;
  }
}
