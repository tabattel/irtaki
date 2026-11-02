import { getAuthenticatedUserFromRequest } from "@/auth/http/get-authenticated-user";
import {
  LearnerRepository,
  StatisticsRepository,
} from "@irtaki/persistence";

import { createStatisticsService } from "@/application/statistics/statistics-service";
import type { StatisticsGroupBy } from "@/application/statistics/statistics-types";

const GROUP_BY_VALUES = new Set<StatisticsGroupBy>([
  "day",
  "week",
  "month",
]);

function errorResponse(error: unknown): Response {
  const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";

  if (message === "Learner not found") {
    return Response.json({ error: "LEARNER_NOT_FOUND" }, { status: 404 });
  }

  if (
    message.startsWith("Invalid statistics") ||
    message.startsWith("Statistics start date") ||
    message.startsWith("Statistics date range")
  ) {
    return Response.json({ error: message }, { status: 400 });
  }

  console.error("Learning statistics API error:", error);
  return Response.json(
    { error: "INTERNAL_SERVER_ERROR" },
    { status: 500 },
  );
}

export async function GET(request: Request) {
  const user = await getAuthenticatedUserFromRequest(request);

  if (!user) {
    return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const url = new URL(request.url);
  const learnerId = url.searchParams.get("learnerId");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const timeZone = url.searchParams.get("timeZone");
  const requestedGroupBy = url.searchParams.get("groupBy") ?? "day";

  if (
    !learnerId ||
    learnerId.trim().length === 0 ||
    learnerId.length > 128
  ) {
    return Response.json({ error: "INVALID_LEARNER_ID" }, { status: 400 });
  }

  if (
    (from !== null && from.length > 10) ||
    (to !== null && to.length > 10) ||
    (timeZone !== null &&
      (timeZone.trim().length === 0 || timeZone.length > 100))
  ) {
    return Response.json(
      { error: "INVALID_STATISTICS_PARAMETERS" },
      { status: 400 },
    );
  }

  if (!GROUP_BY_VALUES.has(requestedGroupBy as StatisticsGroupBy)) {
    return Response.json(
      { error: "INVALID_STATISTICS_GROUP_BY" },
      { status: 400 },
    );
  }

  try {
    const service = createStatisticsService({
      learnerRepository: new LearnerRepository(),
      statisticsRepository: new StatisticsRepository(),
    });

    const result = await service.getStatistics(user.id, learnerId, {
      from,
      to,
      timeZone,
      groupBy: requestedGroupBy as StatisticsGroupBy,
    });

    return Response.json(result, {
      headers: {
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
