import type React from "react"
import Link from "next/link"
import { LayoutDashboard, LogOut, MessageSquare, ShieldCheck } from "lucide-react"
import { NoraMark } from "@/components/brand"
import { roleLabel } from "@/lib/format"

export function AppShell({
  children,
  email,
  role,
  isOwner,
  active,
}: {
  children: React.ReactNode
  email?: string | null
  role?: string | null
  isOwner: boolean
  active: "dashboard" | "chat" | "owner"
}) {
  return (
    <div className="nora-ambient min-h-svh">
      <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <NoraMark className="h-9 w-9 rounded-xl" />
            <span className="text-base font-bold tracking-tight">نورا</span>
          </Link>

          <div className="flex items-center gap-1.5">
            <NavLink href="/dashboard" active={active === "dashboard"}>
              <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">داشبورد</span>
            </NavLink>
            <NavLink href="/chat" active={active === "chat"}>
              <MessageSquare className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">گفتگو</span>
            </NavLink>
            {isOwner ? (
              <NavLink href="/owner" active={active === "owner"}>
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">پنل مالک</span>
              </NavLink>
            ) : null}

            <form action="/auth/sign-out" method="post">
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">خروج</span>
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-6">
        <div className="mb-5 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          {email ? (
            <span dir="ltr" className="font-mono text-xs">
              {email}
            </span>
          ) : null}
          {role ? (
            <span className="rounded-full border border-border px-2 py-0.5 text-xs">{roleLabel(role)}</span>
          ) : null}
        </div>
        {children}
      </div>
    </div>
  )
}

function NavLink({
  href,
  active,
  children,
}: {
  href: string
  active: boolean
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={
        active
          ? "inline-flex items-center gap-1.5 rounded-xl bg-primary/15 px-3 py-2 text-sm font-medium text-primary-foreground ring-1 ring-primary/30 [--tw-text-opacity:1] text-foreground"
          : "inline-flex items-center gap-1.5 rounded-xl border border-transparent px-3 py-2 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground"
      }
    >
      {children}
    </Link>
  )
}
