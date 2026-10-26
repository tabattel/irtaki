"use client";

import Link from "next/link";

import { useParams, useSearchParams } from "next/navigation";

import { MushafPage } from "@/components/quran/mushaf/mushaf-page";

export default function MushafPageRoute() {
  const params = useParams<{
    riwayaId: string;
    page: string;
  }>();

  const searchParams = useSearchParams();

  const riwayaId = Number(params.riwayaId);
  const pageNumber = Number(params.page);

  const ayahParam = searchParams.get("ayah");
  const selectedAyahId = ayahParam ? Number(ayahParam) : undefined;

  /*
   * IRTAKI V1
   *
   * Riwaya 10 = حفص عن عاصم
   *
   * Le Mushaf actuellement affiché correspond au
   * layout Quranpedia déjà intégré dans IRTAKI.
   *
   * L'identifiant Quranpedia du Mushaf reste interne
   * au backend/layout et n'est PAS exposé dans l'URL.
   */
  if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > 604) {
    return (
      <div
        className="mx-auto max-w-3xl rounded-xl border border-[var(--border)] p-8 text-center"
        dir="rtl"
      >
        <h1 className="mb-3 text-xl font-bold">رقم الصفحة غير صالح</h1>
        <p className="mb-4 text-[var(--muted)]">
          رقم الصفحة يجب أن يكون بين 1 و604.
        </p>
        <Link href="/coran/10/page/1" className="underline">
          العودة إلى الصفحة الأولى
        </Link>
      </div>
    );
  }

  if (riwayaId !== 10) {
    return (
      <div
        className="mx-auto max-w-3xl rounded-xl border border-[var(--border)] p-8 text-center"
        dir="rtl"
      >
        <h1 className="mb-3 text-xl font-bold">رواية غير متاحة</h1>

        <p className="text-[var(--muted)]">الرواية المطلوبة غير متاحة حاليا.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">المصحف — حفص عن عاصم</h1>
      </header>

      <MushafPage
        mushafId={2}
        riwayaId={riwayaId}
        pageNumber={pageNumber}
        selectedAyahId={
          Number.isInteger(selectedAyahId) ? selectedAyahId : undefined
        }
      />
    </div>
  );
}
