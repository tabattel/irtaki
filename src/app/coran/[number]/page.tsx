import Link from "next/link";

import { SurahReader } from "@/components/quran/surah-reader";

interface SurahPageProps {
  params: Promise<{
    number: string;
  }>;
}

export default async function SurahPage({ params }: SurahPageProps) {
  const { number } = await params;
  const surahNumber = Number(number);

  if (!Number.isInteger(surahNumber) || surahNumber <= 0) {
    return (
      <main className="mx-auto min-h-screen max-w-4xl px-4 py-8">
        <h1 className="text-2xl font-bold">Sourate invalide</h1>

        <Link href="/coran" className="mt-4 inline-block underline">
          Retour aux sourates
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-4 py-8">
      <header className="mb-8">
        <Link href="/coran" className="text-sm text-gray-500 hover:underline">
          ← Retour aux sourates
        </Link>

        <h1 className="mt-4 text-3xl font-bold">Sourate {surahNumber}</h1>
      </header>

      <SurahReader surahNumber={surahNumber} />
    </main>
  );
}
