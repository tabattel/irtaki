import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "../client/prisma";
import {
  AyahRepository,
  MushafRepository,
  QiraaRepository,
  RiwayaRepository,
  SurahRepository,
  TariqRepository,
} from "../index";

describe("persistence repositories", () => {
  const qiraaRepository = new QiraaRepository();
  const riwayaRepository = new RiwayaRepository();
  const mushafRepository = new MushafRepository();
  const surahRepository = new SurahRepository();
  const ayahRepository = new AyahRepository();
  const tariqRepository = new TariqRepository();

  it("connects to PostgreSQL through Prisma", async () => {
    const result = await prisma.$queryRaw<
      Array<{ database: string; user: string }>
    >`SELECT current_database() AS database, current_user AS user`;

    expect(result).toEqual([{ database: "irtaki", user: "irtaki" }]);
  });

  it("returns empty collections on the fresh database", async () => {
    await expect(qiraaRepository.findAll()).resolves.toEqual([]);
    await expect(riwayaRepository.findAll()).resolves.toEqual([]);
    await expect(mushafRepository.findAll()).resolves.toEqual([]);
    await expect(surahRepository.findAll()).resolves.toEqual([]);
    await expect(tariqRepository.findAll()).resolves.toEqual([]);
  });

  it("returns null for unknown identifiers", async () => {
    await expect(qiraaRepository.findById(999999)).resolves.toBeNull();
    await expect(riwayaRepository.findById(999999)).resolves.toBeNull();
    await expect(mushafRepository.findById(999999)).resolves.toBeNull();
    await expect(surahRepository.findById(999999)).resolves.toBeNull();
    await expect(ayahRepository.findById(999999)).resolves.toBeNull();
    await expect(tariqRepository.findById(999999)).resolves.toBeNull();
  });

  it("returns empty filtered collections", async () => {
    await expect(riwayaRepository.findByQiraaId(999999)).resolves.toEqual([]);
    await expect(mushafRepository.findByRiwayaId(999999)).resolves.toEqual([]);
    await expect(ayahRepository.findBySurahNumber(999999)).resolves.toEqual([]);
    await expect(ayahRepository.findByPageNumber(999999)).resolves.toEqual([]);
    await expect(tariqRepository.findByRiwayaId(999999)).resolves.toEqual([]);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });
});
