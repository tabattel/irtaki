import type { WajhRepository } from "@irtaki/persistence";

export type LearningWajhSummary = {
  id: number;
  name: string;
  tariqId: number;
};

export function createLearningWajhRepository(repository: WajhRepository) {
  return {
    async findById(id: number): Promise<LearningWajhSummary | null> {
      const wajh = await repository.findById(id);
      if (wajh === null) return null;
      return { id: wajh.id, name: wajh.name, tariqId: wajh.tariqId };
    },

    async findByTariqId(tariqId: number): Promise<LearningWajhSummary[]> {
      const wujuh = await repository.findByTariqId(tariqId);
      return wujuh.map(
        (w: { id: number; name: string; tariqId: number }) => ({
          id: w.id,
          name: w.name,
          tariqId: w.tariqId,
        }),
      );
    },
  };
}
