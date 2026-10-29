import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";

const mocks = vi.hoisted(() => ({
  getAuthenticatedUserFromRequest: vi.fn(),
  createLearningEngine: vi.fn(),
}));

vi.mock("@/auth/http/get-authenticated-user", () => ({
  getAuthenticatedUserFromRequest: mocks.getAuthenticatedUserFromRequest,
}));

vi.mock("@/application/learning/learning-engine", () => ({
  createLearningEngine: mocks.createLearningEngine,
}));

function request(url: string, init?: RequestInit) {
  return new Request(url, init);
}

describe("GET /api/learning/goals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("refuse un utilisateur non authentifié", async () => {
    mocks.getAuthenticatedUserFromRequest.mockResolvedValue(null);

    const response = await GET(
      request("http://localhost/api/learning/goals?learnerId=learner-1"),
    );

    expect(response.status).toBe(401);
    expect(mocks.createLearningEngine).not.toHaveBeenCalled();
  });

  it("refuse un profil qui n'appartient pas au compte", async () => {
    mocks.getAuthenticatedUserFromRequest.mockResolvedValue({ id: "user-1" });

    const engine = {
      listGoals: vi.fn().mockRejectedValue(new Error("Learner not found")),
      getProgress: vi.fn(),
      createGoal: vi.fn(),
    };
    mocks.createLearningEngine.mockReturnValue(engine);

    const response = await GET(
      request("http://localhost/api/learning/goals?learnerId=other-learner"),
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "LEARNER_NOT_FOUND" });
    expect(engine.getProgress).not.toHaveBeenCalled();
  });

  it("renvoie les objectifs et leur progression calculée", async () => {
    mocks.getAuthenticatedUserFromRequest.mockResolvedValue({ id: "user-1" });

    const goal = { id: "goal-1", title: "Lire régulièrement" };
    const engine = {
      listGoals: vi.fn().mockResolvedValue([goal]),
      getProgress: vi.fn().mockResolvedValue({ progressPercent: 25 }),
      createGoal: vi.fn(),
    };
    mocks.createLearningEngine.mockReturnValue(engine);

    const response = await GET(
      request("http://localhost/api/learning/goals?learnerId=learner-1"),
    );
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(engine.listGoals).toHaveBeenCalledWith("user-1", "learner-1");
    expect(result.goals[0].progress.progressPercent).toBe(25);
  });
});

describe("POST /api/learning/goals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("refuse un utilisateur non authentifié", async () => {
    mocks.getAuthenticatedUserFromRequest.mockResolvedValue(null);

    const response = await POST(
      request("http://localhost/api/learning/goals", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      }),
    );

    expect(response.status).toBe(401);
    expect(mocks.createLearningEngine).not.toHaveBeenCalled();
  });

  it("rejette une demande invalide", async () => {
    mocks.getAuthenticatedUserFromRequest.mockResolvedValue({ id: "user-1" });

    const response = await POST(
      request("http://localhost/api/learning/goals", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ learnerId: "learner-1", title: "" }),
      }),
    );

    expect(response.status).toBe(400);
    expect(mocks.createLearningEngine).not.toHaveBeenCalled();
  });

  it("crée un objectif et renvoie sa progression", async () => {
    mocks.getAuthenticatedUserFromRequest.mockResolvedValue({ id: "user-1" });

    const goal = { id: "goal-2", title: "Lire régulièrement" };
    const engine = {
      listGoals: vi.fn(),
      getProgress: vi.fn().mockResolvedValue({ progressPercent: 0 }),
      createGoal: vi.fn().mockResolvedValue(goal),
    };
    mocks.createLearningEngine.mockReturnValue(engine);

    const response = await POST(
      request("http://localhost/api/learning/goals", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          learnerId: "learner-1",
          title: "Lire régulièrement",
          action: "read",
          quantity: 2,
          unit: "page",
          frequencyCount: 1,
          frequencyPeriod: "day",
          startDate: "2026-10-29",
        }),
      }),
    );

    const result = await response.json();

    expect(response.status).toBe(201);
    expect(engine.createGoal).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({ learnerId: "learner-1", quantity: 2 }),
    );
    expect(result.goal.id).toBe("goal-2");
    expect(result.progress.progressPercent).toBe(0);
  });

  it("renvoie 404 si le profil demandé n'appartient pas au compte", async () => {
    mocks.getAuthenticatedUserFromRequest.mockResolvedValue({ id: "user-1" });

    const engine = {
      listGoals: vi.fn(),
      getProgress: vi.fn(),
      createGoal: vi.fn().mockRejectedValue(new Error("Learner not found")),
    };
    mocks.createLearningEngine.mockReturnValue(engine);

    const response = await POST(
      request("http://localhost/api/learning/goals", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          learnerId: "other-learner",
          title: "Lire régulièrement",
          action: "read",
          quantity: 2,
          unit: "page",
          frequencyCount: 1,
          frequencyPeriod: "day",
          startDate: "2026-10-29",
        }),
      }),
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "LEARNER_NOT_FOUND" });
  });
});
