"use client";

import { useEffect, useState } from "react";

type ChildProfile = {
  id: string;
  name: string;
};

type ProfilesPayload = {
  profiles?: ChildProfile[];
  error?: string;
};

type LearnerOption = {
  id: string;
  name: string | null;
  childProfileId: string | null;
};

const ACTIVE_LEARNER_KEY = "irtaki.activeLearnerId";
const ACTIVE_LEARNER_EVENT = "irtaki:active-learner-changed";

export function ChildAccountsPanel() {
  const [profiles, setProfiles] = useState<ChildProfile[]>([]);
  const [learners, setLearners] = useState<LearnerOption[]>([]);
  const [activeLearnerId, setActiveLearnerId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function loadProfiles() {
    setLoading(true);
    try {
      const [response, learnersResponse] = await Promise.all([
        fetch("/api/child-profiles", { cache: "no-store" }),
        fetch("/api/history", { cache: "no-store" }),
      ]);

      const payload = (await response.json()) as ProfilesPayload;

      if (!response.ok) {
        throw new Error(
          response.status === 401
            ? "يرجى تسجيل الدخول مجددًا."
            : "تعذّر تحميل حسابات الأطفال.",
        );
      }

      if (!learnersResponse.ok) {
        throw new Error(
          learnersResponse.status === 401
            ? "يرجى تسجيل الدخول مجددًا."
            : "تعذّر تحميل قائمة المستخدمين.",
        );
      }

      const learnersPayload = (await learnersResponse.json()) as {
        learners?: LearnerOption[];
      };

      const availableLearners = Array.isArray(learnersPayload.learners)
        ? learnersPayload.learners
        : [];

      setProfiles(Array.isArray(payload.profiles) ? payload.profiles : []);
      setLearners(availableLearners);

      let rememberedId: string | null = null;
      try {
        rememberedId = window.localStorage.getItem(ACTIVE_LEARNER_KEY);
      } catch {
        // La sélection reste utilisable sans stockage local.
      }

      const current =
        availableLearners.find((learner) => learner.id === rememberedId) ??
        availableLearners.find((learner) => learner.childProfileId === null) ??
        availableLearners[0] ??
        null;

      setActiveLearnerId(current?.id ?? null);

      if (current) {
        try {
          window.localStorage.setItem(ACTIVE_LEARNER_KEY, current.id);
        } catch {
          // La sélection reste active pendant la session.
        }

        window.dispatchEvent(
          new CustomEvent(ACTIVE_LEARNER_EVENT, { detail: current.id }),
        );
      }
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "تعذّر تحميل حسابات الأطفال.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProfiles();
  }, []);

  function activateLearner(id: string) {
    setActiveLearnerId(id);

    try {
      window.localStorage.setItem(ACTIVE_LEARNER_KEY, id);
    } catch {
      // La sélection reste active pendant la session.
    }

    window.dispatchEvent(new CustomEvent(ACTIVE_LEARNER_EVENT, { detail: id }));
  }

  async function refreshLearners() {
    try {
      const response = await fetch("/api/history", { cache: "no-store" });
      if (!response.ok) return;

      const payload = (await response.json()) as {
        learners?: LearnerOption[];
      };
      const available = Array.isArray(payload.learners) ? payload.learners : [];
      setLearners(available);

      let rememberedId: string | null = null;
      try {
        rememberedId = window.localStorage.getItem(ACTIVE_LEARNER_KEY);
      } catch {
        // Utiliser le profil principal comme solution de repli.
      }

      const current =
        available.find((learner) => learner.id === rememberedId) ??
        available.find((learner) => learner.childProfileId === null) ??
        available[0] ??
        null;

      setActiveLearnerId(current?.id ?? null);
      if (current && current.id !== rememberedId) {
        activateLearner(current.id);
      }
    } catch {
      // Ne pas bloquer la gestion des profils si le rafraîchissement échoue.
    }
  }

  async function createProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();

    if (!trimmedName) {
      setMessage("يرجى إدخال اسم حساب الطفل.");
      return;
    }

    setBusy(true);
    setMessage("");

    try {
      const response = await fetch("/api/child-profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName }),
      });
      const payload = (await response.json()) as {
        profile?: ChildProfile;
        error?: string;
      };

      if (!response.ok || !payload.profile) {
        throw new Error(
          payload.error === "INVALID_CHILD_PROFILE_NAME"
            ? "يرجى إدخال اسم صالح."
            : payload.error === "UNAUTHORIZED"
              ? "يرجى تسجيل الدخول مجددًا."
              : "تعذّر إنشاء حساب الطفل.",
        );
      }

      setProfiles((current) => [...current, payload.profile!]);
      await refreshLearners();
      setName("");
      setMessage("تم إنشاء حساب الطفل.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "تعذّر إنشاء حساب الطفل.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function saveProfile(id: string) {
    const trimmedName = editingName.trim();

    if (!trimmedName) {
      setMessage("يرجى إدخال اسم صالح.");
      return;
    }

    setBusy(true);
    setMessage("");

    try {
      const response = await fetch(
        `/api/child-profiles/${encodeURIComponent(id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: trimmedName }),
        },
      );
      const payload = (await response.json()) as {
        profile?: ChildProfile;
        error?: string;
      };

      if (!response.ok || !payload.profile) {
        throw new Error(
          payload.error === "CHILD_PROFILE_NOT_FOUND"
            ? "حساب الطفل غير موجود."
            : "تعذّر تعديل حساب الطفل.",
        );
      }

      setProfiles((current) =>
        current.map((profile) =>
          profile.id === id ? payload.profile! : profile,
        ),
      );
      await refreshLearners();
      setEditingId(null);
      setEditingName("");
      setMessage("تم تحديث حساب الطفل.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "تعذّر تعديل حساب الطفل.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function deleteProfile(profile: ChildProfile) {
    if (
      !window.confirm(
        `هل تريد حذف حساب الطفل "${profile.name}"؟ قد يؤثر ذلك على البيانات المرتبطة به.`,
      )
    ) {
      return;
    }

    setBusy(true);
    setMessage("");

    try {
      const response = await fetch(
        `/api/child-profiles/${encodeURIComponent(profile.id)}`,
        { method: "DELETE" },
      );

      if (!response.ok) {
        throw new Error(
          response.status === 404
            ? "حساب الطفل غير موجود."
            : "تعذّر حذف حساب الطفل.",
        );
      }

      const deletedLearner = learners.find(
        (learner) => learner.childProfileId === profile.id,
      );
      const mainLearner = learners.find(
        (learner) => learner.childProfileId === null,
      );

      if (deletedLearner?.id === activeLearnerId && mainLearner) {
        activateLearner(mainLearner.id);
      }

      setProfiles((current) =>
        current.filter((item) => item.id !== profile.id),
      );
      await refreshLearners();

      if (editingId === profile.id) {
        setEditingId(null);
        setEditingName("");
      }
      setMessage("تم حذف حساب الطفل.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "تعذّر حذف حساب الطفل.",
      );
    } finally {
      setBusy(false);
    }
  }

  const fieldClass =
    "w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2";

  return (
    <section className="min-w-0 space-y-2 border-t border-[var(--border)] pt-2 sm:pt-4">
      <h4 className="font-semibold">حسابات الأطفال</h4>

      {loading ? (
        <p className="text-[var(--muted)]">جارٍ تحميل حسابات الأطفال...</p>
      ) : (
        <>
          {profiles.length === 0 ? (
            <p className="text-[var(--muted)]">لا توجد حسابات أطفال مسجّلة.</p>
          ) : (
            <ul className="space-y-2">
              {profiles.map((profile) => (
                <li
                  key={profile.id}
                  className="min-w-0 space-y-2 rounded-lg border border-[var(--border)] p-2 sm:p-3"
                >
                  {editingId === profile.id ? (
                    <div className="space-y-2">
                      <label className="block">
                        اسم حساب الطفل
                        <input
                          className={fieldClass}
                          value={editingName}
                          onChange={(event) =>
                            setEditingName(event.target.value)
                          }
                          maxLength={100}
                        />
                      </label>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void saveProfile(profile.id)}
                          className="rounded-lg border border-[var(--border)] px-3 py-2 disabled:opacity-50"
                        >
                          حفظ
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => {
                            setEditingId(null);
                            setEditingName("");
                          }}
                          className="rounded-lg border border-[var(--border)] px-3 py-2 disabled:opacity-50"
                        >
                          إلغاء
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium">{profile.name}</span>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => {
                            setEditingId(profile.id);
                            setEditingName(profile.name);
                            setMessage("");
                          }}
                          className="rounded-lg border border-[var(--border)] px-3 py-2 disabled:opacity-50"
                        >
                          تعديل
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void deleteProfile(profile)}
                          className="rounded-lg border border-[var(--border)] px-3 py-2 disabled:opacity-50"
                        >
                          حذف
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}

          <form
            className="space-y-2"
            onSubmit={(event) => void createProfile(event)}
          >
            <label className="block">
              إضافة حساب طفل
              <input
                className={fieldClass}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="اسم الطفل"
                maxLength={100}
                required
              />
            </label>
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg border border-[var(--border)] px-4 py-2 font-semibold disabled:opacity-50"
            >
              {busy ? "جارٍ التنفيذ..." : "إضافة حساب طفل"}
            </button>
          </form>
        </>
      )}

      {message ? (
        <p className="text-[var(--muted)]" role="status">
          {message}
        </p>
      ) : null}
    </section>
  );
}
