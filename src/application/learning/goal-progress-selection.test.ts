import { describe, expect, it } from "vitest";
import { selectCompatibleProgressGoals } from "./goal-progress-selection";
import type { LearningGoal } from "./types";

const now = new Date("2026-10-29T20:00:00.000Z");

function makeGoal(overrides: Partial<LearningGoal> = {}): LearningGoal {
  return {
    id: "goal-ayah",
    title: "Objectif lecture",
    action: "read",
    quantity: 10,
    unit: "ayah",
    frequencyCount: 1,
    frequencyPeriod: "day",
    intervalDays: null,
    weekday: null,
    startDate: new Date("2026-01-01T00:00:00.000Z"),
    endDate: null,
    status: "active",
    ...overrides,
  };
}

describe("selectCompatibleProgressGoals", () => {
  it("retient les objectifs ayah et page lorsque la page est mesurable", () => {
    const goals = [
      makeGoal({ id: "read-ayah" }),
      makeGoal({
        id: "read-page",
        title: "Lire une page",
        unit: "page",
        quantity: 1,
      }),
    ];

    const result = selectCompatibleProgressGoals(
      goals,
      "qiraa",
      now,
      0.9,
    );

    expect(result.map((goal) => goal.id)).toEqual([
      "read-page",
      "read-ayah",
    ]);
  });

  it("conserve les objectifs ayah lorsque la page n'est pas mesurable", () => {
    const goals = [
      makeGoal({ id: "read-ayah" }),
      makeGoal({
        id: "read-page",
        unit: "page",
        quantity: 1,
      }),
    ];

    const result = selectCompatibleProgressGoals(
      goals,
      "qiraa",
      now,
      null,
    );

    expect(result.map((goal) => goal.id)).toEqual(["read-ayah"]);
  });

  it("priorise une action exacte sans éliminer les autres objectifs compatibles", () => {
    const goals = [
      makeGoal({
        id: "read-page",
        action: "read",
        unit: "page",
        quantity: 1,
      }),
      makeGoal({
        id: "qiraa-ayah",
        action: "qiraa",
        unit: "ayah",
        quantity: 20,
      }),
    ];

    const result = selectCompatibleProgressGoals(
      goals,
      "qiraa",
      now,
      0.5,
    );

    expect(result.map((goal) => goal.id)).toEqual([
      "qiraa-ayah",
      "read-page",
    ]);
  });

  it("ignore les objectifs futurs et les actions incompatibles", () => {
    const goals = [
      makeGoal({ id: "active-ayah" }),
      makeGoal({
        id: "future-ayah",
        startDate: new Date("2027-01-01T00:00:00.000Z"),
      }),
      makeGoal({
        id: "tathbit-page",
        action: "tathbit",
        unit: "page",
        quantity: 1,
      }),
    ];

    const result = selectCompatibleProgressGoals(
      goals,
      "qiraa",
      now,
      0.9,
    );

    expect(result.map((goal) => goal.id)).toEqual(["active-ayah"]);
  });
});
