import { AuthService } from "@/auth/service/auth-service";
import { getAuthenticatedUserFromRequest } from "@/auth/http/get-authenticated-user";

export async function PATCH(request: Request) {
  const authenticatedUser = await getAuthenticatedUserFromRequest(request);

  if (!authenticatedUser) {
    return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return Response.json({ error: "INVALID_OWNER_NAME" }, { status: 400 });
  }

  const name = (body as { name?: unknown }).name;
  if (typeof name !== "string" || !name.trim() || name.trim().length > 100) {
    return Response.json({ error: "INVALID_OWNER_NAME" }, { status: 400 });
  }

  try {
    const service = new AuthService();
    const user = await service.updateOwnerName(authenticatedUser.id, name);
    return Response.json({ user });
  } catch (error) {
    if (error instanceof Error && error.message === "USER_NOT_FOUND") {
      return Response.json({ error: "USER_NOT_FOUND" }, { status: 404 });
    }

    console.error("Owner account name update error:", error);
    return Response.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
  }
}
