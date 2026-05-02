import { CustomersPage as CustomersPageView } from "@/components/customers/customers-page"

type CustomersRouteProps = {
  searchParams: Promise<{
    view?: string
    layout?: string
  }>
}

export default async function CustomersPage({ searchParams }: CustomersRouteProps) {
  const params = await searchParams

  return (
    <CustomersPageView
      initialView={params.view ?? null}
      initialLayout={params.layout ?? null}
    />
  )
}
