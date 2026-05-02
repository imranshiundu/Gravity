import { GravPageTemplate } from "@/components/grav-page-template"
import { getRouteByPathOrThrow } from "@/lib/grav-routes"

const route = getRouteByPathOrThrow("/macros")

export default function MacrosPage() {
  return (
    <GravPageTemplate
      title={route.title}
      description={route.description}
      metrics={route.templateMetrics}
    />
  )
}
