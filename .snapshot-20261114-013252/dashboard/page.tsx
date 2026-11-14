"use client";

import { useEffect, useState } from "react";
import { getRole, type UserRole } from "@/lib/roles";

type LearnerOption = {
  id: string;
  name: string | null;
  childProfileId: string | null;
};

export default function DashboardPage() {
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
        }
        setRoles(map);
      })
      .catch(() => setLearners([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6" dir="rtl">
      <header>
        <h1 className="text-2xl font-bold text-[var(--jannah-green)]">
          لوحة التحكم
        </h1>
        <p className="text-sm text-[var(--muted)]">
          إدارة المستخدمين والصلاحيات (نسخة تجريبية — الحفظ محلي فقط).
        </p>
      </header>

      <section className="space-y-3 rounded-xl border border-[var(--jannah-gold)]/40 bg-[var(--jannah-cream)]/40 p-4">
        <h2 className="font-bold text-[var(--jannah-green)]">
          المستخدمون والأدوار
        </h2>
        {loading ? (
          <p className="text-sm text-[var(--muted)]">جارٍ التحميل…</p>
        ) : learners.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">لا يوجد مستخدمون.</p>
        ) : (
          <ul className="space-y-2">
            {learners.map((l) => {
              const role = roles[l.id] ?? "child";
              const isOwnerRow = l.childProfileId === null;
              return (
                <li
                  key={l.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--jannah-gold)]/30 bg-white/60 px-3 py-2"
                >
                  <span className="font-medium">{l.name ?? "—"}</span>
                  <span
                    className={
                      isOwnerRow
                        ? "rounded-full bg-[var(--jannah-green)] px-2 py-0.5 text-xs text-white"
                        : "rounded-full bg-[var(--jannah-gold)]/30 px-2 py-0.5 text-xs text-[var(--jannah-green)]"
                    }
                  >
                    {role === "owner" ? "مالك" : "طفل"}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="space-y-3 rounded-xl border border-[var(--jannah-gold)]/40 p-4">
        <h2 className="font-bold text-[var(--jannah-green)]">الصلاحيات</h2>
        <ul className="list-inside list-disc space-y-1 text-sm">
          <li>المالك: كل الصفحات + لوحة التحكم</li>
          <li>
            الطفل: الرئيسية · البحث · الأهداف · الإحصائيات · الإنجاز · التمارين ·
            البيانات · التحميل · الإعدادات
          </li>
        </ul>
      </section>
    </div>
  );
}
