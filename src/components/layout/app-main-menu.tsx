"use client";

import { MushafContextHeader } from "./mushaf-context-header";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getActiveLearnerId, isOwner } from "@/lib/roles";
import { useEffect, useState } from "react";
import { AccountPanel } from "./account-panel";
import { DownloadMushafButton } from "@/components/pwa/download-mushaf-button";

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




function ExercisesIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="9" />
      <path d="M9 12h6M12 9v6" />
    </svg>
  );
}

function DataIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <ellipse cx="12" cy="5" rx="8" ry="3" />
      <path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5" />
      <path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />
    </svg>
  );
}


function ObjectivesIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M5 5h14v14H5z" />
      <path d="m8 12 2.5 2.5L16 9" />
    </svg>
  );
}

function DashboardIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </svg>
  );
}

const iconButtonBase =
  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition focus-visible:outline-2 focus-visible:outline-offset-2 sm:h-11 sm:w-11";
const iconButtonIdle =
  "border-transparent text-[var(--foreground)] hover:bg-[var(--surface)]";
const iconButtonActive =
  "border-[var(--jannah-gold)] bg-[var(--jannah-cream)] text-[var(--jannah-green)] font-semibold";

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
  const pathname = usePathname();
  const isActive = pathname === href;
  return (
    <Link
      href={href}
      title={label}
      aria-label={label}
      aria-current={isActive ? "page" : undefined}
      className={`${iconButtonBase} ${isActive ? iconButtonActive : iconButtonIdle}`}
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
  active = false,
}: {
  label: string;
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={`${iconButtonBase} ${active ? iconButtonActive : iconButtonIdle}`}
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
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    function refreshRole() {
      try {
        setIsAdmin(isOwner(getActiveLearnerId()));
      } catch {
        setIsAdmin(false);
      }
    }
    refreshRole();
    window.addEventListener("storage", refreshRole);
    window.addEventListener("irtaki:learner-changed", refreshRole);
    return () => {
      window.removeEventListener("storage", refreshRole);
      window.removeEventListener("irtaki:learner-changed", refreshRole);
    };
  }, []);

  useEffect(() => {
    const handler = () => {
      setPanel("account");
      setMobileOpen(false);
    };
    window.addEventListener("irtaki:open-account-panel", handler);
    return () =>
      window.removeEventListener("irtaki:open-account-panel", handler);
  }, []);

  

  function closeMenu() {
    setPanel(null);
    setMobileOpen(false);
  }

  function togglePanel(nextPanel: Exclude<MainPanel, null>) {
    setPanel((current) => (current === nextPanel ? null : nextPanel));
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[var(--border)] bg-[var(--background)] shadow-sm" dir="rtl">
      <div className="w-full max-w-[100vw] min-w-0">
        <div className="relative mx-auto w-full max-w-7xl min-w-0 px-2 py-1.5 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center justify-between gap-1">
            <button
              type="button"
              aria-label="فتح القائمة"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((v) => !v)}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-[var(--foreground)] transition hover:bg-[var(--surface)] md:hidden"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                {mobileOpen ? (
                  <>
                    <path d="M6 6l12 12" />
                    <path d="M18 6L6 18" />
                  </>
                ) : (
                  <>
                    <path d="M4 7h16" />
                    <path d="M4 12h16" />
                    <path d="M4 17h16" />
                  </>
                )}
              </svg>
            </button>

            <nav
              aria-label="القائمة الرئيسية"
              className="hidden md:flex h-12 min-w-0 flex-1 flex-nowrap items-center gap-0 overflow-x-auto sm:h-14"
            >
              <MainMenuLink href="/" label="الرئيسية" onClick={closeMenu}>
                <HomeIcon />
              </MainMenuLink>
              <MainMenuLink href="/recherche" label="البحث" onClick={closeMenu}>
                <SearchIcon />
              </MainMenuLink>
              <MainMenuButton label="انتقل إلى" onClick={() => togglePanel("goto")} active={panel === "goto"}>
                <GoToIcon />
              </MainMenuButton>
              <div className="mx-1 h-6 w-px shrink-0 bg-[var(--jannah-gold)]/40" aria-hidden="true" />
              <MainMenuLink href="/objectifs" label="الأهداف" onClick={closeMenu}>
                <ObjectivesIcon />
              </MainMenuLink>
              <MainMenuLink href="/statistiques" label="الإحصائيات" onClick={closeMenu}>
                <StatisticsIcon />
              </MainMenuLink>
              <MainMenuLink href="/historique" label="الإنجاز" onClick={closeMenu}>
                <HistoryIcon />
              </MainMenuLink>
              <MainMenuLink href="/exercices" label="التمارين" onClick={closeMenu}>
                <ExercisesIcon />
              </MainMenuLink>
              <div className="mx-1 h-6 w-px shrink-0 bg-[var(--jannah-gold)]/40" aria-hidden="true" />
              <MainMenuLink href="/donnees" label="البيانات" onClick={closeMenu}>
                <DataIcon />
              </MainMenuLink>
              <DownloadMushafButton />
              <MainMenuButton label="الإعدادات" onClick={() => togglePanel("settings")} active={panel === "settings"}>
                <SettingsIcon />
              </MainMenuButton>
              {isAdmin ? (
                <MainMenuLink href="/dashboard" label="لوحة التحكم" onClick={closeMenu}>
                  <DashboardIcon />
                </MainMenuLink>
              ) : null}
            </nav>

            
          </div>

          {panel ? (
            <div className="absolute inset-x-0 top-full z-50 mt-0 max-h-[85dvh] min-w-0 overflow-y-auto rounded-b-lg border border-t-0 border-[var(--border)] bg-[var(--background)] p-3 shadow-xl sm:inset-x-2 sm:mt-2 sm:max-h-[70dvh] sm:rounded-xl sm:border sm:p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="font-semibold">
                  {panel === "goto"
                    ? "انتقل إلى"
                    : panel === "account"
                      ? "الحساب"
                      : "الإعدادات"}
                </h2>
                <button
                  type="button"
                  onClick={closeMenu}
                  aria-label="إغلاق"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[var(--foreground)] transition hover:bg-[var(--surface)] md:hidden"
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
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
    {mobileOpen && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/40 md:hidden"
              onClick={closeMenu}
              aria-hidden="true"
            />
            <div className="absolute left-0 right-0 top-full z-50 max-h-[85dvh] overflow-y-auto border-b border-[var(--border)] bg-[var(--background)] shadow-lg md:hidden">
              <nav className="flex flex-col p-2" aria-label="القائمة الرئيسية - الهاتف">
                <MushafContextHeader />

                <CollapsibleSection title="التنقل" paths={["/", "/recherche"]}>
                  <MobileMenuLink href="/" label="الرئيسية" onClick={closeMenu} />
                  <MobileMenuLink href="/recherche" label="البحث" onClick={closeMenu} />
                  <MobileMenuButton label="انتقل إلى" onClick={() => { setPanel("goto"); setMobileOpen(false); }} />
                </CollapsibleSection>

                <CollapsibleSection title="المسار" paths={["/objectifs", "/statistiques", "/historique", "/exercices"]}>
                  <MobileMenuLink href="/objectifs" label="الأهداف" onClick={closeMenu} />
                  <MobileMenuLink href="/statistiques" label="الإحصائيات" onClick={closeMenu} />
                  <MobileMenuLink href="/historique" label="الإنجاز" onClick={closeMenu} />
                  <MobileMenuLink href="/exercices" label="التمارين" onClick={closeMenu} />
                </CollapsibleSection>

                <CollapsibleSection title="الأدوات" paths={["/donnees", "/dashboard"]}>
                  <MobileMenuLink href="/donnees" label="البيانات" onClick={closeMenu} />
                  <DownloadMushafButton variant="row" />
                  <MobileMenuButton label="الإعدادات" onClick={() => { setPanel("settings"); setMobileOpen(false); }} />
                  {isAdmin ? (
                    <MobileMenuLink href="/dashboard" label="لوحة التحكم" onClick={closeMenu} />
                  ) : null}
                </CollapsibleSection>
              </nav>
            </div>
          </>
        )}
      </header>
  );
}



function CollapsibleSection({
  title,
  paths = [],
  children,
}: {
  title: string;
  paths?: string[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const autoOpen = paths.some(
    (p) => pathname === p || (p !== "/" && pathname.startsWith(p + "/"))
  );
  const [open, setOpen] = useState(autoOpen);

  useEffect(() => {
    if (autoOpen) setOpen(true);
  }, [autoOpen]);

  return (
    <div className="mb-1 overflow-hidden rounded-lg border border-[var(--jannah-gold)]/25 bg-white/40">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 bg-gradient-to-l from-[var(--jannah-cream)]/70 to-transparent px-3 py-2.5 text-right text-base font-bold text-[var(--jannah-green)] transition hover:from-[var(--jannah-cream)]"
      >
        <span>{title}</span>
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className={`h-4 w-4 shrink-0 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open ? (
        <div className="space-y-0.5 border-t border-[var(--jannah-gold)]/25 p-1">
          {children}
        </div>
      ) : null}
    </div>
  );
}

function MobileMenuLink({ href, label, onClick }: { href: string; label: string; onClick: () => void }) {
  const pathname = usePathname();
  const isActive = pathname === href;
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={isActive ? "page" : undefined}
      className={
        isActive
          ? "flex h-12 items-center rounded-lg border border-[var(--jannah-gold)] bg-[var(--jannah-cream)] px-4 text-base font-semibold text-[var(--jannah-green)]"
          : "flex h-12 items-center rounded-lg border border-transparent px-4 text-base text-[var(--foreground)] transition hover:border-[var(--jannah-gold)]/60 hover:bg-[var(--jannah-cream)]"
      }
    >
      {label}
    </Link>
  );
}

function MobileMenuButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-12 items-center rounded-lg px-4 text-right text-base text-[var(--foreground)] transition hover:bg-[var(--surface)]"
    >
      {label}
    </button>
  );
}
