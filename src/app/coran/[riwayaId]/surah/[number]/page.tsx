import Link from "next/link";

import { SurahReader } from "@/components/quran/surah-reader";

interface SurahPageProps {
  params: Promise<{
    riwayaId: string;
    number: string;
  }>;
}

export default async function SurahPage({ params }: SurahPageProps) {
  const { riwayaId: riwayaIdParam, number } = await params;

  const riwayaId = Number(riwayaIdParam);
  const surahNumber = Number(number);

  if (
    !Number.isInteger(riwayaId) ||
    riwayaId <= 0 ||
    !Number.isInteger(surahNumber) ||
    surahNumber <= 0
  ) {
    return (
      <main className="mx-auto min-h-screen max-w-4xl px-4 py-8" dir="rtl">
        <h1 className="text-2xl font-bold">بيانات غير صالحة</h1>

        <Link href="/coran" className="mt-4 inline-block underline">
          العودة إلى القرآن
        </Link>
      </main>
    );
  }

  /*
   * IRTAKI V1
   *
   * Riwaya 10 = حفص عن عاصم
   *
   * La route est désormais explicitement liée à une Riwaya :
   *
   * /coran/[riwayaId]/surah/[number]
   *
   * La logique détaillée de sélection de Mushaf/Riwaya
   * sera intégrée progressivement sans modifier le contenu
   * Quranpedia déjà utilisé par le lecteur.
   */

  if (riwayaId !== 10) {
    return (
      <main
        className="mx-auto min-h-screen max-w-4xl px-4 py-8"
        dir="rtl"
      >
        <h1 className="text-2xl font-bold">رواية غير متاحة</h1>

        <p className="mt-4 text-[var(--muted)]">
          الرواية المطلوبة غير متاحة حاليا.
        </p>

        <Link href="/coran" className="mt-6 inline-block underline">
          العودة إلى القرآن
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-4 py-8">
      <header className="mb-8">
        <Link href="/coran" className="text-sm text-gray-500 hover:underline">
          ← Retour au Coran
        </Link>

        <h1 className="mt-4 text-3xl font-bold">
          Sourate {surahNumber}
        </h1>

        <p className="mt-2 text-sm text-gray-500">
          رواية حفص عن عاصم
        </p>
      </header>

      <SurahReader surahNumber={surahNumber} />
    </main>
  );
}
