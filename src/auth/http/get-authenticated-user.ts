import { AuthService } from "@/auth/service/auth-service";
import { SessionService } from "@/auth/session/session-service";

export async function getAuthenticatedUserFromRequest(request: Request) {
  const sessionToken = request.headers
    .get("cookie")
    ?.match(/(?:^|;\s*)irtaki_session=([^;]+)/)?.[1];

  if (!sessionToken) {
    return null;
  }

  const sessionService = new SessionService();
  const session = await sessionService.getSession(sessionToken);

  if (!session) {
    return null;
  }

  const authService = new AuthService();
  return authService.getAuthenticatedUser(session.userId);
}
