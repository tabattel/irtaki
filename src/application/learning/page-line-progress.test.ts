import { describe, expect, it } from "vitest";
import {
  calculatePageFraction,
  calculateRecordedPagePercentage,
} from "./page-line-progress";

describe("calculatePageFraction", () => {
  it("calcule une fraction sans compter deux fois une ligne", () => {
    expect(
      calculatePageFraction(
        { "1": [1, 2], "2": [2, 3] },
        10,
      ),
    ).toBe(0.3);
  });

  it("refuse un dénominateur invalide ou aucune ligne", () => {
    expect(calculatePageFraction({ "1": [1] }, 0)).toBeNull();
    expect(calculatePageFraction({ "1": [] }, 10)).toBeNull();
  });

  it("ne dépasse pas une page complète", () => {
    expect(
      calculatePageFraction({ "1": [1, 2, 3, 4] }, 2),
    ).toBe(1);
  });
});

describe("calculateRecordedPagePercentage", () => {
  it("réunit les lignes distinctes des activités terminées et partielles", () => {
    expect(
      calculateRecordedPagePercentage([
        { status: "completed", lineNumbers: [1, 2], pageLineCount: 4 },
        { status: "partial", lineNumbers: [2, 3], pageLineCount: 4 },
        { status: "failed", lineNumbers: [4], pageLineCount: 4 },
      ]),
    ).toBe(75);
  });

  it("renvoie null si aucune couverture fiable n'est disponible", () => {
    expect(
      calculateRecordedPagePercentage([
        { status: "completed", lineNumbers: [], pageLineCount: 4 },
      ]),
    ).toBeNull();

    expect(
      calculateRecordedPagePercentage([
        { status: "completed" },
      ]),
    ).toBeNull();
  });

  it("plafonne le pourcentage à 100", () => {
    expect(
      calculateRecordedPagePercentage([
        { status: "completed", lineNumbers: [1, 2, 3, 4, 5], pageLineCount: 4 },
      ]),
    ).toBe(100);
  });
});
