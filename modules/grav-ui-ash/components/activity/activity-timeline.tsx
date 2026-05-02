"use client"

import { IconTicket } from "@tabler/icons-react"

import { customerActivityToneSurfaceClassName } from "@/lib/customers/presentation"
import { cn } from "@/lib/utils"

export type ActivityTimelineTone =
  | "neutral"
  | "warning"
  | "success"
  | "positive"

export type ActivityTimelineItem = {
  id: string
  title: string
  timestamp: string
  tone?: ActivityTimelineTone
  detail?: string
}

type ActivityTimelineVariant = "default" | "compact"

const defaultToneClassName: Record<ActivityTimelineTone, string> = {
  neutral: customerActivityToneSurfaceClassName.neutral,
  warning: customerActivityToneSurfaceClassName.warning,
  success: customerActivityToneSurfaceClassName.positive,
  positive: customerActivityToneSurfaceClassName.positive,
}

function ActivityTimelineEventCard({
  item,
  className,
}: {
  item: ActivityTimelineItem
  className?: string
}) {
  const toneClassName = defaultToneClassName[item.tone ?? "neutral"]

  return (
    <div className={cn("flex gap-3", className)}>
      <div
        className={cn(
          "mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full border",
          toneClassName
        )}
      >
        <IconTicket className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-semibold text-foreground">{item.title}</span>
          <span className="text-muted-foreground">{item.timestamp}</span>
        </div>
        {item.detail ? (
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {item.detail}
          </p>
        ) : null}
      </div>
    </div>
  )
}

function ActivityTimelineCompactRow({
  item,
  isLast,
}: {
  item: ActivityTimelineItem
  isLast: boolean
}) {
  return (
    <div className="grid h-fit grid-cols-[2rem_1fr] gap-3 py-0">
      <div className="flex flex-col items-center">
        <span
          className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-muted-foreground"
        >
          <IconTicket className="size-3.5" />
        </span>
        {!isLast ? <span className="mt-1 h-full min-h-8 w-px bg-border" /> : null}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
        {item.detail ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{item.detail}</p>
        ) : null}
        <p className="text-xs text-muted-foreground">{item.timestamp}</p>
      </div>
    </div>
  )
}

export function ActivityTimelineList({
  items,
  variant = "default",
  className,
}: {
  items: ActivityTimelineItem[]
  variant?: ActivityTimelineVariant
  className?: string
}) {
  if (variant === "compact") {
    return (
      <div className={cn(className)}>
        {items.map((item, itemIndex) => (
          <ActivityTimelineCompactRow
            key={item.id}
            item={item}
            isLast={itemIndex === items.length - 1}
          />
        ))}
      </div>
    )
  }

  return (
    <div className={cn("space-y-8", className)}>
      {items.map((item) => (
        <ActivityTimelineEventCard key={item.id} item={item} />
      ))}
    </div>
  )
}

export function ActivityTimelineEventItem({
  item,
  variant = "default",
  isLast = false,
  className,
}: {
  item: ActivityTimelineItem
  variant?: ActivityTimelineVariant
  isLast?: boolean
  className?: string
}) {
  if (variant === "compact") {
    return (
      <div className={className}>
        <ActivityTimelineCompactRow item={item} isLast={isLast} />
      </div>
    )
  }

  return <ActivityTimelineEventCard item={item} className={className} />
}
