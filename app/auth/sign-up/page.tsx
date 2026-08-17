import { Suspense } from "react"
import { AuthForm } from "@/components/auth-form"
import { BrandLockup } from "@/components/brand"

export default function SignUpPage() {
  return (
    <main className="nora-ambient flex min-h-svh w-full items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <BrandLockup subtitle="دستیار هوشمند شخصی" />
        </div>
        <div className="rounded-2xl border border-border bg-card/60 p-6 backdrop-blur-sm">
          <h1 className="mb-1 text-xl font-bold text-balance">ساخت حساب کاربری</h1>
          <p className="mb-6 text-sm text-muted-foreground text-pretty">
            برای شروع گفتگو با نورا یک حساب بسازید.
          </p>
          <Suspense fallback={<div className="h-64" />}>
            <AuthForm mode="sign-up" />
          </Suspense>
        </div>
      </div>
    </main>
  )
}
