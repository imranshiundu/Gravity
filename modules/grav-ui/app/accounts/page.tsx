import { GravPageTemplate } from "@/components/grav-page-template"
import { getRouteByPathOrThrow } from "@/lib/grav-routes"

const route = getRouteByPathOrThrow("/accounts")

export default function AccountsPage() {
  return (
    <GravPageTemplate
      title={route.title}
      description={route.description}
      metrics={route.templateMetrics}
    />
  )
}
