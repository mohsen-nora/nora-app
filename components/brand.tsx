import { cn } from "@/lib/utils"

export function NoraMark({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-lg shadow-primary/25",
        className,
      )}
      aria-hidden="true"
    >
      <span className="font-mono text-lg font-bold leading-none">N</span>
    </div>
  )
}

export function BrandLockup({ subtitle }: { subtitle?: string }) {
  return (
    <div className="flex items-center gap-3">
      <NoraMark />
      <div className="flex flex-col">
        <span className="text-lg font-bold tracking-tight">نورا</span>
        {subtitle ? <span className="text-xs text-muted-foreground">{subtitle}</span> : null}
      </div>
    </div>
  )
}
