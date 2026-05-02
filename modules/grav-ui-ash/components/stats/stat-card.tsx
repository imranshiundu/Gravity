import type { ReactNode } from "react"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type StatCardProps = {
  label: string
  icon: ReactNode
  value: ReactNode
  valueClassName?: string
  footer: ReactNode
  density?: "default" | "compact"
}

export function StatCard({
  label,
  icon,
  value,
  valueClassName,
  footer,
  density = "default",
}: StatCardProps) {
  return (
    <Card
      className={cn(
        "gap-0 rounded-2xl border bg-muted/40 shadow-none ring-0 dark:bg-muted/25",
        density === "compact" ? "p-1" : "p-1.5"
      )}
    >
      <CardHeader
        className={cn("px-2 pt-1", density === "compact" ? "pb-1.5" : "pb-2")}
      >
        <div className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {icon}
          {label}
        </div>
      </CardHeader>
      <CardContent
        className={cn(
          "rounded-[calc(var(--radius-2xl)-6px)] border border-border bg-card",
          density === "compact"
            ? "space-y-1.5 px-3 py-2.5"
            : "space-y-3 px-5 py-4"
        )}
      >
        <p
          className={cn(
            density === "compact"
              ? "text-lg leading-6 font-medium text-foreground"
              : "text-3xl leading-8 font-medium text-foreground",
            valueClassName
          )}
        >
          {value}
        </p>
        {footer}
      </CardContent>
    </Card>
  )
}
