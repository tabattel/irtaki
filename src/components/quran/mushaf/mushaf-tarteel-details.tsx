"use client";

import { MushafTarteelRecordingsTable } from "./mushaf-tarteel-recordings-table";

type Props = {
  mode: "tarteel1" | "tarteel2";
  mushafId: number;
  riwayaId: number;
  readPreference: (key: string) => string | null;
  writePreference: (key: string, value: string) => void;
};

export function MushafTarteelDetails({
  mode,
  mushafId,
  riwayaId,
}: Props) {
  return (
    <section
      data-mode-settings
      dir="rtl"
      aria-label="تفاصيل الترتيل"
      className="flex w-full min-w-0 flex-col gap-2 border-t border-[var(--border)] pt-2"
    >
      <h3 className="text-center text-sm font-semibold">
        تسجيلات هذا الوضع والمصحف
      </h3>
      <MushafTarteelRecordingsTable
        mode={mode}
        riwayaId={riwayaId}
        mushafId={mushafId}
      />
    </section>
  );
}
