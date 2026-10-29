import { describe, expect, it, vi } from "vitest";

import {
  recordActivityAyahTraces,
  type RecordActivityAyahTracesDependencies,
  type RecordActivityAyahTracesInput,
} from "./record-activity-ayah-traces";

const input: RecordActivityAyahTracesInput = {
  learnerId: "learner-1",
  activityId: "activity-1",
  ayahIds: [10, 11],
};

function createDependencies(): RecordActivityAyahTracesDependencies {
  return {
    learnerRepository: {
      findById: vi.fn().mockResolvedValue({ id: "learner-1" }),
    },
    activityRepository: {
      findById: vi.fn().mockResolvedValue({ id: "activity-1" }),
    },
    activityAyahTraceRepository: {
      findUnknownAyahIds: vi.fn().mockResolvedValue([]),
      createForActivity: vi.fn().mockResolvedValue(2),
    },
  };
}

describe("recordActivityAyahTraces", () => {
  it("enregistre uniquement les ayahs validées d'une activité existante", async () => {
    const dependencies = createDependencies();

    const result = await recordActivityAyahTraces(
      "user-1",
      input,
      dependencies,
    );

    expect(dependencies.learnerRepository.findById).toHaveBeenCalledWith(
      "learner-1",
      "user-1",
    );
    expect(dependencies.activityRepository.findById).toHaveBeenCalledWith(
      "activity-1",
      "learner-1",
    );
    expect(
      dependencies.activityAyahTraceRepository.createForActivity,
    ).toHaveBeenCalledWith({
      activityId: "activity-1",
      ayahIds: [10, 11],
      status: "started",
      recordedAt: null,
    });
    expect(result.createdCount).toBe(2);
    expect(result.status).toBe("started");
  });

  it("transmet les métadonnées des lignes de la page", async () => {
    const dependencies = createDependencies();

    const pageInput: RecordActivityAyahTracesInput = {
      ...input,
      lineNumbersByAyah: {
        "10": [1, 2],
        "11": [3],
      },
      pageLineCount: 15,
      pageNumber: 42,
    };

    await recordActivityAyahTraces("user-1", pageInput, dependencies);

    expect(
      dependencies.activityAyahTraceRepository.createForActivity,
    ).toHaveBeenCalledWith({
      activityId: "activity-1",
      ayahIds: [10, 11],
      status: "started",
      recordedAt: null,
      lineNumbersByAyah: {
        "10": [1, 2],
        "11": [3],
      },
      pageLineCount: 15,
      pageNumber: 42,
    });
  });

  it("refuse des métadonnées de page incomplètes", async () => {
    const dependencies = createDependencies();

    await expect(
      recordActivityAyahTraces(
        "user-1",
        {
          ...input,
          lineNumbersByAyah: {
            "10": [1],
            "11": [2],
          },
          pageLineCount: 15,
        },
        dependencies,
      ),
    ).rejects.toThrow("Invalid page line metadata");

    expect(
      dependencies.activityAyahTraceRepository.createForActivity,
    ).not.toHaveBeenCalled();
  });

  it("refuse un apprenant qui n'appartient pas à l'utilisateur", async () => {
    const dependencies = createDependencies();
    vi.mocked(dependencies.learnerRepository.findById).mockResolvedValue(null);

    await expect(
      recordActivityAyahTraces("user-1", input, dependencies),
    ).rejects.toThrow("Learner not found");

    expect(dependencies.activityRepository.findById).not.toHaveBeenCalled();
  });

  it("refuse une activité qui n'appartient pas à l'apprenant", async () => {
    const dependencies = createDependencies();
    vi.mocked(dependencies.activityRepository.findById).mockResolvedValue(null);

    await expect(
      recordActivityAyahTraces("user-1", input, dependencies),
    ).rejects.toThrow("Activity not found");

    expect(
      dependencies.activityAyahTraceRepository.createForActivity,
    ).not.toHaveBeenCalled();
  });

  it("refuse les ayahs absentes du référentiel coranique", async () => {
    const dependencies = createDependencies();
    vi.mocked(
      dependencies.activityAyahTraceRepository.findUnknownAyahIds,
    ).mockResolvedValue([11]);

    await expect(
      recordActivityAyahTraces("user-1", input, dependencies),
    ).rejects.toThrow("Ayah not found: 11");

    expect(
      dependencies.activityAyahTraceRepository.createForActivity,
    ).not.toHaveBeenCalled();
  });

  it("refuse les identifiants dupliqués", async () => {
    const dependencies = createDependencies();

    await expect(
      recordActivityAyahTraces(
        "user-1",
        { ...input, ayahIds: [10, 10] },
        dependencies,
      ),
    ).rejects.toThrow("Duplicate ayah ids are not allowed");

    expect(dependencies.learnerRepository.findById).not.toHaveBeenCalled();
  });

  it("refuse une liste vide ou des identifiants invalides", async () => {
    const dependencies = createDependencies();

    await expect(
      recordActivityAyahTraces(
        "user-1",
        { ...input, ayahIds: [] },
        dependencies,
      ),
    ).rejects.toThrow("Ayah ids must contain valid positive integers");

    await expect(
      recordActivityAyahTraces(
        "user-1",
        { ...input, ayahIds: [0] },
        dependencies,
      ),
    ).rejects.toThrow("Ayah ids must contain valid positive integers");
  });
});
