import { SystemAuditPanel } from "@/components/system-audit-panel"
import { Badge } from "@/components/ui/badge"
import { getGravityCoreSkills, runGravityCoreTool } from "@/lib/gravity-core-client"
import { getAllGravityModuleStatuses } from "@/lib/gravity-module-status"
import { cn } from "@/lib/utils"

type ConnectionState = "connected" | "registered" | "missing" | "planned"

type ModuleStatus = ReturnType<typeof getAllGravityModuleStatuses>["modules"][number]

type InventorySource = {
  sourcePath?: string
  sourceState?: string
  scannedFiles?: number
  manifests?: string[]
  routes?: string[]
  cliEntrypoints?: string[]
  toolFiles?: string[]
  httpClients?: string[]
  configFiles?: string[]
  docs?: string[]
  routeHints?: string[]
  manifestSignals?: string[]
  warnings?: string[]
}

type InventoryModule = {
  id?: string
  title?: string
  role?: string
  sourceState?: string
  sourcePaths?: string[]
  coreBinding?: Record<string, unknown>
  service?: {
    envName?: string
    configured?: boolean
    baseUrl?: string
    defaultRoutes?: string[]
  }
  expectedCapabilities?: string[]
  dangerousActions?: string[]
  totals?: Record<string, number>
  sources?: InventorySource[]
}

type CoreTool = {
  name?: string
  title?: string
  description?: string
  moduleId?: string
  risk?: string
  requiresApproval?: boolean
}

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

function asRecord(input: unknown): Record<string, unknown> {
  return input && typeof input === "object" ? (input as Record<string, unknown>) : {}
}

function asArray<T = unknown>(input: unknown): T[] {
  return Array.isArray(input) ? (input as T[]) : []
}

function asString(input: unknown, fallback = "") {
  return typeof input === "string" ? input : fallback
}

function asBoolean(input: unknown) {
  return input === true
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

function extractInventoryModules(payload: unknown) {
  const root = asRecord(payload)
  const data = asRecord(root.data)
  return asArray<InventoryModule>(data.modules)
}

function extractCoreTools(payload: unknown) {
  return asArray<CoreTool>(asRecord(payload).tools)
}

function getToolsForModule(tools: CoreTool[], moduleId: string) {
  return tools.filter((tool) => tool.moduleId === moduleId || tool.name?.startsWith(`${moduleId}.`))
}

function getRiskVariant(risk?: string): "default" | "secondary" | "destructive" | "outline" {
  if (risk === "dangerous") return "destructive"
  if (risk === "medium") return "secondary"
  if (risk === "safe") return "outline"
  return "outline"
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

function TinyList({ items, empty, limit = 6 }: { items?: string[]; empty: string; limit?: number }) {
  const visible = (items || []).filter(Boolean).slice(0, limit)

  if (!visible.length) {
    return <p className="text-xs text-muted-foreground">{empty}</p>
  }

  return (
    <ul className="space-y-1">
      {visible.map((item) => (
        <li key={item} className="break-all rounded-md bg-muted/60 px-2 py-1 font-mono text-[11px] text-muted-foreground">
          {item}
        </li>
      ))}
      {(items?.length || 0) > limit ? (
        <li className="text-[11px] text-muted-foreground">+{(items?.length || 0) - limit} more</li>
      ) : null}
    </ul>
  )
}

function ModuleRouteMatrixCard({ module, tools }: { module: InventoryModule; tools: CoreTool[] }) {
  const moduleId = asString(module.id, "unknown")
  const moduleTools = getToolsForModule(tools, moduleId)
  const totals = module.totals || {}
  const serviceConfigured = module.service ? asBoolean(module.service.configured) : undefined

  return (
    <article className="rounded-xl border bg-background p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold">{module.title || moduleId}</h3>
            <Badge variant={module.sourceState === "available" ? "default" : "destructive"}>
              source {module.sourceState || "unknown"}
            </Badge>
            {module.service ? (
              <Badge variant={serviceConfigured ? "default" : "secondary"}>
                {module.service.envName}: {serviceConfigured ? "configured" : "missing"}
              </Badge>
            ) : (
              <Badge variant="outline">no external service env</Badge>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Role: {module.role || "unknown"}</p>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center text-xs sm:min-w-80">
          <div className="rounded-lg border bg-muted/30 p-2">
            <p className="font-semibold">{totals.scannedFiles || 0}</p>
            <p className="text-muted-foreground">files</p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-2">
            <p className="font-semibold">{totals.routes || 0}</p>
            <p className="text-muted-foreground">routes</p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-2">
            <p className="font-semibold">{moduleTools.length}</p>
            <p className="text-muted-foreground">Core tools</p>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <div className="rounded-lg border p-3">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Core binding</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(module.coreBinding || {}).map(([key, value]) => (
              <Badge key={key} variant="outline">
                {key}: {String(value)}
              </Badge>
            ))}
          </div>
        </div>

        <div className="rounded-lg border p-3">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Expected capabilities</p>
          <div className="flex flex-wrap gap-2">
            {(module.expectedCapabilities || []).map((capability) => (
              <Badge key={capability} variant="ghost" className="border border-border">
                {capability}
              </Badge>
            ))}
          </div>
        </div>

        <div className="rounded-lg border p-3">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Dangerous actions</p>
          <div className="flex flex-wrap gap-2">
            {(module.dangerousActions || []).length ? (
              module.dangerousActions?.map((action) => (
                <Badge key={action} variant="destructive">
                  {action}
                </Badge>
              ))
            ) : (
              <p className="text-xs text-muted-foreground">No dangerous action registered.</p>
            )}
          </div>
        </div>
      </div>

      {module.service ? (
        <div className="mt-3 rounded-lg border p-3">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Service routes</p>
          <div className="flex flex-wrap gap-2">
            {(module.service.defaultRoutes || []).map((route) => (
              <code key={route} className="rounded-md bg-muted px-2 py-1 text-xs">
                {route}
              </code>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-3 rounded-lg border p-3">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Tools exposed through Core</p>
        {moduleTools.length ? (
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {moduleTools.map((tool) => (
              <div key={tool.name} className="rounded-lg border bg-muted/20 p-2">
                <div className="flex flex-wrap items-center gap-2">
                  <code className="text-xs font-medium">{tool.name}</code>
                  <Badge variant={getRiskVariant(tool.risk)}>{tool.risk || "unknown"}</Badge>
                  {tool.requiresApproval ? <Badge variant="destructive">approval</Badge> : null}
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{tool.description}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No Core tools listed for this module yet.</p>
        )}
      </div>

      <div className="mt-3 grid gap-3 xl:grid-cols-2">
        {(module.sources || []).map((source) => (
          <div key={source.sourcePath} className="rounded-lg border p-3">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <code className="break-all text-xs font-medium">{source.sourcePath}</code>
              <Badge variant={source.sourceState === "available" ? "outline" : "destructive"}>
                {source.sourceState || "unknown"}
              </Badge>
              <Badge variant="outline">{source.scannedFiles || 0} scanned</Badge>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">Route hints</p>
                <TinyList items={source.routeHints} empty="No route hints discovered." />
              </div>
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">Manifests</p>
                <TinyList items={source.manifests} empty="No manifests discovered." />
              </div>
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">CLI entrypoints</p>
                <TinyList items={source.cliEntrypoints} empty="No CLI entrypoints discovered." />
              </div>
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">Tool files</p>
                <TinyList items={source.toolFiles} empty="No tool files discovered." />
              </div>
            </div>

            {source.warnings?.length ? (
              <div className="mt-3 rounded-lg border border-destructive/20 bg-destructive/5 p-2">
                <p className="mb-1 text-xs font-medium text-destructive">Warnings</p>
                <TinyList items={source.warnings} empty="No warnings." limit={4} />
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </article>
  )
}

export async function SystemConnectivityDashboard() {
  const payload = getAllGravityModuleStatuses()
  const summary = getConnectionSummary(payload.modules)
  const implementedAdapters = payload.modules.filter((module) => module.adapter.implemented).length

  const [inventoryResult, skillsResult] = await Promise.all([
    runGravityCoreTool({ toolName: "modules.inventory", input: { includeRoutes: true } }),
    getGravityCoreSkills(),
  ])

  const inventoryModules = inventoryResult.ok ? extractInventoryModules(inventoryResult.payload) : []
  const coreTools = skillsResult.ok || skillsResult.payload ? extractCoreTools(skillsResult.payload) : []
  const envBackedModules = inventoryModules.filter((module) => module.service).length
  const configuredEnvModules = inventoryModules.filter((module) => module.service?.configured).length

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
              This page now reads the Core tool bus and the universal module inventory. It shows what Gravity can actually see, which tools are callable, which routes were discovered, and which services still need env URLs before they can be used.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              className="inline-flex h-8 shrink-0 items-center justify-center rounded-4xl border border-border bg-background px-3 text-sm font-medium hover:bg-muted hover:text-foreground"
              href="/api/core/status"
              target="_blank"
              rel="noreferrer"
            >
              Open Core status
            </a>
            <a
              className="inline-flex h-8 shrink-0 items-center justify-center rounded-4xl border border-border bg-background px-3 text-sm font-medium hover:bg-muted hover:text-foreground"
              href="/api/core/tools"
              target="_blank"
              rel="noreferrer"
            >
              Open Core tools
            </a>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <div className="rounded-lg border bg-card p-3">
            <p className="text-xs text-muted-foreground">Implemented adapters</p>
            <p className="mt-1 text-lg font-semibold">{implementedAdapters}</p>
          </div>
          <div className="rounded-lg border bg-card p-3">
            <p className="text-xs text-muted-foreground">Core tools exposed</p>
            <p className="mt-1 text-lg font-semibold">{coreTools.length}</p>
          </div>
          <div className="rounded-lg border bg-card p-3">
            <p className="text-xs text-muted-foreground">Env-backed modules</p>
            <p className="mt-1 text-lg font-semibold">
              {configuredEnvModules}/{envBackedModules}
            </p>
          </div>
          <div className="rounded-lg border bg-card p-3">
            <p className="text-xs text-muted-foreground">Last rendered</p>
            <p className="mt-1 text-sm font-medium">{payload.timestamp}</p>
          </div>
        </div>

        {!inventoryResult.ok ? (
          <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-muted-foreground">
            Core module inventory is not available from the web process right now: {inventoryResult.error || "GRAVITY_CORE_BASE_URL is not configured or Core rejected the tool call."}
          </div>
        ) : null}
      </section>

      {inventoryModules.length ? (
        <section className="space-y-3 rounded-xl border bg-background p-5">
          <div>
            <h2 className="text-lg font-semibold">Core module route matrix</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Built from `modules.inventory` and `/skills`. This is the current truth of module source, service envs, Core tools, route hints, CLI entrypoints, and dangerous actions.
            </p>
          </div>

          <div className="grid gap-4">
            {inventoryModules.map((module) => (
              <ModuleRouteMatrixCard key={module.id || module.title} module={module} tools={coreTools} />
            ))}
          </div>
        </section>
      ) : null}

      <SystemAuditPanel />

      <section className="space-y-3 rounded-xl border bg-background p-5">
        <div>
          <h2 className="text-lg font-semibold">Web registry fallback</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            This older registry remains visible so missing Core configuration is obvious. The route matrix above is the preferred source when Core is running.
          </p>
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          {payload.modules.map((module) => (
            <ModuleCard key={module.id} module={module} />
          ))}
        </div>
      </section>
    </div>
  )
}