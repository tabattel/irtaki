"use client";

import Link from "next/link";

import { AccountActiveLearnerSwitcher } from "@/components/layout/account-active-learner-switcher";

import { useEffect, useState } from "react";
import { ChildAccountsPanel } from "./child-accounts-panel";
import { RolesPanel } from "./roles-panel";
import type { FormEvent } from "react";

type AuthUser = {
  id?: string;
  email?: string | null;
  name?: string | null;
};

type AuthPayload = {
  user?: AuthUser | null;
  error?: string;
};

type FormMode = "login" | "register" | "forgot";

const errorMessages: Record<string, string> = {
  INVALID_CREDENTIALS: "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
  EMAIL_ALREADY_EXISTS: "هذا البريد الإلكتروني مسجّل بالفعل.",
  INVALID_REQUEST: "يرجى إدخال البريد الإلكتروني وكلمة المرور.",
};

async function readCurrentUser(): Promise<AuthUser | null> {
  const response = await fetch("/api/auth/session", {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("SESSION_UNAVAILABLE");
  }

  const payload = (await response.json()) as AuthPayload;
  return payload.user ?? null;
}


function MailIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

export function AccountPanel() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [mode, setMode] = useState<FormMode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [editingOwnerName, setEditingOwnerName] = useState(false);
  const [ownerNameDraft, setOwnerNameDraft] = useState("");
  const [forgotSent, setForgotSent] = useState(false);

  useEffect(() => {
    let active = true;

    void readCurrentUser()
      .then((currentUser) => {
        if (active) {
          setUser(currentUser);
        }
      })
      .catch(() => {
        if (active) {
          setMessage("تعذّر التحقق من الجلسة. يمكنك تسجيل الدخول.");
        }
      })
      .finally(() => {
        if (active) {
          setCheckingSession(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    try {
      const endpoint =
        mode === "login" ? "/api/auth/login" : "/api/auth/register";

      const body =
        mode === "register"
          ? {
              name: name.trim() || undefined,
              email: email.trim(),
              password,
            }
          : {
              email: email.trim(),
              password,
            };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const result = (await response.json()) as AuthPayload;

      if (!response.ok) {
        setMessage(
          errorMessages[result.error ?? ""] ??
            "تعذّر إتمام العملية. حاول مرة أخرى.",
        );
        return;
      }

      // التحقق من الكوكي والجلسة عبر المسار الحقيقي، لا عبر نجاح POST فقط.
      const currentUser = await readCurrentUser();

      if (!currentUser) {
        setUser(null);
        setMessage(
          "لم يتم التعرّف على الجلسة بعد العملية. تحقّق من الخادم ثم أعد المحاولة.",
        );
        return;
      }

      setUser(currentUser);
      setName("");
      setPassword("");
      setMessage(
        mode === "login"
          ? "تم تسجيل الدخول بنجاح."
          : "تم إنشاء الحساب الرئيسي بنجاح.",
      );
    } catch {
      setMessage("تعذّر الاتصال بالخادم. تحقق من تشغيل التطبيق وحاول مجددًا.");
    } finally {
      setBusy(false);
    }
  }

    async function handleForgotSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setForgotSent(false);

    try {
      await fetch("/api/auth/password/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      setForgotSent(true);
    } catch {
      setMessage("تعذّر الاتصال بالخادم. حاول مرة أخرى.");
    } finally {
      setBusy(false);
    }
  }

async function handleOwnerNameSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = ownerNameDraft.trim();

    if (!trimmedName || trimmedName.length > 100) {
      setMessage("يرجى إدخال اسم صالح لا يتجاوز 100 حرف.");
      return;
    }

    setBusy(true);
    setMessage("");

    try {
      const response = await fetch("/api/auth/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName }),
      });

      const result = (await response.json()) as AuthPayload;

      if (!response.ok || !result.user) {
        setMessage(
          result.error === "UNAUTHORIZED"
            ? "يرجى تسجيل الدخول مجددًا."
            : result.error === "INVALID_OWNER_NAME"
              ? "يرجى إدخال اسم صالح لا يتجاوز 100 حرف."
              : "تعذّر تحديث اسم صاحب الحساب الرئيسي.",
        );
        return;
      }

      setUser(result.user);
      setOwnerNameDraft(result.user.name?.trim() ?? trimmedName);
      setEditingOwnerName(false);
      setMessage("تم تحديث اسم صاحب الحساب الرئيسي.");
      window.dispatchEvent(new Event("irtaki:owner-name-changed"));
    } catch {
      setMessage("تعذّر الاتصال بالخادم. حاول مرة أخرى.");
    } finally {
      setBusy(false);
    }
  }

  async function handleLogout() {
    setBusy(true);
    setMessage("");

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("LOGOUT_FAILED");
      }

      setUser(null);
      setMode("login");
      setPassword("");
      setMessage("تم تسجيل الخروج.");
    } catch {
      setMessage("تعذّر تسجيل الخروج. حاول مرة أخرى.");
    } finally {
      setBusy(false);
    }
  }

  const fieldClass =
    "mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-base text-[var(--foreground)]";

  return (
    <section
      className="irtaki-account-panel w-full min-w-0 space-y-2 text-sm sm:space-y-3"
      dir="rtl"
      aria-live="polite"
    >
      <h3 className="font-bold text-[var(--jannah-green)]">الحسابات</h3>

      {checkingSession ? (
        <p className="text-[var(--muted)]">جارٍ التحقق من الحساب...</p>
      ) : user ? (
        <div className="space-y-3 sm:space-y-4">
          <section className="min-w-0 space-y-2 rounded-lg border border-[var(--jannah-gold)]/30 bg-[var(--jannah-cream)]/30 p-2 sm:p-3">
            <h4 className="font-bold text-[var(--jannah-green)]">الحساب الرئيسي</h4>
            <p className="font-medium">
              <span aria-hidden="true" className="text-green-600">
                ✓{" "}
              </span>
              الحساب الرئيسي متصل
            </p>

            {editingOwnerName ? (
              <form
                className="space-y-3"
                onSubmit={(event) => void handleOwnerNameSubmit(event)}
              >
                <label className="block">
                  اسم صاحب الحساب الرئيسي
                  <input
                    className="mt-1 w-full rounded-lg border border-[var(--jannah-gold)]/40 bg-[var(--background)] px-3 py-3 text-base text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--jannah-green)]/20"
                    type="text"
                    autoComplete="name"
                    maxLength={100}
                    required
                    autoFocus
                    value={ownerNameDraft}
                    onChange={(event) => setOwnerNameDraft(event.target.value)}
                  />
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="submit"
                    disabled={busy}
                    className="min-h-11 rounded-lg border border-[var(--jannah-gold)]/50 px-3 py-2 font-semibold text-[var(--jannah-green)] hover:bg-[var(--jannah-cream)] disabled:opacity-50"
                  >
                    {busy ? "جارٍ الحفظ..." : "حفظ الاسم"}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setEditingOwnerName(false);
                      setOwnerNameDraft(user.name?.trim() ?? "");
                    }}
                    className="min-h-11 rounded-lg border border-[var(--jannah-gold)]/40 px-3 py-2 hover:bg-[var(--jannah-cream)] disabled:opacity-50"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">
                  {user.name?.trim() || "لم يتم تحديد اسم صاحب الحساب"}
                </p>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setOwnerNameDraft(user.name?.trim() ?? "");
                    setEditingOwnerName(true);
                    setMessage("");
                  }}
                  className="min-h-11 rounded-lg border border-[var(--jannah-gold)]/40 px-4 py-2 font-medium hover:bg-[var(--jannah-cream)] disabled:opacity-50"
                >
                  تعديل
                </button>
              </div>
            )}

            {user.email ? (
              <p className="max-w-full break-all text-[var(--muted)]" dir="ltr">
                {user.email}
              </p>
            ) : null}

            <button
              type="button"
              disabled={busy}
              onClick={() => void handleLogout()}
              className="rounded-lg border border-[var(--jannah-gold)]/40 px-4 py-2 font-medium hover:bg-[var(--jannah-cream)] disabled:opacity-50"
            >
              {busy ? "جارٍ التنفيذ..." : "تسجيل الخروج"}
            </button>
          </section>
          <ChildAccountsPanel />
        <RolesPanel />
          <AccountActiveLearnerSwitcher />
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          <p className="text-[var(--muted)]">
            سجّل الدخول إلى حسابك الرئيسي أو أنشئ حسابًا لإدارة ملفات الحساب.
          </p>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              aria-pressed={mode === "login"}
              onClick={() => {
                setMode("login");
                setMessage("");
              }}
              className={`rounded-lg border border-[var(--border)] px-3 py-2 ${
                mode === "login" ? "font-semibold" : "text-[var(--muted)]"
              }`}
            >
              تسجيل الدخول
            </button>

            <button
              type="button"
              aria-pressed={mode === "register"}
              onClick={() => {
                setMode("register");
                setMessage("");
              }}
              className={`rounded-lg border border-[var(--border)] px-3 py-2 ${
                mode === "register" ? "font-semibold" : "text-[var(--muted)]"
              }`}
            >
              إنشاء الحساب الرئيسي
            </button>
          </div>

          <button
            type="button"
            disabled={busy}
            onClick={() => {
              window.location.assign("/api/auth/google");
            }}
            className="flex w-full items-center justify-center gap-3 rounded-lg border border-[var(--jannah-gold)]/40 px-4 py-3 font-medium hover:bg-[var(--jannah-cream)] disabled:opacity-50"
          >
            <svg aria-hidden="true" viewBox="0 0 48 48" className="h-5 w-5">
              <path
                fill="#EA4335"
                d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 3.07 13.22l7.98 6.19C12.94 13.72 18.01 9.5 24 9.5Z"
              />
              <path
                fill="#4285F4"
                d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.74 7.18l7.72 5.99c4.51-4.17 7.06-10.31 7.06-17.64Z"
              />
              <path
                fill="#FBBC05"
                d="M10.05 28.59A14.4 14.4 0 0 1 9.27 24c0-1.59.27-3.13.76-4.59l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.87.93 7.52 2.56 10.78l7.49-6.19Z"
              />
              <path
                fill="#34A853"
                d="M24 48c6.48 0 11.93-2.13 15.91-5.81l-7.72-5.99c-2.14 1.43-4.88 2.28-8.19 2.28-5.99 0-11.06-4.22-12.95-9.91l-7.98 6.19C6.51 43.62 14.62 48 24 48Z"
              />
            </svg>
            متابعة باستخدام Google
          </button>

          <p className="text-center text-xs text-[var(--muted)]">
            أو باستخدام البريد الإلكتروني وكلمة المرور
          </p>

          <form
            className="space-y-3"
            onSubmit={(event) => {
              if (mode === "forgot") void handleForgotSubmit(event);
              else void handleSubmit(event);
            }}
          >
            {mode === "register" ? (
              <label className="block">
                الاسم
                <input
                  className={fieldClass}
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </label>
            ) : null}

            {mode === "forgot" ? (
              <p className="text-[var(--muted)]">
                أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة تعيين كلمة المرور.
              </p>
            ) : null}

            <label className="block"><span className="flex items-center gap-1.5"><MailIcon />البريد الإلكتروني</span><input
                className={fieldClass}
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              /></label>

            {mode !== "forgot" ? (
              <label className="block"><span className="flex items-center gap-1.5"><LockIcon />كلمة المرور</span><input
                className={fieldClass}
                type="password"
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              /></label>
            ) : null}
{mode === "login" ? (
              <div className="text-left">
                <button
                  type="button"
                  onClick={() => { setMode("forgot"); setMessage(""); setForgotSent(false); }}
                  className="text-xs text-[var(--muted)] underline hover:text-[var(--foreground)]"
                >
                  هل نسيت كلمة المرور ؟
                </button>
              </div>
            ) : null}

            {mode === "forgot" && forgotSent ? (
              <p className="rounded-lg bg-green-50 p-3 text-green-700" dir="rtl">
                إذا كان البريد الإلكتروني مسجّلًا، فسيتم إرسال رابط إعادة التعيين.
              </p>
            ) : null}

            <button
              type="submit"
              disabled={busy}
              className="rounded-lg border border-[var(--jannah-gold)]/50 px-4 py-2 font-semibold text-[var(--jannah-green)] hover:bg-[var(--jannah-cream)] disabled:opacity-50"
            >
              {busy
                ? "جارٍ التنفيذ..."
                : mode === "login"
                  ? "تسجيل الدخول"
                  : mode === "register"
                    ? "إنشاء الحساب"
                    : "إرسال رابط إعادة التعيين"}
            </button>

            {mode === "forgot" ? (
              <button
                type="button"
                onClick={() => { setMode("login"); setMessage(""); setForgotSent(false); }}
                className="w-full text-center text-xs text-[var(--muted)] underline hover:text-[var(--foreground)]"
              >
                العودة إلى تسجيل الدخول
              </button>
            ) : null}
          </form>
        </div>
      )}

      {message ? (
        <p className="text-[var(--muted)]" role="status">
          {message}
        </p>
      ) : null}
    </section>
  );
}
