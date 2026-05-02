export type GravRouteIconKey =
  | "assistant"
  | "runtime"
  | "memory"
  | "system"
  | "security"
  | "automation"
  | "settings"
  | "inbox"
  | "tickets"
  | "customers"
  | "accounts"
  | "internal-notes"
  | "knowledge-base"
  | "macros"

export type GravTemplateMetricTone = "default" | "positive" | "warning"

export type GravTemplateMetric = {
  label: string
  value: string
  tone?: GravTemplateMetricTone
}

export type GravSidebarPreviewItem = {
  title: string
  subject: string
  date: string
  teaser: string
}

export type GravRoute = {
  title: string
  path: string
  description: string
  icon: GravRouteIconKey
  templateMetrics: GravTemplateMetric[]
  sidebarPreview: GravSidebarPreviewItem[]
}

export const gravNavigationRoutes: GravRoute[] = [
  {
    title: "Assistant",
    path: "/assistant",
    description: "One Grav conversation surface for your local models, tools, and future module actions.",
    icon: "assistant",
    templateMetrics: [
      { label: "Primary runtime", value: "Ollama" },
      { label: "Connection mode", value: "External bridge", tone: "positive" },
      { label: "Interface count", value: "1" },
    ],
    sidebarPreview: [
      {
        title: "Unified chat",
        subject: "One interface, one assistant",
        date: "Now",
        teaser: "Grav handles the conversation while Gravity routes the engine calls behind the scenes.",
      },
      {
        title: "Model selection",
        subject: "External Ollama runtime",
        date: "Today",
        teaser: "Choose a local model exposed by Ollama without embedding Ollama’s own UI.",
      },
    ],
  },
  {
    title: "Runtime",
    path: "/runtime",
    description: "Engine inventory, model availability, and runtime connectivity status.",
    icon: "runtime",
    templateMetrics: [
      { label: "Engine bridge", value: "Ollama REST" },
      { label: "UI owner", value: "Gravity", tone: "positive" },
      { label: "Duplicate frontends", value: "0" },
    ],
    sidebarPreview: [
      {
        title: "Runtime bridge",
        subject: "Connect, do not embed",
        date: "Now",
        teaser: "Gravity talks to Ollama as an engine endpoint instead of inheriting its separate interface.",
      },
    ],
  },
  {
    title: "Memory",
    path: "/memory",
    description: "Long-term recall, summaries, artifacts, and knowledge retrieval.",
    icon: "memory",
    templateMetrics: [
      { label: "Memory layer", value: "MemPalace" },
      { label: "Session carryover", value: "Planned", tone: "warning" },
      { label: "Retrieval path", value: "Unified" },
    ],
    sidebarPreview: [
      {
        title: "Durable recall",
        subject: "Cross-session memory",
        date: "Soon",
        teaser: "Gravity will keep decisions, project context, and artifacts available to Grav across sessions.",
      },
    ],
  },
  {
    title: "Automation",
    path: "/automation",
    description: "Rules, workflows, and future multi-step module orchestration.",
    icon: "automation",
    templateMetrics: [
      { label: "Workflow fabric", value: "Growing" },
      { label: "Module orchestration", value: "Planned" },
      { label: "Background jobs", value: "Next", tone: "warning" },
    ],
    sidebarPreview: [
      {
        title: "Module orchestration",
        subject: "One system workflow layer",
        date: "Today",
        teaser: "Automation will coordinate coding, memory, security, and system actions through Gravity contracts.",
      },
    ],
  },
  {
    title: "System",
    path: "/system",
    description: "Host actions, shell tools, runtime health, and local operations.",
    icon: "system",
    templateMetrics: [
      { label: "Host scope", value: "Local-first" },
      { label: "Tool approval", value: "Unified" },
      { label: "Runtime health", value: "Tracked" },
    ],
    sidebarPreview: [
      {
        title: "Host control",
        subject: "Local operations",
        date: "Soon",
        teaser: "System mode will become the one place for scripts, commands, and machine actions approved through Gravity.",
      },
    ],
  },
  {
    title: "Security",
    path: "/security",
    description: "Defensive security checks, audits, and bounded operational tooling.",
    icon: "security",
    templateMetrics: [
      { label: "Security module", value: "ODK" },
      { label: "Mode", value: "Defensive" },
      { label: "Direct UI", value: "Gravity", tone: "positive" },
    ],
    sidebarPreview: [
      {
        title: "Bounded security",
        subject: "One operator surface",
        date: "Soon",
        teaser: "Security capabilities will appear inside Gravity instead of running as a separate dashboard experience.",
      },
    ],
  },
  {
    title: "Settings",
    path: "/settings",
    description: "Gravity-wide configuration for runtimes, policies, and module behavior.",
    icon: "settings",
    templateMetrics: [
      { label: "Interface owner", value: "Gravity" },
      { label: "Ollama URL", value: "Env-driven" },
      { label: "Module registry", value: "Active", tone: "positive" },
    ],
    sidebarPreview: [
      {
        title: "System configuration",
        subject: "Runtime and policy setup",
        date: "Today",
        teaser: "Runtime endpoints, memory adapters, and module policies should all live behind one settings surface.",
      },
    ],
  },
]

const gravLegacyRoutes: GravRoute[] = [
  {
    title: "Inbox",
    path: "/inbox",
    description: "Legacy Ash route retained while the Gravity shell is being fused.",
    icon: "inbox",
    templateMetrics: [{ label: "Status", value: "Legacy UI" }],
    sidebarPreview: [
      {
        title: "Legacy route",
        subject: "Kept during shell migration",
        date: "Now",
        teaser: "This route remains available while the Gravity shell finishes replacing old Ash-specific surfaces.",
      },
    ],
  },
  {
    title: "Tickets",
    path: "/tickets",
    description: "Legacy Ash route retained while the Gravity shell is being fused.",
    icon: "tickets",
    templateMetrics: [{ label: "Status", value: "Legacy UI" }],
    sidebarPreview: [
      {
        title: "Legacy route",
        subject: "Kept during shell migration",
        date: "Now",
        teaser: "This route remains available while the Gravity shell finishes replacing old Ash-specific surfaces.",
      },
    ],
  },
  {
    title: "Customer",
    path: "/customers",
    description: "Legacy Ash route retained while the Gravity shell is being fused.",
    icon: "customers",
    templateMetrics: [{ label: "Status", value: "Legacy UI" }],
    sidebarPreview: [
      {
        title: "Legacy route",
        subject: "Kept during shell migration",
        date: "Now",
        teaser: "This route remains available while the Gravity shell finishes replacing old Ash-specific surfaces.",
      },
    ],
  },
  {
    title: "Accounts",
    path: "/accounts",
    description: "Legacy Ash route retained while the Gravity shell is being fused.",
    icon: "accounts",
    templateMetrics: [{ label: "Status", value: "Legacy UI" }],
    sidebarPreview: [
      {
        title: "Legacy route",
        subject: "Kept during shell migration",
        date: "Now",
        teaser: "This route remains available while the Gravity shell finishes replacing old Ash-specific surfaces.",
      },
    ],
  },
  {
    title: "Internal Notes",
    path: "/internal-notes",
    description: "Legacy Ash route retained while the Gravity shell is being fused.",
    icon: "internal-notes",
    templateMetrics: [{ label: "Status", value: "Legacy UI" }],
    sidebarPreview: [
      {
        title: "Legacy route",
        subject: "Kept during shell migration",
        date: "Now",
        teaser: "This route remains available while the Gravity shell finishes replacing old Ash-specific surfaces.",
      },
    ],
  },
  {
    title: "Knowledge Base",
    path: "/knowledge-base",
    description: "Legacy Ash route retained while the Gravity shell is being fused.",
    icon: "knowledge-base",
    templateMetrics: [{ label: "Status", value: "Legacy UI" }],
    sidebarPreview: [
      {
        title: "Legacy route",
        subject: "Kept during shell migration",
        date: "Now",
        teaser: "This route remains available while the Gravity shell finishes replacing old Ash-specific surfaces.",
      },
    ],
  },
  {
    title: "Macros",
    path: "/macros",
    description: "Legacy Ash route retained while the Gravity shell is being fused.",
    icon: "macros",
    templateMetrics: [{ label: "Status", value: "Legacy UI" }],
    sidebarPreview: [
      {
        title: "Legacy route",
        subject: "Kept during shell migration",
        date: "Now",
        teaser: "This route remains available while the Gravity shell finishes replacing old Ash-specific surfaces.",
      },
    ],
  },
]

const gravAllRoutes = [...gravNavigationRoutes, ...gravLegacyRoutes]

function normalizePath(path: string) {
  return path.replace(/\/$/, "") || "/"
}

export function getRouteByPath(path: string) {
  const normalizedPath = normalizePath(path)
  return gravAllRoutes.find((route) => route.path === normalizedPath) ?? null
}

export function getRouteByPathOrThrow(path: string) {
  const route = getRouteByPath(path)
  if (!route) {
    throw new Error(`Unknown Gravity route path: ${path}`)
  }
  return route
}

export function getRouteByPathname(pathname: string) {
  const normalizedPath = normalizePath(pathname)

  return (
    gravAllRoutes.find(
      (route) =>
        route.path === normalizedPath ||
        (route.path !== "/" && normalizedPath.startsWith(`${route.path}/`))
    ) ?? null
  )
}
