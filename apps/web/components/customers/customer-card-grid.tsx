"use client"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { getCustomerBrandPresentation } from "@/components/customers/customer-brand"
import { CustomerInitialAvatar } from "@/components/customers/customer-initial-avatar"
import type { CustomerDrawerTriggerContext } from "@/components/customers/customer-drawer"
import type { Customer } from "@/lib/customers/types"
import { cn } from "@/lib/utils"

type CustomerCardGridProps = {
  customers: Customer[]
  onOpenCustomerDrawer?: (context: CustomerDrawerTriggerContext) => void
}

export function CustomerCardGrid({
  customers,
  onOpenCustomerDrawer,
}: CustomerCardGridProps) {
  return (
    <div className="h-full min-h-0 overflow-y-auto">
      <div className="grid gap-3 pb-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {customers.map((customer) => {
          const brand = getCustomerBrandPresentation(
            customer.id,
            customer.companyName
          )
          const BrandIcon = brand.icon

          return (
            <article
              key={customer.id}
              className={cn(
                "rounded-xl border bg-card p-4 transition-colors hover:bg-muted/20",
                onOpenCustomerDrawer && "cursor-pointer"
              )}
              onClick={() => {
                onOpenCustomerDrawer?.({
                  customerId: customer.id,
                  source: "card",
                })
              }}
            >
              <div className="flex min-w-0 items-center gap-3">
                <CustomerInitialAvatar
                  name={customer.primaryContactName}
                  size="md"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {customer.primaryContactName}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">
                    {customer.primaryContactEmail}
                  </p>
                </div>
              </div>

              <div className="mt-4 border-t pt-3">
                <div className="flex min-w-0 items-center gap-2">
                  <Avatar className="size-6 border bg-background" size="sm">
                    <AvatarFallback
                      className={cn("text-[10px] font-semibold", brand.className)}
                    >
                      {BrandIcon ? <BrandIcon className="size-3.5" /> : brand.fallback}
                    </AvatarFallback>
                  </Avatar>
                  <p className="truncate text-sm font-medium text-foreground">
                    {customer.companyName}
                  </p>
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}
