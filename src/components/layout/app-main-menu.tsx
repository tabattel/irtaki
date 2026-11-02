"use client";

import Link from "next/link";
import { useState } from "react";
import { AccountPanel } from "./account-panel";

type MainPanel = "goto" | "account" | "settings" | null;

function HomeIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="m3 10 9-7 9 7" />
      <path d="M5 9v11h14V9" />
      <path d="M9 20v-6h6v6" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 5 5" />
    </svg>
  );
}

function GoToIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M4 12h13" />
      <path d="m13 7 5 5-5 5" />
      <path d="M4 6v12" />
    </svg>
  );
}

function AccountIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c.8-3.4 3.1-5.2 7-5.2s6.2 1.8 7 5.2" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.8 1.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.1h-2.5V20a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1-1.8-1.8.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H6.4v-2.5H6.5a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1 1.8-1.8.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6V5h2.5v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1 1.8 1.8-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.1v2.5h-.1a1.7 1.7 0 0 0-1.6 1Z" />
    </svg>
  );
}

function StatisticsIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M4 19V5" />
      <path d="M4 19h17" />
      <path d="M8 16v-5" />
      <path d="M13 16V7" />
      <path d="M18 16v-8" />
    </svg>
  );
}

function HistoryIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M3 12a9 9 0 1 0 2.6-6.4L3 8" />
      <path d="M3 3v5h5" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}



const iconButtonClass =
  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[var(--foreground)] transition hover:bg-[var(--surface)] focus-visible:outline-2 focus-visible:outline-offset-2 sm:h-11 sm:w-11";

function MainMenuLink({
  href,
  label,
  children,
  onClick,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      title={label}
      aria-label={label}
      className={iconButtonClass}
      onClick={onClick}
    >
      {children}
    </Link>
  );
}

function MainMenuButton({
  label,
  children,
  onClick,
}: {
  label: string;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className={iconButtonClass}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function PanelButton({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="button"
      disabled
      className="rounded-lg border border-[var(--border)] px-3 py-2 text-right opacity-50"
    >
      {children}
    </button>
  );
}

export function AppMainMenu() {
  const [panel, setPanel] = useState<MainPanel>(null);

  

  function closeMenu() {
    setPanel(null);
    
  }

  function togglePanel(nextPanel: Exclude<MainPanel, null>) {
    setPanel((current) => (current === nextPanel ? null : nextPanel));
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[var(--border)] bg-[var(--background)] shadow-sm" dir="rtl">
      <div className="w-full max-w-[100vw] min-w-0">
        <div className="relative mx-auto w-full max-w-7xl min-w-0 px-2 py-1.5 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center justify-between gap-1">
            <nav
              aria-label="القائمة الرئيسية"
              className="flex h-12 min-w-0 flex-1 flex-nowrap items-center gap-0 overflow-x-auto sm:h-14"
            >
              <MainMenuLink href="/" label="الرئيسية" onClick={closeMenu}>
                <HomeIcon />
              </MainMenuLink>

              <MainMenuLink href="/recherche" label="البحث" onClick={closeMenu}>
                <SearchIcon />
              </MainMenuLink>
              <MainMenuLink href="/objectifs" label="الأهداف" onClick={closeMenu}>
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path d="M5 5h14v14H5z" />
                  <path d="m8 12 2.5 2.5L16 9" />
                </svg>
              </MainMenuLink>

              <MainMenuLink
                href="/statistiques"
                label="الإحصائيات"
                onClick={closeMenu}
              >
                <StatisticsIcon />
              </MainMenuLink>

              <MainMenuLink
                href="/coran/10/page/605"
                label="السجل"
                onClick={closeMenu}
              >
                <HistoryIcon />
              </MainMenuLink>

              <MainMenuButton
                label="انتقل إلى"
                onClick={() => togglePanel("goto")}
              >
                <GoToIcon />
              </MainMenuButton>

              <MainMenuButton
                label="الحساب"
                onClick={() => togglePanel("account")}
              >
                <AccountIcon />
              </MainMenuButton>

              <MainMenuButton
                label="الإعدادات"
                onClick={() => togglePanel("settings")}
              >
                <SettingsIcon />
              </MainMenuButton>
            </nav>

            
          </div>

          {panel ? (
            <div className="absolute inset-x-2 top-full z-50 mt-2 max-h-[70dvh] min-w-0 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--background)] p-2 shadow-xl sm:rounded-xl sm:p-4">
              <div className="mb-3">
                <h2 className="font-semibold">
                  {panel === "goto"
                    ? "انتقل إلى"
                    : panel === "account"
                      ? "الحساب"
                      : "الإعدادات"}
                </h2>
              </div>

              {panel === "goto" ? (
                <div className="space-y-3 text-sm">
                  <p className="text-[var(--muted)]">
                    اختر الصفحة أو السورة أو موضع القراءة للانتقال إليه.
                  </p>

                  <div className="grid grid-cols-2 gap-2">
                    <PanelButton>الصفحة</PanelButton>
                    <PanelButton>السورة</PanelButton>
                    <PanelButton>الآية</PanelButton>
                    <PanelButton>الجزء</PanelButton>
                    <PanelButton>الحزب</PanelButton>
                    <PanelButton>النصف</PanelButton>
                    <PanelButton>الربع</PanelButton>
                  </div>

                  <p className="text-xs text-[var(--muted)]">
                    سيتم ربط الحقول تلقائيًا ببيانات المصحف.
                  </p>
                </div>
              ) : null}

              {panel === "account" ? <AccountPanel /> : null}

              {panel === "settings" ? (
                <div className="space-y-3 text-sm">
                  <p className="text-[var(--muted)]">
                    إعدادات التطبيق والقراءة والصوت والمظهر.
                  </p>

                  <div className="grid gap-2">
                    <PanelButton>المظهر</PanelButton>
                    <PanelButton>إعدادات القراءة</PanelButton>
                    <PanelButton>إعدادات الصوت</PanelButton>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
