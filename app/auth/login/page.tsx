import { Suspense } from "react"
import { AuthForm } from "@/components/auth-form"
import { BrandLockup } from "@/components/brand"

export default function LoginPage() {
  return (
    <main className="nora-ambient flex min-h-svh w-full items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <BrandLockup subtitle="دستیار هوشمند شخصی" />
        </div>
        <div className="rounded-2xl border border-border bg-card/60 p-6 backdrop-blur-sm">
          <h1 className="mb-1 text-xl font-bold text-balance">خوش آمدید</h1>
          <p className="mb-6 text-sm text-muted-foreground text-pretty">برای دسترسی به نورا وارد حساب خود شوید.</p>
          <Suspense fallback={<div className="h-64" />}>
            <AuthForm mode="login" />
          </Suspense>
        </div>
      </div>
    </main>
  )
}
