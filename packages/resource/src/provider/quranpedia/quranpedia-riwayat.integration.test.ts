import { describe, expect, it } from "vitest";
import { createJsonGzipReader } from "../../reader/json-gzip-reader";
import {
  createQuranpediaRiwayaCatalog,
} from "./quranpedia-riwayat";
import { createQuranpediaMushafsIndexLoader } from "./quranpedia-mushafs-index";

const ROOT_PATH =
  "/home/zaki/irtaki/storage/quranpedia/2026-09-11/raw";

describe("Quranpedia real riwayat catalog", () => {
  it("exposes exactly the 20 canonical riwayat", async () => {
    const reader = createJsonGzipReader();
    const indexLoader = createQuranpediaMushafsIndexLoader(reader);

    const index = await indexLoader.read(
      `${ROOT_PATH}/mushafs-index.json.gz`,
    );

    const riwayat = createQuranpediaRiwayaCatalog(index.data).list();

    expect(riwayat).toHaveLength(20);

    expect(
      riwayat.map((item) => `${item.qiraaName}:${item.riwayaName}`),
    ).toEqual([
      "نافع:قالون",
      "نافع:ورش",
      "ابن كثير:البزي",
      "ابن كثير:قنبل",
      "أبو عمرو:الدوري",
      "أبو عمرو:السوسي",
      "ابن عامر:هشام",
      "ابن عامر:ابن ذكوان",
      "عاصم:شعبة",
      "عاصم:حفص",
      "حمزة:خلف",
      "حمزة:خلاد",
      "الكسائي:أبو الحارث",
      "الكسائي:الدوري",
      "أبو جعفر:ابن وردان",
      "أبو جعفر:ابن جماز",
      "يعقوب:رويس",
      "يعقوب:روح",
      "خلف:إسحاق",
      "خلف:إدريس",
    ]);
  });

  it("marks exactly the 8 selected Quranpedia riwayat as available", async () => {
    const reader = createJsonGzipReader();
    const indexLoader = createQuranpediaMushafsIndexLoader(reader);

    const index = await indexLoader.read(
      `${ROOT_PATH}/mushafs-index.json.gz`,
    );

    const riwayat = createQuranpediaRiwayaCatalog(index.data).list();

    const available = riwayat.filter(
      (item) => item.available,
    );

    expect(available).toHaveLength(8);

    expect(
      available.map((item) => ({
        id: item.id,
        qiraaName: item.qiraaName,
        riwayaName: item.riwayaName,
        mushafId: item.mushafId,
      })),
    ).toEqual([
      {
        id: "nafi-qalun",
        qiraaName: "نافع",
        riwayaName: "قالون",
        mushafId: 7,
      },
      {
        id: "nafi-warsh",
        qiraaName: "نافع",
        riwayaName: "ورش",
        mushafId: 4,
      },
      {
        id: "ibn-kathir-bazzi",
        qiraaName: "ابن كثير",
        riwayaName: "البزي",
        mushafId: 5,
      },
      {
        id: "ibn-kathir-qunbul",
        qiraaName: "ابن كثير",
        riwayaName: "قنبل",
        mushafId: 8,
      },
      {
        id: "abu-amr-douri",
        qiraaName: "أبو عمرو",
        riwayaName: "الدوري",
        mushafId: 6,
      },
      {
        id: "abu-amr-susi",
        qiraaName: "أبو عمرو",
        riwayaName: "السوسي",
        mushafId: 10,
      },
      {
        id: "asim-shuba",
        qiraaName: "عاصم",
        riwayaName: "شعبة",
        mushafId: 9,
      },
      {
        id: "asim-hafs",
        qiraaName: "عاصم",
        riwayaName: "حفص",
        mushafId: 2,
      },
    ]);
  });

  it("keeps unavailable riwayat shaded without a mushaf", async () => {
    const reader = createJsonGzipReader();
    const indexLoader = createQuranpediaMushafsIndexLoader(reader);

    const index = await indexLoader.read(
      `${ROOT_PATH}/mushafs-index.json.gz`,
    );

    const riwayat = createQuranpediaRiwayaCatalog(index.data).list();

    const unavailable = riwayat.filter(
      (item) => !item.available,
    );

    expect(unavailable).toHaveLength(12);

    for (const item of unavailable) {
      expect(item.mushafId).toBeUndefined();
    }
  });

  it("uses mushaf 2 for Hafs and ignores the other Hafs variants", async () => {
    const reader = createJsonGzipReader();
    const indexLoader = createQuranpediaMushafsIndexLoader(reader);

    const index = await indexLoader.read(
      `${ROOT_PATH}/mushafs-index.json.gz`,
    );

    const riwayat = createQuranpediaRiwayaCatalog(index.data).list();

    const hafs = riwayat.find(
      (item) => item.id === "asim-hafs",
    );

    expect(hafs).toEqual({
      id: "asim-hafs",
      qiraaId: 5,
      qiraaName: "عاصم",
      riwayaName: "حفص",
      mushafId: 2,
      available: true,
    });
  });

  it("uses mushaf 7 for Qalun and ignores mushaf 12", async () => {
    const reader = createJsonGzipReader();
    const indexLoader = createQuranpediaMushafsIndexLoader(reader);

    const index = await indexLoader.read(
      `${ROOT_PATH}/mushafs-index.json.gz`,
    );

    const riwayat = createQuranpediaRiwayaCatalog(index.data).list();

    const qalun = riwayat.find(
      (item) => item.id === "nafi-qalun",
    );

    expect(qalun).toEqual({
      id: "nafi-qalun",
      qiraaId: 1,
      qiraaName: "نافع",
      riwayaName: "قالون",
      mushafId: 7,
      available: true,
    });
  });
});
