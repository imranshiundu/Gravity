import type { ReactNode } from "react"
import {
  IconAdjustmentsHorizontal,
  IconLayoutGrid,
  IconSearch,
  IconTable,
} from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { customerHealthLabels } from "@/lib/customers/types"
import type { CustomerHealth, CustomerLayoutMode } from "@/lib/customers/types"

type CustomerHealthFilter = "all" | CustomerHealth

type CustomerSearchToolbarProps = {
  query: string
  onQueryChange: (query: string) => void
  healthFilter: CustomerHealthFilter
  onHealthFilterChange: (health: CustomerHealthFilter) => void
  layoutMode: CustomerLayoutMode
  onLayoutModeChange: (layoutMode: CustomerLayoutMode) => void
  tableActions?: ReactNode
}

const healthFilterLabels: Record<CustomerHealthFilter, string> = {
  all: "All health",
  healthy: customerHealthLabels.healthy,
  watch: customerHealthLabels.watch,
  at_risk: customerHealthLabels.at_risk,
}

const healthFilterOptions: CustomerHealthFilter[] = [
  "all",
  "healthy",
  "watch",
  "at_risk",
]

export function CustomerSearchToolbar({
  query,
  onQueryChange,
  healthFilter,
  onHealthFilterChange,
  layoutMode,
  onLayoutModeChange,
  tableActions,
}: CustomerSearchToolbarProps) {
  return (
    <section className="flex flex-col gap-3 max-sm:gap-2 lg:flex-row lg:items-center lg:justify-between">
      <div className="relative w-full max-w-md">
        <IconSearch className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search customers by account, owner, or contact..."
          className="h-10 rounded-xl border bg-background pl-9 max-sm:h-9 max-sm:text-sm"
        />
      </div>

      <div className="flex w-full items-center gap-2 max-sm:overflow-x-auto max-sm:whitespace-nowrap max-sm:[scrollbar-width:none] lg:w-auto lg:justify-end max-sm:[&::-webkit-scrollbar]:hidden">
        {tableActions ? (
          <div className="flex shrink-0 items-center gap-2">{tableActions}</div>
        ) : null}

        <div className="ml-auto flex shrink-0 items-center gap-2 max-sm:ml-0">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 rounded-xl max-sm:h-8 max-sm:px-2.5"
                />
              }
            >
              <IconAdjustmentsHorizontal className="size-4" />
              {healthFilterLabels[healthFilter]}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-40">
              <DropdownMenuGroup>
                {healthFilterOptions.map((option) => (
                  <DropdownMenuItem
                    key={option}
                    onClick={() => onHealthFilterChange(option)}
                  >
                    {healthFilterLabels[option]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex items-center gap-1 rounded-xl border bg-background p-1 max-sm:gap-0.5 max-sm:p-0.5">
            <Button
              variant="ghost"
              size="icon-sm"
              className={cn(
                "size-7 rounded-lg max-sm:size-[26px]",
                layoutMode === "card" && "bg-muted/70"
              )}
              aria-label="Card view"
              onClick={() => onLayoutModeChange("card")}
            >
              <IconLayoutGrid className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              className={cn(
                "size-7 rounded-lg max-sm:size-[26px]",
                layoutMode === "table" && "bg-muted/70"
              )}
              aria-label="Table view"
              onClick={() => onLayoutModeChange("table")}
            >
              <IconTable className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
