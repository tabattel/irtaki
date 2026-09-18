import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <section className="w-full max-w-2xl text-center">
        <p className="text-sm font-medium text-gray-500">IRTAKI</p>

        <h1 className="mt-3 text-4xl font-bold">القرآن الكريم</h1>

        <p className="mt-4 text-gray-600">
          Plateforme d&apos;étude et de lecture du Coran.
        </p>

        <Link
          href="/coran"
          className="mt-8 inline-flex rounded-xl border px-6 py-3 font-medium transition hover:shadow-md"
        >
          Ouvrir le Coran
        </Link>
      </section>
    </main>
  );
}
