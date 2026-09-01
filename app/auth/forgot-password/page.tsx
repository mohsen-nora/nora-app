"use client"

import { useState } from "react"
import Link from "next/link"
import { Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { BrandLockup } from "@/components/brand"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setNotice(null)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password`,
      })
      if (error) throw error
      setNotice("اگر حسابی با این ایمیل وجود داشته باشد، لینک بازیابی رمز عبور برای شما ارسال می‌شود.")
    } catch (err) {
      const status = (err as { status?: number })?.status
      setError(status === 429 ? "تعداد درخواست‌ها زیاد است. لطفاً کمی بعد دوباره تلاش کنید." : "ارسال لینک بازیابی انجام نشد. لطفاً ایمیل را بررسی و دوباره تلاش کنید.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="nora-ambient flex min-h-svh w-full items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center"><BrandLockup subtitle="دستیار هوشمند شخصی" /></div>
        <div className="rounded-2xl border border-border bg-card/60 p-6 backdrop-blur-sm">
          <h1 className="mb-1 text-xl font-bold">بازیابی رمز عبور</h1>
          <p className="mb-6 text-sm text-muted-foreground">ایمیل حساب خود را وارد کنید تا لینک بازیابی برای شما ارسال شود.</p>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="email" className="text-sm font-medium">ایمیل</label>
              <input id="email" type="email" inputMode="email" dir="ltr" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="w-full rounded-xl border border-border bg-background/60 px-3.5 py-2.5 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/40" />
            </div>
            {error ? <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{error}</p> : null}
            {notice ? <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">{notice}</p> : null}
            <button type="submit" disabled={isLoading} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null} ارسال لینک بازیابی
            </button>
            <Link href="/auth/login" className="text-center text-sm font-medium text-accent hover:underline">بازگشت به ورود</Link>
          </form>
        </div>
      </div>
    </main>
  )
}
