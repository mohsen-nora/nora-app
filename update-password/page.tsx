"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

export default function UpdatePasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleUpdatePassword(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault()
    setError("")
    setMessage("")

    if (password.length < 6) {
      setError("رمز عبور باید حداقل ۶ کاراکتر باشد.")
      return
    }

    if (password !== confirmPassword) {
      setError("رمزهای عبور یکسان نیستند.")
      return
    }

    setLoading(true)

    const supabase = createClient()

    const { error } = await supabase.auth.updateUser({
      password,
    })

    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    setMessage("رمز عبور با موفقیت تغییر کرد.")

    setTimeout(() => {
      router.push("/auth/login")
    }, 1500)
  }

  return (
    <main className="nora-ambient flex min-h-svh w-full items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl border border-border bg-card/60 p-6 backdrop-blur-sm">
          <h1 className="mb-2 text-xl font-bold">
            تغییر رمز عبور
          </h1>

          <p className="mb-6 text-sm text-muted-foreground">
            رمز عبور جدید خود را وارد کنید.
          </p>

          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <input
              type="password"
              placeholder="رمز عبور جدید"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2"
              required
            />

            <input
              type="password"
              placeholder="تکرار رمز عبور"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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
              {loading ? "در حال تغییر..." : "تغییر رمز عبور"}
            </button>
          </form>
        </div>
      </div>
    </main>
  )
      }
