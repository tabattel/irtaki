"use client";

import { useParams, useSearchParams } from "next/navigation";

import { MushafPage } from "@/components/quran/mushaf/mushaf-page";

export default function MushafPageRoute() {
  const params = useParams<{ page: string }>();
  const searchParams = useSearchParams();

  const pageNumber = Number(params.page);
  const ayahParam = searchParams.get("ayah");
  const selectedAyahId = ayahParam ? Number(ayahParam) : undefined;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">المصحف</h1>
      </header>

      <MushafPage
        mushafId={2}
        pageNumber={pageNumber}
        selectedAyahId={
          Number.isInteger(selectedAyahId) ? selectedAyahId : undefined
        }
      />
    </div>
  );
}
