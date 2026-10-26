import Link from "next/link";

import { MushafPage } from "@/components/quran/mushaf/mushaf-page";

interface RiwayaPageProps {
  params: Promise<{
    riwayaId: string;
  }>;
}

export default async function RiwayaPage({ params }: RiwayaPageProps) {
  const { riwayaId: riwayaIdParam } = await params;
  const riwayaId = Number(riwayaIdParam);

  if (riwayaId !== 10) {
    return (
      <main dir="rtl" className="mx-auto min-h-screen max-w-4xl px-4 py-8">
        <h1 className="text-2xl font-bold">رواية غير متاحة</h1>

        <p className="mt-3 text-gray-600">الرواية المطلوبة غير متاحة حاليا.</p>

        <Link href="/coran" className="mt-6 inline-block underline">
          العودة إلى القراءات والروايات
        </Link>
      </main>
    );
  }

  return (
    <main
      dir="rtl"
      className="mx-auto min-h-screen max-w-5xl px-4 py-6 sm:px-6"
    >
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-emerald-700">
            رواية حفص عن عاصم
          </p>

          <h1 className="mt-2 text-2xl font-bold">المصحف الشريف</h1>

          <p className="mt-2 text-sm text-gray-500">الصفحة الأولى</p>
        </div>

        <Link
          href="/coran"
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium transition hover:bg-gray-50"
        >
          العودة إلى القراءات
        </Link>
      </header>

      <MushafPage mushafId={2} riwayaId={10} pageNumber={1} />
    </main>
  );
}
