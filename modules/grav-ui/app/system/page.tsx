import { GravPageTemplate } from "@/components/grav-page-template"
import { getRouteByPathOrThrow } from "@/lib/grav-routes"

const route = getRouteByPathOrThrow("/system")

export default function SystemPage() {
  return (
    <GravPageTemplate
      title={route.title}
      description={route.description}
      metrics={route.templateMetrics}
      primaryActionLabel="Inspect host"
    />
  )
}
