"use client";

import { useState } from "react";

const RECITERS = [
  { id: "hafs-afassi", name: "مشاري العفاسي" },
  { id: "hafs-abdelbasset", name: "عبد الباسط عبد الصمد" },
  { id: "hafs-soudais", name: "عبد الرحمن السديس" },
  { id: "hafs-houssari", name: "محمود خليل الحصري" },
  { id: "hafs-chatir", name: "أبو بكر الشاطري" },
  { id: "hafs-djebril", name: "محمد جبريل" },
];

export function MushafTarteelReferencePicker() {
  const [reciterId, setReciterId] = useState(RECITERS[0].id);
  const [comingSoon, setComingSoon] = useState(false);

  return (
    <div className="rounded-lg border p-3" dir="rtl">
      <label
        htmlFor="tarteel-reference-reciter"
        className="mb-2 block text-sm font-semibold"
      >
        القارئ المرجعي
      </label>
      <div className="flex flex-wrap gap-2">
        <select
          id="tarteel-reference-reciter"
          className="min-h-10 min-w-48 flex-1 rounded-lg border bg-[var(--background)] px-3"
          value={reciterId}
          onChange={(event) => {
            setReciterId(event.target.value);
            setComingSoon(false);
          }}
        >
          {RECITERS.map((reciter) => (
            <option key={reciter.id} value={reciter.id}>
              {reciter.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="min-h-10 rounded-lg border px-4 py-2 text-sm"
          onClick={() => setComingSoon(true)}
        >
          {comingSoon ? "قريبًا" : "مقارنة"}
        </button>
      </div>
      {comingSoon && (
        <p className="mt-2 text-xs text-[var(--muted-foreground)]" role="status">
          ستتوفر مقارنة التلاوة مع القارئ المرجعي قريبًا.
        </p>
      )}
    </div>
  );
}
