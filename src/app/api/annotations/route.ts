import { AnnotationService } from "@/annotation/annotation-service";
import { getAuthenticatedUserFromRequest } from "@/auth/http/get-authenticated-user";

export async function GET(request: Request) {
  const user = await getAuthenticatedUserFromRequest(request);

  if (!user) {
    return Response.json(
      { error: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  const service = new AnnotationService();
  const annotations = await service.list(user.id);

  return Response.json(annotations);
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUserFromRequest(request);

  if (!user) {
    return Response.json(
      { error: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

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
    typeof (body as { ayahId?: unknown }).ayahId !== "number" ||
    !Number.isInteger((body as { ayahId: number }).ayahId) ||
    typeof (body as { content?: unknown }).content !== "string"
  ) {
    return Response.json(
      { error: "INVALID_ANNOTATION_INPUT" },
      { status: 400 },
    );
  }

  const service = new AnnotationService();

  try {
    const annotation = await service.create({
      userId: user.id,
      ayahId: (body as { ayahId: number }).ayahId,
      content: (body as { content: string }).content,
    });

    return Response.json(annotation, { status: 201 });
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
      error.message === "AYAH_NOT_FOUND"
    ) {
      return Response.json(
        { error: "AYAH_NOT_FOUND" },
        { status: 404 },
      );
    }

    throw error;
  }
}
