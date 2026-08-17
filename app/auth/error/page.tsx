import Link from "next/link"
import { AlertTriangle } from "lucide-react"

export default function AuthErrorPage() {
  return (
    <main className="nora-ambient flex min-h-svh w-full items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card/60 p-8 text-center backdrop-blur-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/15 text-rose-300">
          <AlertTriangle className="h-6 w-6" aria-hidden="true" />
        </div>
        <h1 className="text-lg font-semibold text-balance">خطا در احراز هویت</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">
          متأسفانه ورود شما تکمیل نشد. ممکن است پیوند منقضی شده باشد. لطفاً دوباره تلاش کنید.
        </p>
        <Link
          href="/auth/login"
          className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
        >
          بازگشت به صفحه ورود
        </Link>
      </div>
    </main>
  )
}
