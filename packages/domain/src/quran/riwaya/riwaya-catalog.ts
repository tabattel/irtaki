import { Riwaya } from "./riwaya";
import { Tariq } from "../tariq/tariq";

function createRiwaya(props: {
  id: number;
  shortName: string;
  fullName: string;
  qiraaId: number;
}): Riwaya {
  return new Riwaya({
    ...props,
    tariqs: [
      new Tariq({
        id: props.id * 10 + 1,
        name: `${props.shortName} 1`,
      }),
      new Tariq({
        id: props.id * 10 + 2,
        name: `${props.shortName} 2`,
      }),
    ],
  });
}

export const RIWAYAT: readonly Riwaya[] = [
  // نافع
  createRiwaya({
    id: 1,
    shortName: "قالون",
    fullName: "قالون عن نافع",
    qiraaId: 1,
  }),

  createRiwaya({
    id: 2,
    shortName: "ورش",
    fullName: "ورش عن نافع",
    qiraaId: 1,
  }),

  // ابن كثير
  createRiwaya({
    id: 3,
    shortName: "البزي",
    fullName: "البزي عن ابن كثير",
    qiraaId: 2,
  }),

  createRiwaya({
    id: 4,
    shortName: "قنبل",
    fullName: "قنبل عن ابن كثير",
    qiraaId: 2,
  }),

  // أبو عمرو
  createRiwaya({
    id: 5,
    shortName: "الدوري",
    fullName: "الدوري عن أبي عمرو",
    qiraaId: 3,
  }),

  createRiwaya({
    id: 6,
    shortName: "السوسي",
    fullName: "السوسي عن أبي عمرو",
    qiraaId: 3,
  }),

  // ابن عامر
  createRiwaya({
    id: 7,
    shortName: "هشام",
    fullName: "هشام عن ابن عامر",
    qiraaId: 4,
  }),

  createRiwaya({
    id: 8,
    shortName: "ابن ذكوان",
    fullName: "ابن ذكوان عن ابن عامر",
    qiraaId: 4,
  }),

  // عاصم
  createRiwaya({
    id: 9,
    shortName: "شعبة",
    fullName: "شعبة عن عاصم",
    qiraaId: 5,
  }),

  createRiwaya({
    id: 10,
    shortName: "حفص",
    fullName: "حفص عن عاصم",
    qiraaId: 5,
  }),

  // حمزة
  createRiwaya({
    id: 11,
    shortName: "خلف",
    fullName: "خلف عن حمزة",
    qiraaId: 6,
  }),

  createRiwaya({
    id: 12,
    shortName: "خلاد",
    fullName: "خلاد عن حمزة",
    qiraaId: 6,
  }),

  // الكسائي
  createRiwaya({
    id: 13,
    shortName: "أبو الحارث",
    fullName: "أبو الحارث عن الكسائي",
    qiraaId: 7,
  }),

  createRiwaya({
    id: 14,
    shortName: "الدوري",
    fullName: "الدوري عن الكسائي",
    qiraaId: 7,
  }),

  // أبو جعفر
  createRiwaya({
    id: 15,
    shortName: "ابن وردان",
    fullName: "ابن وردان عن أبي جعفر",
    qiraaId: 8,
  }),

  createRiwaya({
    id: 16,
    shortName: "ابن جماز",
    fullName: "ابن جماز عن أبي جعفر",
    qiraaId: 8,
  }),

  // يعقوب
  createRiwaya({
    id: 17,
    shortName: "رويس",
    fullName: "رويس عن يعقوب",
    qiraaId: 9,
  }),

  createRiwaya({
    id: 18,
    shortName: "روح",
    fullName: "روح عن يعقوب",
    qiraaId: 9,
  }),

  // خلف العاشر
  createRiwaya({
    id: 19,
    shortName: "إسحاق",
    fullName: "إسحاق الوراق عن خلف",
    qiraaId: 10,
  }),

  createRiwaya({
    id: 20,
    shortName: "إدريس",
    fullName: "إدريس الحداد عن خلف",
    qiraaId: 10,
  }),
];
