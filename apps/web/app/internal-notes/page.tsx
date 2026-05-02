import { GravPageTemplate } from "@/components/grav-page-template"
import { getRouteByPathOrThrow } from "@/lib/grav-routes"

const route = getRouteByPathOrThrow("/internal-notes")

export default function InternalNotesPage() {
  return (
    <GravPageTemplate
      title={route.title}
      description={route.description}
      metrics={route.templateMetrics}
    />
  )
}
