"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleReset(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    setLoading(true)
    setMessage("")
    setError("")

    const supabase = createClient()

    const redirectTo =
      `${window.location.origin}/auth/callback?next=/auth/update-password`

    const { error } =
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      })

    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    setMessage(
      "لینک بازیابی رمز عبور به ایمیل شما ارسال شد. لطفاً ایمیل خود را بررسی کنید."
    )
  }

  return (
    <main className="nora-ambient flex min-h-svh w-full items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl border border-border bg-card/60 p-6 backdrop-blur-sm">
          <h1 className="mb-2 text-xl font-bold">
            بازیابی رمز عبور
          </h1>

          <p className="mb-6 text-sm text-muted-foreground">
            ایمیل حساب خود را وارد کنید تا لینک تغییر رمز برای شما ارسال شود.
          </p>

          <form onSubmit={handleReset} className="space-y-4">
            <input
              type="email"
              placeholder="ایمیل"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2"
              required
            />

            {error && (
              <p className="text-sm text-destructive">
                {error}
              </p>
            )}

            {message && (
              <p className="text-sm text-green-600">
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
            >
              {loading
                ? "در حال ارسال..."
                : "ارسال لینک بازیابی"}
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
