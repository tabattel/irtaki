import Link from "next/link";

const qiraat = [
  {
    id: 1,
    arabic: "نافع المدني",
    latin: "Nafiʿ al-Madani",
    riwayat: [
      { id: 1, arabic: "قالون", latin: "Qalun" },
      { id: 2, arabic: "ورش", latin: "Warsh" },
    ],
  },
  {
    id: 2,
    arabic: "ابن كثير المكي",
    latin: "Ibn Kathir al-Makki",
    riwayat: [
      { id: 3, arabic: "البزي", latin: "Al-Bazzi" },
      { id: 4, arabic: "قنبل", latin: "Qunbul" },
    ],
  },
  {
    id: 3,
    arabic: "أبو عمرو البصري",
    latin: "Abu Amr al-Basri",
    riwayat: [
      { id: 5, arabic: "الدوري", latin: "Al-Duri" },
      { id: 6, arabic: "السوسي", latin: "Al-Susi" },
    ],
  },
  {
    id: 4,
    arabic: "ابن عامر الشامي",
    latin: "Ibn Amir al-Shami",
    riwayat: [
      { id: 7, arabic: "هشام", latin: "Hisham" },
      { id: 8, arabic: "ابن ذكوان", latin: "Ibn Dhakwan" },
    ],
  },
  {
    id: 5,
    arabic: "عاصم الكوفي",
    latin: "Asim al-Kufi",
    riwayat: [
      { id: 9, arabic: "شعبة", latin: "Shuʿbah" },
      { id: 10, arabic: "حفص", latin: "Hafs", available: true },
    ],
  },
  {
    id: 6,
    arabic: "حمزة الكوفي",
    latin: "Hamza al-Kufi",
    riwayat: [
      { id: 11, arabic: "خلف", latin: "Khalaf" },
      { id: 12, arabic: "خلاد", latin: "Khallad" },
    ],
  },
  {
    id: 7,
    arabic: "الكسائي",
    latin: "Al-Kisa'i",
    riwayat: [
      { id: 13, arabic: "أبو الحارث", latin: "Abu al-Harith" },
      { id: 14, arabic: "الدوري", latin: "Al-Duri" },
    ],
  },
  {
    id: 8,
    arabic: "أبو جعفر المدني",
    latin: "Abu Jaʿfar al-Madani",
    riwayat: [
      { id: 15, arabic: "ابن وردان", latin: "Ibn Wardan" },
      { id: 16, arabic: "ابن جماز", latin: "Ibn Jammaz" },
    ],
  },
  {
    id: 9,
    arabic: "يعقوب الحضرمي",
    latin: "Yaʿqub al-Hadrami",
    riwayat: [
      { id: 17, arabic: "رويس", latin: "Ruways" },
      { id: 18, arabic: "روح", latin: "Rawh" },
    ],
  },
  {
    id: 10,
    arabic: "خلف العاشر",
    latin: "Khalaf al-Ashir",
    riwayat: [
      { id: 19, arabic: "إسحاق", latin: "Ishaq" },
      { id: 20, arabic: "إدريس", latin: "Idris" },
    ],
  },
];

export default function QuranPage() {
  return (
    <main
      dir="rtl"
      className="mx-auto min-h-screen max-w-7xl px-4 py-8 sm:px-6 lg:px-8"
    >
      <header className="mb-8">
        <p dir="ltr" className="text-sm font-medium text-gray-500">
          IRTAKI
        </p>

        <h1 className="mt-2 text-3xl font-bold">القراءات العشر</h1>

        <p dir="ltr" className="mt-3 max-w-3xl text-sm leading-7 text-gray-600">
          Les dix lectures coraniques et leurs vingt riwayat. Le Mushaf
          actuellement disponible est Hafs an Asim.
        </p>
      </header>

      <section aria-labelledby="available-mushaf-title" className="mb-10">
        <Link
          href="/coran/10/page/1"
          className="group block rounded-2xl border-2 border-emerald-600 bg-emerald-50 p-5 shadow-sm transition hover:bg-emerald-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700 sm:p-7"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-emerald-800">
                المصحف المتاح حاليا
              </p>

              <h2
                id="available-mushaf-title"
                className="mt-2 text-2xl font-bold text-gray-900"
              >
                مصحف حفص عن عاصم
              </h2>

              <p dir="ltr" className="mt-2 text-sm text-gray-700">
                Mushaf Hafs an Asim · Riwaya 10
              </p>
            </div>

            <span className="rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white transition group-hover:bg-emerald-800">
              فتح المصحف ←
            </span>
          </div>
        </Link>
      </section>

      <section aria-labelledby="qiraat-list-title">
        <div className="mb-5">
          <h2 id="qiraat-list-title" className="text-2xl font-bold">
            القراءات والروايات
          </h2>

          <p dir="ltr" className="mt-2 text-sm text-gray-500">
            Sélectionnez Hafs pour ouvrir le Mushaf. Les autres riwayat sont
            affichées sans lien tant que leur Mushaf n'est pas disponible dans
            la version actuelle.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {qiraat.map((qiraa) => (
            <article
              key={qiraa.id}
              className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
            >
              <header className="mb-5 flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-lg font-bold text-gray-800">
                  {qiraa.id}
                </span>

                <div className="min-w-0">
                  <h3 className="text-lg font-bold text-gray-900">
                    {qiraa.arabic}
                  </h3>

                  <p dir="ltr" className="mt-1 text-sm text-gray-500">
                    {qiraa.latin}
                  </p>
                </div>
              </header>

              <div className="space-y-3">
                {qiraa.riwayat.map((riwaya) =>
                  "available" in riwaya && riwaya.available ? (
                    <Link
                      key={riwaya.id}
                      href="/coran/10/page/1"
                      className="block rounded-xl border-2 border-emerald-500 bg-emerald-50 p-4 transition hover:border-emerald-700 hover:bg-emerald-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-lg font-bold text-gray-900">
                            {riwaya.arabic}
                          </p>

                          <p dir="ltr" className="mt-1 text-sm text-gray-600">
                            Riwaya {riwaya.id} · {riwaya.latin}
                          </p>
                        </div>

                        <span className="rounded-full bg-emerald-700 px-3 py-1 text-xs font-semibold text-white">
                          متاح
                        </span>
                      </div>

                      <p className="mt-3 text-sm font-semibold text-emerald-900">
                        فتح مصحف حفص عن عاصم ←
                      </p>
                    </Link>
                  ) : (
                    <div
                      key={riwaya.id}
                      className="rounded-xl border border-gray-200 bg-gray-50 p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-lg font-semibold text-gray-800">
                            {riwaya.arabic}
                          </p>

                          <p dir="ltr" className="mt-1 text-sm text-gray-500">
                            Riwaya {riwaya.id} · {riwaya.latin}
                          </p>
                        </div>

                        <span className="text-xs text-gray-500">
                          غير متاح حاليا
                        </span>
                      </div>
                    </div>
                  ),
                )}
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
