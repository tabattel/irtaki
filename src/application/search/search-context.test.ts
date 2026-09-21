import { describe, expect, it } from "vitest";
import { buildSearchContext } from "./search-context";

describe("search context", () => {
  it("returns three words before and after", () => {
    const text = "واحد اثنان ثلاثة أربعة خمسة ستة سبعة ثمانية تسعة";

    const occurrence = {
      start: text.indexOf("خمسة"),
      end: text.indexOf("خمسة") + "خمسة".length,
    };

    expect(buildSearchContext(text, occurrence)).toEqual({
      before: "اثنان ثلاثة أربعة",
      match: "خمسة",
      after: "ستة سبعة ثمانية",
      context: "اثنان ثلاثة أربعة خمسة ستة سبعة ثمانية",
    });
  });

  it("works at the beginning", () => {
    const text = "خمسة ستة سبعة ثمانية";

    const occurrence = {
      start: 0,
      end: "خمسة".length,
    };

    expect(buildSearchContext(text, occurrence)).toEqual({
      before: "",
      match: "خمسة",
      after: "ستة سبعة ثمانية",
      context: "خمسة ستة سبعة ثمانية",
    });
  });

  it("works at the end", () => {
    const text = "واحد اثنان ثلاثة أربعة";

    const occurrence = {
      start: text.indexOf("أربعة"),
      end: text.length,
    };

    expect(buildSearchContext(text, occurrence)).toEqual({
      before: "واحد اثنان ثلاثة",
      match: "أربعة",
      after: "",
      context: "واحد اثنان ثلاثة أربعة",
    });
  });
});
