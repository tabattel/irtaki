import { SurahList } from "@/components/quran/surah-list";

export default function QuranPage() {
  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-8">
      <header className="mb-8">
        <p className="text-sm font-medium text-gray-500">IRTAKI</p>

        <h1 className="mt-2 text-3xl font-bold">القرآن الكريم</h1>

        <p className="mt-2 text-gray-600">Lecteur du Coran</p>
      </header>

      <section>
        <h2 className="mb-4 text-xl font-semibold">Sourates</h2>

        <SurahList />
      </section>
    </main>
  );
}
