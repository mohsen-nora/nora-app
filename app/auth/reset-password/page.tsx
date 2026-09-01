"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { BrandLockup } from "@/components/brand"

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true)
    })
    supabase.auth.getSession().then(({ data: { session } }) => setReady(Boolean(session)))
    return () => data.subscription.unsubscribe()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setNotice(null)
    if (password.length < 6) return setError("رمز عبور باید حداقل ۶ نویسه باشد.")
    if (password !== confirm) return setError("رمزهای عبور یکسان نیستند.")
    setIsLoading(true)
    try {
      const { error } = await createClient().auth.updateUser({ password })
      if (error) throw error
      setNotice("رمز عبور با موفقیت تغییر کرد. در حال انتقال به صفحه ورود...")
      setTimeout(() => router.push("/auth/login"), 1200)
    } catch (err) {
      setError("تغییر رمز عبور انجام نشد. لطفاً لینک بازیابی را دوباره درخواست کنید.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="nora-ambient flex min-h-svh w-full items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center"><BrandLockup subtitle="دستیار هوشمند شخصی" /></div>
        <div className="rounded-2xl border border-border bg-card/60 p-6 backdrop-blur-sm">
          <h1 className="mb-1 text-xl font-bold">تعیین رمز عبور جدید</h1>
          <p className="mb-6 text-sm text-muted-foreground">رمز عبور جدید خود را وارد کنید.</p>
          {!ready ? <p className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">در حال بررسی لینک بازیابی...</p> : null}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <input aria-label="رمز عبور جدید" type="password" dir="ltr" autoComplete="new-password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="رمز عبور جدید" className="w-full rounded-xl border border-border bg-background/60 px-3.5 py-2.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/40" />
            <input aria-label="تکرار رمز عبور جدید" type="password" dir="ltr" autoComplete="new-password" required minLength={6} value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="تکرار رمز عبور جدید" className="w-full rounded-xl border border-border bg-background/60 px-3.5 py-2.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/40" />
            {error ? <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{error}</p> : null}
            {notice ? <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">{notice}</p> : null}
            <button type="submit" disabled={isLoading || !ready} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null} تغییر رمز عبور
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
