import { MainLayout } from "@/components/ui/common";
import { Compass, Sparkles, Target } from "lucide-react";

export default function AboutUsPage() {
  return (
    <MainLayout>
      <section className="relative overflow-hidden bg-slate-50">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-28 top-12 h-72 w-72 rounded-full bg-emerald-200/40 blur-3xl" />
          <div className="absolute -right-20 bottom-0 h-72 w-72 rounded-full bg-teal-200/40 blur-3xl" />
        </div>

        <div className="relative mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
          <div className="rounded-3xl border border-emerald-200/70 bg-gradient-to-br from-emerald-600 to-teal-600 p-6 text-white shadow-xl shadow-emerald-800/20 sm:p-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white/90">
              <Sparkles className="h-3.5 w-3.5" />
              Nền tảng Scan2Order
            </div>
            <h1 className="mt-4 text-2xl font-bold leading-tight sm:text-3xl lg:text-4xl">Về chúng tôi</h1>
            <p className="mt-3 max-w-3xl text-sm text-emerald-50/95 sm:text-base">
              Scan2Order giúp nhà hàng số hóa quy trình gọi món, từ quét QR đến đặt món và thanh toán,
              mang đến trải nghiệm nhanh, minh bạch và tiện lợi cho cả khách hàng lẫn vận hành.
            </p>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <article className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-6">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                <Target className="h-5 w-5" />
              </div>
              <h2 className="mt-4 text-lg font-semibold text-slate-900">Sứ mệnh</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Nâng cấp trải nghiệm ăn uống bằng công nghệ đơn giản, dễ dùng và hiệu quả.
              </p>
            </article>

            <article className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-6">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100 text-teal-700">
                <Compass className="h-5 w-5" />
              </div>
              <h2 className="mt-4 text-lg font-semibold text-slate-900">Tầm nhìn</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Trở thành nền tảng Scan-to-Order được lựa chọn hàng đầu tại Việt Nam.
              </p>
            </article>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-white/90 p-5 text-sm leading-relaxed text-slate-600 shadow-sm sm:p-6">
            Chúng tôi tin rằng một trải nghiệm gọi món tốt không chỉ giúp khách hàng hài lòng hơn, mà còn
            giúp đội ngũ nhà hàng vận hành mượt mà, giảm sai sót và tăng hiệu suất phục vụ.
          </div>
        </div>
      </section>
    </MainLayout>
  );
}
