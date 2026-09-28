import Link from "next/link";

export function AppHeader() {
  return (
    <header className="border-b border-[var(--border)] bg-[var(--background)]">
      <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="text-xl font-bold tracking-tight"
          aria-label="IRTAKI - الصفحة الرئيسية"
        >
          IRTAKI
        </Link>

        <nav aria-label="التنقل الرئيسي">
          <ul className="flex items-center gap-4 text-sm">
            <li>
              <Link
                href="/coran"
                className="rounded-md px-3 py-2 hover:bg-[var(--surface)]"
              >
                القرآن
              </Link>
            </li>

            <li>
              <Link
                href="/recherche"
                className="rounded-md px-3 py-2 hover:bg-[var(--surface)]"
              >
                بحث
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
