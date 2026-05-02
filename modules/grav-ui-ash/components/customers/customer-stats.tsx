import {
  IconAlertTriangle,
  IconArrowDownRight,
  IconArrowUpRight,
  IconClockExclamation,
  IconHeartHandshake,
  IconMinus,
  IconUsers,
} from "@tabler/icons-react"

import { StatCard } from "@/components/stats/stat-card"

export type CustomerMetricTrend = "up" | "down" | "flat"

export type CustomerMetric = {
  key: string
  label: string
  value: string
  trend: CustomerMetricTrend
  deltaLabel: string
  comparison: string
}

type CustomerStatsProps = {
  metrics: CustomerMetric[]
}

const preferredTrendByKey: Record<string, CustomerMetricTrend> = {
  total: "up",
  risk: "down",
  load: "down",
  csat: "up",
}

function CustomerStatTrendRow({ metric }: { metric: CustomerMetric }) {
  const isFlat = metric.trend === "flat"
  const isImproved = preferredTrendByKey[metric.key] === metric.trend

  const trendClassName = isFlat
    ? "text-muted-foreground"
    : isImproved
      ? "text-emerald-600"
      : "text-rose-600"

  return (
    <div className={`flex items-center gap-1 text-xs font-medium ${trendClassName}`}>
      {metric.trend === "up" ? (
        <IconArrowUpRight className="size-3.5" />
      ) : metric.trend === "down" ? (
        <IconArrowDownRight className="size-3.5" />
      ) : (
        <IconMinus className="size-3.5" />
      )}
      <span>{metric.deltaLabel}</span>
      <span className="text-muted-foreground">{metric.comparison}</span>
    </div>
  )
}

export function CustomerStats({ metrics }: CustomerStatsProps) {
  const iconByKey: Record<string, typeof IconUsers> = {
    total: IconUsers,
    risk: IconAlertTriangle,
    load: IconClockExclamation,
    csat: IconHeartHandshake,
  }

  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => {
        const LeadIcon = iconByKey[metric.key] ?? IconUsers

        return (
          <StatCard
            key={metric.key}
            icon={<LeadIcon className="size-3.5" />}
            label={metric.label}
            value={metric.value}
            footer={<CustomerStatTrendRow metric={metric} />}
          />
        )
      })}
    </section>
  )
}
