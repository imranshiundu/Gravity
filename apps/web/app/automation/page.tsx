import { GravPageTemplate } from "@/components/grav-page-template"
import { getRouteByPathOrThrow } from "@/lib/grav-routes"

const route = getRouteByPathOrThrow("/automation")

export default function AutomationPage() {
  return (
    <GravPageTemplate
      title={route.title}
      description={route.description}
      metrics={route.templateMetrics}
      primaryActionLabel="Open automations"
    />
  )
}
