import { getAuthenticatedUserFromRequest } from "@/auth/http/get-authenticated-user";
import { createLearningEngine } from "@/application/learning/learning-engine";

export async function GET(request: Request) {
  const user = await getAuthenticatedUserFromRequest(request);

  if (!user) {
    return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const url = new URL(request.url);
  const learnerId = url.searchParams.get("learnerId");

  try {
    const engine = createLearningEngine();

    if (!learnerId) {
      const learners = await engine.getHistoryLearners(user.id);

      return Response.json({
        learners: learners.map((learner) => ({
          id: learner.id,
          name: learner.name,
          childProfileId: learner.childProfileId,
        })),
      });
    }

    // Conserver la compatibilité avec la vue historique par sourate existante.
    const rawSurahNumber = url.searchParams.get("surahNumber");

    if (rawSurahNumber !== null) {
      const surahNumber = Number(rawSurahNumber);

      if (
        !Number.isInteger(surahNumber) ||
        surahNumber < 1 ||
        surahNumber > 114
      ) {
        return Response.json(
          { error: "INVALID_SURAH_NUMBER" },
          { status: 400 },
        );
      }

      return Response.json(
        await engine.getSurahHistory(user.id, learnerId, surahNumber),
      );
    }

    return Response.json(await engine.getActivityHistory(user.id, learnerId));
  } catch (error) {
    if (error instanceof Error && error.message === "Learner not found") {
      return Response.json({ error: "LEARNER_NOT_FOUND" }, { status: 404 });
    }

    throw error;
  }
}
