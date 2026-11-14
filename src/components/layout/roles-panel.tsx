"use client";

import { useEffect, useState } from "react";
import { getRole, setRole, type UserRole } from "@/lib/roles";

type LearnerOption = {
  id: string;
  name: string | null;
  childProfileId: string | null;
};

export function RolesPanel() {
  const [learners, setLearners] = useState<LearnerOption[]>([]);
  const [roles, setRoles] = useState<Record<string, UserRole>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/history", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((payload) => {
        const list: LearnerOption[] = Array.isArray(payload?.learners)
          ? payload.learners
          : [];
        setLearners(list);
        const map: Record<string, UserRole> = {};
        for (const l of list) {
          map[l.id] = l.childProfileId === null ? "owner" : getRole(l.id);
          if (l.childProfileId === null) setRole(l.id, "owner");
        }
        setRoles(map);
      })
      .catch(() => setLearners([]))
      .finally(() => setLoading(false));
  }, []);

  function handleChange(learnerId: string, role: UserRole) {
    setRole(learnerId, role);
    setRoles((prev) => ({ ...prev, [learnerId]: role }));
  }

  if (loading || learners.length === 0) {
    return null;
  }

  return (
    <section
      className="min-w-0 space-y-2 border-t border-[var(--border)] pt-2"
      dir="rtl"
      aria-live="polite"
    >
      <h4 className="font-bold text-[var(--jannah-green)]">الأدوار والصلاحيات</h4>
      <ul className="space-y-2">
        {learners.map((l) => {
          const role =
            roles[l.id] ?? (l.childProfileId === null ? "owner" : "child");
          const locked = l.childProfileId === null;
          return (
            <li
              key={l.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--jannah-gold)]/30 bg-[var(--jannah-cream)]/30 p-2"
            >
              <span className="font-medium">{l.name ?? "—"}</span>
              <select
                value={role}
                disabled={locked}
                onChange={(e) => handleChange(l.id, e.target.value as UserRole)}
                className="rounded-lg border border-[var(--jannah-gold)]/40 bg-[var(--background)] px-2 py-1 text-sm disabled:opacity-60"
                aria-label={`دور ${l.name ?? ""}`}
              >
                <option value="owner">مالك</option>
                <option value="child">طفل</option>
              </select>
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-[var(--muted)]">
        الحفظ محلي فقط — المزامنة مع الخادم في إصدار لاحق.
      </p>
    </section>
  );
}
