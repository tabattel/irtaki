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
  const ayahId = Number(id);

  if (!Number.isInteger(ayahId) || ayahId <= 0) {
    return Response.json(
      { error: "INVALID_AYAH_ID" },
      { status: 400 },
    );
  }

  const service = new AnnotationService();

  const annotations = await service.listByAyah({
    userId: user.id,
    ayahId,
  });

  return Response.json(annotations);
}
