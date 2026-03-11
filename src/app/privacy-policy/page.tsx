import { MainLayout } from "@/components/ui/common";
import { Database, Lock, ShieldCheck } from "lucide-react";

export default function PrivacyPolicyPage() {
  return (
    <MainLayout>
      <section className="relative overflow-hidden bg-slate-50">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute right-0 top-6 h-80 w-80 rounded-full bg-cyan-200/40 blur-3xl" />
          <div className="absolute left-0 bottom-2 h-64 w-64 rounded-full bg-sky-200/40 blur-3xl" />
        </div>

        <div className="relative mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
          <div className="rounded-3xl border border-sky-200/80 bg-gradient-to-br from-sky-700 via-sky-600 to-cyan-600 p-6 text-white shadow-xl shadow-sky-900/20 sm:p-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white/90">
              <ShieldCheck className="h-3.5 w-3.5" />
              Bảo mật dữ liệu
            </div>
            <h1 className="mt-4 text-2xl font-bold leading-tight sm:text-3xl lg:text-4xl">Chính sách và bảo mật</h1>
            <p className="mt-3 max-w-3xl text-sm text-sky-50/95 sm:text-base">
              Chúng tôi cam kết bảo vệ dữ liệu người dùng, chỉ thu thập thông tin cần thiết để vận hành
              dịch vụ và không chia sẻ trái phép cho bên thứ ba.
            </p>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
                <Database className="h-5 w-5" />
              </div>
              <h2 className="mt-4 text-lg font-semibold text-slate-900">Dữ liệu được thu thập</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Thông tin liên hệ, lịch sử đơn hàng và các dữ liệu kỹ thuật cần thiết để cải thiện trải
                nghiệm sử dụng.
              </p>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-100 text-cyan-700">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h2 className="mt-4 text-lg font-semibold text-slate-900">Mục đích sử dụng</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Vận hành dịch vụ, xử lý đơn hàng, hỗ trợ khách hàng và nâng cao chất lượng sản phẩm.
              </p>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
                <Lock className="h-5 w-5" />
              </div>
              <h2 className="mt-4 text-lg font-semibold text-slate-900">Bảo mật thông tin</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Hệ thống áp dụng các biện pháp kỹ thuật và quy trình nội bộ để bảo vệ dữ liệu khỏi truy
                cập trái phép.
              </p>
            </article>
          </div>

          <p className="mt-5 text-xs text-slate-500">
            Nếu bạn có câu hỏi về quyền riêng tư hoặc cần hỗ trợ liên quan đến dữ liệu cá nhân, vui lòng
            liên hệ đội ngũ Scan2Order qua kênh hỗ trợ chính thức.
          </p>
        </div>
      </section>
    </MainLayout>
  );
}
