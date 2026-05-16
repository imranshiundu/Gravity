import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getAllGravityModuleStatuses } from "@/lib/gravity-module-status"
import { cn } from "@/lib/utils"

type ConnectionState = "connected" | "registered" | "missing" | "planned"

type ModuleStatus = ReturnType<typeof getAllGravityModuleStatuses>["modules"][number]

const stateLabels: Record<ConnectionState, string> = {
  connected: "Connected",
  registered: "Registered",
  missing: "Missing",
  planned: "Planned",
}

const stateBadgeVariant: Record<ConnectionState, "default" | "secondary" | "destructive" | "outline"> = {
  connected: "default",
  registered: "secondary",
  missing: "destructive",
  planned: "outline",
}

const stateDotClass: Record<ConnectionState, string> = {
  connected: "bg-emerald-500",
  registered: "bg-amber-500",
  missing: "bg-destructive",
  planned: "bg-muted-foreground",
}

function getConnectionSummary(modules: ModuleStatus[]) {
  return modules.reduce(
    (summary, module) => {
      summary[module.connectionState] += 1
      return summary
    },
    {
      connected: 0,
      registered: 0,
      missing: 0,
      planned: 0,
    } satisfies Record<ConnectionState, number>
  )
}

function StatusCard({ label, value, tone }: { label: string; value: string | number; tone?: ConnectionState }) {
  return (
    <div className="rounded-xl border bg-card p-4 text-card-foreground">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{label}</p>
        {tone ? <span className={cn("size-2 rounded-full", stateDotClass[tone])} /> : null}
      </div>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  )
}

function ModuleCard({ module }: { module: ModuleStatus }) {
  return (
    <article className="rounded-xl border bg-background p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold">{module.name}</h2>
            <Badge variant={stateBadgeVariant[module.connectionState]}>
              {stateLabels[module.connectionState]}
            </Badge>
            {module.adapter.implemented ? (
              <Badge variant="outline">Adapter implemented</Badge>
            ) : (
              <Badge variant="outline">Adapter pending</Badge>
            )}
          </div>
          <p className="mt-1 break-all text-xs text-muted-foreground">{module.sourcePath}</p>
        </div>
        <div className="rounded-lg border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          {module.interfaceRole}
        </div>
      </div>

      <p className="mt-4 text-sm leading-6 text-muted-foreground">{module.adapter.notes}</p>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Endpoint</p>
          <code className="mt-1 block break-all rounded-lg bg-muted px-3 py-2 text-xs">
            {module.endpoint}
          </code>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Language</p>
          <p className="mt-1 rounded-lg bg-muted px-3 py-2 text-xs">{module.language}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {module.capabilities.map((capability) => (
          <Badge key={capability} variant="ghost" className="border border-border">
            {capability}
          </Badge>
        ))}
      </div>
    </article>
  )
}

export function SystemConnectivityDashboard() {
  const payload = getAllGravityModuleStatuses()
  const summary = getConnectionSummary(payload.modules)
  const implementedAdapters = payload.modules.filter((module) => module.adapter.implemented).length

  return (
    <div className="space-y-4">
      <div className="grid auto-rows-min gap-4 md:grid-cols-4">
        <StatusCard label="Modules tracked" value={payload.modules.length} />
        <StatusCard label="Connected" value={summary.connected} tone="connected" />
        <StatusCard label="Registered" value={summary.registered} tone="registered" />
        <StatusCard label="Missing" value={summary.missing} tone="missing" />
      </div>

      <section className="rounded-xl border bg-background p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold">Gravity system connectivity</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              This page reads the same Gravity module registry used by the API status endpoints. It shows what is actually wired, what is only registered, and what still needs a real adapter.
            </p>
          </div>
          <Button variant="outline" size="sm" render={<a href="/api/modules/status" target="_blank" rel="noreferrer" />}>
            Open raw status
          </Button>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border bg-card p-3">
            <p className="text-xs text-muted-foreground">Implemented adapters</p>
            <p className="mt-1 text-lg font-semibold">{implementedAdapters}</p>
          </div>
          <div className="rounded-lg border bg-card p-3">
            <p className="text-xs text-muted-foreground">Status source</p>
            <p className="mt-1 text-sm font-medium">gravity-module-status.ts</p>
          </div>
          <div className="rounded-lg border bg-card p-3">
            <p className="text-xs text-muted-foreground">Last rendered</p>
            <p className="mt-1 text-sm font-medium">{payload.timestamp}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        {payload.modules.map((module) => (
          <ModuleCard key={module.id} module={module} />
        ))}
      </section>
    </div>
  )
}
