import type { QuranpediaMushafIndexRecord } from "./quranpedia-mushafs-index";

export interface QuranpediaRiwaya {
  readonly id: string;
  readonly qiraaId: number;
  readonly qiraaName: string;
  readonly riwayaName: string;
  readonly mushafId?: number;
  readonly available: boolean;
}

export interface QuranpediaRiwayaCatalog {
  readonly list: () => readonly QuranpediaRiwaya[];
}

interface RiwayaDefinition {
  readonly id: string;
  readonly qiraaId: number;
  readonly qiraaName: string;
  readonly riwayaName: string;
}

const RIWAYA_DEFINITIONS: readonly RiwayaDefinition[] = [
  { id: "nafi-qalun", qiraaId: 1, qiraaName: "نافع", riwayaName: "قالون" },
  { id: "nafi-warsh", qiraaId: 1, qiraaName: "نافع", riwayaName: "ورش" },

  {
    id: "ibn-kathir-bazzi",
    qiraaId: 2,
    qiraaName: "ابن كثير",
    riwayaName: "البزي",
  },
  {
    id: "ibn-kathir-qunbul",
    qiraaId: 2,
    qiraaName: "ابن كثير",
    riwayaName: "قنبل",
  },

  {
    id: "abu-amr-douri",
    qiraaId: 3,
    qiraaName: "أبو عمرو",
    riwayaName: "الدوري",
  },
  {
    id: "abu-amr-susi",
    qiraaId: 3,
    qiraaName: "أبو عمرو",
    riwayaName: "السوسي",
  },

  {
    id: "ibn-amir-hisham",
    qiraaId: 4,
    qiraaName: "ابن عامر",
    riwayaName: "هشام",
  },
  {
    id: "ibn-amir-ibn-dhakwan",
    qiraaId: 4,
    qiraaName: "ابن عامر",
    riwayaName: "ابن ذكوان",
  },

  { id: "asim-shuba", qiraaId: 5, qiraaName: "عاصم", riwayaName: "شعبة" },
  { id: "asim-hafs", qiraaId: 5, qiraaName: "عاصم", riwayaName: "حفص" },

  { id: "hamza-khalaf", qiraaId: 6, qiraaName: "حمزة", riwayaName: "خلف" },
  { id: "hamza-khallad", qiraaId: 6, qiraaName: "حمزة", riwayaName: "خلاد" },

  {
    id: "kisai-abu-al-harith",
    qiraaId: 7,
    qiraaName: "الكسائي",
    riwayaName: "أبو الحارث",
  },
  {
    id: "kisai-douri",
    qiraaId: 7,
    qiraaName: "الكسائي",
    riwayaName: "الدوري",
  },

  {
    id: "abu-jafar-ibn-wardan",
    qiraaId: 8,
    qiraaName: "أبو جعفر",
    riwayaName: "ابن وردان",
  },
  {
    id: "abu-jafar-ibn-jamaz",
    qiraaId: 8,
    qiraaName: "أبو جعفر",
    riwayaName: "ابن جماز",
  },

  {
    id: "yaqub-ruways",
    qiraaId: 9,
    qiraaName: "يعقوب",
    riwayaName: "رويس",
  },
  {
    id: "yaqub-rawh",
    qiraaId: 9,
    qiraaName: "يعقوب",
    riwayaName: "روح",
  },

  {
    id: "khalaf-ishaq",
    qiraaId: 10,
    qiraaName: "خلف",
    riwayaName: "إسحاق",
  },
  {
    id: "khalaf-idris",
    qiraaId: 10,
    qiraaName: "خلف",
    riwayaName: "إدريس",
  },
];

const SELECTED_MUSHAF_BY_RIWAYA: Readonly<Record<string, number>> = {
  "nafi-qalun": 7,
  "nafi-warsh": 4,
  "ibn-kathir-bazzi": 5,
  "ibn-kathir-qunbul": 8,
  "abu-amr-douri": 6,
  "abu-amr-susi": 10,
  "asim-shuba": 9,
  "asim-hafs": 2,
};

export function createQuranpediaRiwayaCatalog(
  mushafs: readonly QuranpediaMushafIndexRecord[],
): QuranpediaRiwayaCatalog {
  const availableMushafIds = new Set(mushafs.map((mushaf) => mushaf.id));

  const riwayat = RIWAYA_DEFINITIONS.map((definition) => {
    const mushafId = SELECTED_MUSHAF_BY_RIWAYA[definition.id];

    return {
      ...definition,
      mushafId,
      available:
        mushafId !== undefined && availableMushafIds.has(mushafId),
    };
  });

  return {
    list() {
      return riwayat;
    },
  };
}

export const QURANPEDIA_RIWAYAT: readonly QuranpediaRiwaya[] =
  RIWAYA_DEFINITIONS.map((definition) => {
    const mushafId = SELECTED_MUSHAF_BY_RIWAYA[definition.id];

    return {
      ...definition,
      mushafId,
      available: mushafId !== undefined,
    };
  });
