"use client"

import type React from "react"
import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

type Mode = "login" | "sign-up"

function authErrorMessage(error: unknown): string {
  const { code, status } = (error ?? {}) as {
    code?: string
    status?: number
  }

  if (code === "email_not_confirmed") {
    return "لطفاً ابتدا ایمیل خود را تأیید کنید."
  }

  if (
    code === "over_request_rate_limit" ||
    code === "over_email_send_rate_limit" ||
    status === 429
  ) {
    return "تلاش‌های زیادی انجام شده است. لطفاً کمی صبر کنید و دوباره تلاش کنید."
  }

  if (code === "weak_password") {
    return "رمز عبور ضعیف است. حداقل ۶ نویسه انتخاب کنید."
  }

  if (code === "invalid_credentials") {
    return "ایمیل یا رمز عبور نادرست است."
  }

  if (code === "user_already_exists" || code === "email_exists") {
    return "حسابی با این ایمیل از قبل وجود دارد."
  }

  return "مشکلی پیش آمد. لطفاً دوباره تلاش کنید."
}

export function AuthForm({ mode }: { mode: Mode }) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get("next") ?? "/dashboard"

  const isLogin = mode === "login"

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const supabase = createClient()

    setIsLoading(true)
    setError(null)
    setNotice(null)

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) throw error

        router.push(next)
        router.refresh()
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo:
              process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ??
              `${window.location.origin}/auth/callback`,
          },
        })

        if (error) throw error

        setNotice(
          "حساب شما ساخته شد. برای فعال‌سازی، پیوند تأیید ارسال‌شده به ایمیل خود را باز کنید."
        )
      }
    } catch (error) {
      console.error("[v0] auth error:", error)
      setError(authErrorMessage(error))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label htmlFor="email" className="text-sm font-medium">
          ایمیل
        </label>

        <input
          id="email"
          type="email"
          inputMode="email"
          dir="ltr"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full rounded-xl border border-border bg-background/60 px-3.5 py-2.5 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/40"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="password" className="text-sm font-medium">
          رمز عبور
        </label>

        <input
          id="password"
          type="password"
          dir="ltr"
          autoComplete={isLogin ? "current-password" : "new-password"}
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          className="w-full rounded-xl border border-border bg-background/60 px-3.5 py-2.5 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/40"
        />
      </div>

      {isLogin ? (
        <div className="text-right">
          <Link
            href="/auth/forgot-password"
            className="text-sm font-medium text-accent underline-offset-4 hover:underline"
          >
            رمز عبور را فراموش کرده‌اید؟
          </Link>
        </div>
      ) : null}

      {error ? (
        <p
          role="alert"
          className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200"
        >
          {error}
        </p>
      ) : null}

      {notice ? (
        <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
          {notice}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isLoading}
        className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
      >
        {isLoading ? (
          <Loader2
            className="h-4 w-4 animate-spin"
            aria-hidden="true"
          />
        ) : null}

        {isLogin ? "ورود به حساب" : "ساخت حساب"}
      </button>

      <p className="text-center text-sm text-muted-foreground">
        {isLogin
          ? "حساب کاربری ندارید؟ "
          : "قبلاً ثبت‌نام کرده‌اید؟ "}

        <Link
          href={isLogin ? "/auth/sign-up" : "/auth/login"}
          className="font-medium text-accent underline-offset-4 hover:underline"
        >
          {isLogin ? "ثبت‌نام" : "ورود"}
        </Link>
      </p>
    </form>
  )
}
