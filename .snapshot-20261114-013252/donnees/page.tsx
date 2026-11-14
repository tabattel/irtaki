import { InstallButton } from "@/components/pwa/install-button";
import { DownloadMushafButton } from "@/components/pwa/download-mushaf-button";

export const metadata = {
  title: "البيانات والتحميلات",
};

export default function DonneesPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6" dir="rtl">
      <header>
        <h1 className="text-2xl font-bold text-[var(--jannah-green)]">
          البيانات والتحميلات
        </h1>
        <p className="text-sm text-[var(--muted)]">
          إدارة المحتوى المحمّل والتثبيت على جهازك.
        </p>
      </header>

      <section className="space-y-3 rounded-xl border border-[var(--jannah-gold)]/40 bg-[var(--jannah-cream)]/40 p-4">
        <h2 className="font-bold text-[var(--jannah-green)]">التطبيق</h2>
        <p className="text-sm text-[var(--muted)]">
          ثبّت IRTAKI على جهازك لتصفح أسرع وعمل بدون اتصال. التثبيت التلقائي
          مفعّل على Android و iPhone عند فتح الصفحة الرئيسية.
        </p>
        <InstallButton />
      </section>

      <section className="space-y-3 rounded-xl border border-[var(--jannah-gold)]/40 p-4">
        <h2 className="font-bold text-[var(--jannah-green)]">النصوص</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-right text-sm md:min-w-[600px]">
            <thead>
              <tr className="border-b border-[var(--border)] text-[var(--muted)]">
                <th className="px-2 py-2">العنصر</th>
                <th className="px-2 py-2">الحجم</th>
                <th className="px-2 py-2">الإجراء</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-[var(--border)]">
                <td className="px-2 py-2">نص المصحف كامل</td>
                <td className="px-2 py-2">604 صفحات</td>
                <td className="px-2 py-2"><DownloadMushafButton /></td>
              </tr>
              <tr className="border-b border-[var(--border)]">
                <td className="px-2 py-2">نص الصفحة الحالية</td>
                <td className="px-2 py-2">1 صفحة</td>
                <td className="px-2 py-2">
                  <button type="button" disabled className="rounded-lg border border-[var(--jannah-gold)]/40 px-3 py-2 text-sm opacity-50">قريباً</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3 rounded-xl border border-[var(--jannah-gold)]/40 p-4">
        <h2 className="font-bold text-[var(--jannah-green)]">الكتب</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-right text-sm md:min-w-[600px]">
            <thead>
              <tr className="border-b border-[var(--border)] text-[var(--muted)]">
                <th className="px-2 py-2">الكتاب</th>
                <th className="px-2 py-2">الحجم</th>
                <th className="px-2 py-2">الإجراء</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-[var(--border)]">
                <td className="px-2 py-2">تفسير ابن كثير</td>
                <td className="px-2 py-2">10 مجلدات</td>
                <td className="px-2 py-2"><button type="button" disabled className="rounded-lg border border-[var(--jannah-gold)]/40 px-3 py-2 text-sm opacity-50">قريباً</button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3 rounded-xl border border-[var(--jannah-gold)]/40 p-4">
        <h2 className="font-bold text-[var(--jannah-green)]">الصوت</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-right text-sm md:min-w-[600px]">
            <thead>
              <tr className="border-b border-[var(--border)] text-[var(--muted)]">
                <th className="px-2 py-2">القارئ</th>
                <th className="px-2 py-2">الحجم</th>
                <th className="px-2 py-2">الإجراء</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-[var(--border)]">
                <td className="px-2 py-2">العفاسي — حفص</td>
                <td className="px-2 py-2">114 سورة</td>
                <td className="px-2 py-2"><button type="button" disabled className="rounded-lg border border-[var(--jannah-gold)]/40 px-3 py-2 text-sm opacity-50">قريباً</button></td>
              </tr>
              <tr className="border-b border-[var(--border)]">
                <td className="px-2 py-2">الحصري — حفص</td>
                <td className="px-2 py-2">114 سورة</td>
                <td className="px-2 py-2"><button type="button" disabled className="rounded-lg border border-[var(--jannah-gold)]/40 px-3 py-2 text-sm opacity-50">قريباً</button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
