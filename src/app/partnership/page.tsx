import { MainLayout } from "@/components/ui/common";
import { ArrowUpRight, Handshake, Store } from "lucide-react";

export default function PartnershipPage() {
  return (
    <MainLayout>
      <section className="relative overflow-hidden bg-slate-50">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-24 top-8 h-72 w-72 rounded-full bg-amber-200/40 blur-3xl" />
          <div className="absolute -right-24 bottom-8 h-72 w-72 rounded-full bg-emerald-200/40 blur-3xl" />
        </div>

        <div className="relative mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
          <div className="rounded-3xl border border-amber-200/80 bg-gradient-to-br from-amber-500 to-emerald-600 p-6 text-white shadow-xl shadow-amber-900/20 sm:p-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white/90">
              <Handshake className="h-3.5 w-3.5" />
              Cơ hội hợp tác
            </div>
            <h1 className="mt-4 text-2xl font-bold leading-tight sm:text-3xl lg:text-4xl">Hợp tác cùng Scan2Order</h1>
            <p className="mt-3 max-w-3xl text-sm text-amber-50/95 sm:text-base">
              Chúng tôi luôn tìm kiếm đối tác nhà hàng, vận hành và công nghệ để cùng xây dựng hệ sinh
              thái đặt món thông minh và bền vững.
            </p>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                <Store className="h-5 w-5" />
              </div>
              <h2 className="mt-4 text-lg font-semibold text-slate-900">Dành cho nhà hàng</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Tối ưu quy trình phục vụ, tăng hiệu quả vận hành và nâng cao trải nghiệm khách hàng tại bàn.
              </p>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                <Handshake className="h-5 w-5" />
              </div>
              <h2 className="mt-4 text-lg font-semibold text-slate-900">Dành cho đối tác công nghệ</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Kết nối giải pháp để mở rộng giá trị hệ sinh thái và tạo ra sản phẩm bền vững cho thị trường.
              </p>
            </article>
          </div>

          <div className="mt-5 rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm sm:p-6">
            <p className="text-sm text-slate-600">
              Sẵn sàng bắt đầu? Truy cập website chính thức để gửi thông tin hợp tác và nhận tư vấn từ đội ngũ.
            </p>
            <a
              href="https://scan2order.id.vn"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              Truy cập scan2order.id.vn
              <ArrowUpRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>
    </MainLayout>
  );
}
