import {
  IconArrowsSort,
  IconChevronDown,
  IconDownload,
  IconPlus,
  IconX,
} from "@tabler/icons-react"
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
} from "react"

import {
  DataGridColumnOptionsMenu,
  type DataGridToolbarRenderProps,
} from "@/components/data-grid"
import type { CustomerColumnId } from "@/components/customers/customer-table"
import {
  customersPageSectionsCopy,
  formatSelectedCustomersLabel,
} from "@/components/customers/customers-page-sections.copy"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { customerLifecycleLabels } from "@/lib/customers/types"
import type { CustomerLifecycle } from "@/lib/customers/types"
import { cn } from "@/lib/utils"

export type CustomerSortPreset = "risk" | "value" | "recent"

type CustomersPageHeaderProps = {
  isStatsExpanded: boolean
  onToggleStats: () => void
  onCreateCustomer: (event?: MouseEvent<HTMLButtonElement>) => void
  onExportCustomers: () => void
}

export function CustomersPageHeader({
  isStatsExpanded,
  onToggleStats,
  onCreateCustomer,
  onExportCustomers,
}: CustomersPageHeaderProps) {
  return (
    <section className="flex items-center justify-between gap-2 max-sm:py-1">
      <h1 className="min-w-0 text-xl leading-tight font-semibold tracking-tight text-foreground max-sm:text-lg max-sm:leading-6 sm:text-3xl">
        {customersPageSectionsCopy.pageTitle}
      </h1>

      <div className="flex shrink-0 items-center gap-2 max-sm:gap-1.5">
        <div className="hidden items-center gap-2 sm:flex">
          <Button
            variant="outline"
            size="sm"
            className="h-9 rounded-xl"
            onClick={onExportCustomers}
          >
            <IconDownload className="size-4" />
            {customersPageSectionsCopy.export}
          </Button>
          <Button
            size="sm"
            className="h-9 rounded-xl"
            onClick={onCreateCustomer}
          >
            <IconPlus className="size-4" />
            {customersPageSectionsCopy.newCustomer}
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="size-9 rounded-xl"
            onClick={onToggleStats}
            aria-expanded={isStatsExpanded}
            aria-controls="customer-metrics"
          >
            <IconChevronDown
              className={cn(
                "size-4 transition-transform",
                isStatsExpanded && "rotate-180"
              )}
            />
            <span className="sr-only">
              {customersPageSectionsCopy.toggleCustomerMetrics}
            </span>
          </Button>
        </div>

        <div className="flex items-center gap-2 sm:hidden">
          <Button
            variant="outline"
            size="icon-sm"
            className="size-9 rounded-xl max-sm:size-8"
            onClick={onExportCustomers}
            aria-label={customersPageSectionsCopy.exportCustomersAriaLabel}
          >
            <IconDownload className="size-4" />
            <span className="sr-only">{customersPageSectionsCopy.export}</span>
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="size-9 rounded-xl max-sm:size-8"
            onClick={onToggleStats}
            aria-expanded={isStatsExpanded}
            aria-controls="customer-metrics"
            aria-label={customersPageSectionsCopy.toggleCustomerMetrics}
          >
            <IconChevronDown
              className={cn(
                "size-4 transition-transform",
                isStatsExpanded && "rotate-180"
              )}
            />
            <span className="sr-only">
              {customersPageSectionsCopy.toggleCustomerMetrics}
            </span>
          </Button>
        </div>
      </div>
    </section>
  )
}

type CustomersTableActionsProps = {
  tableToolbarProps: DataGridToolbarRenderProps<CustomerColumnId> | null
  sortPreset: CustomerSortPreset
  onSortPresetChange: (nextPreset: CustomerSortPreset) => void
  lifecycleFilter: CustomerLifecycle | "all"
  onLifecycleFilterChange: (nextFilter: CustomerLifecycle | "all") => void
}

const customerSortLabels: Record<CustomerSortPreset, string> = {
  risk: "Risk first",
  value: "Highest ARR",
  recent: "Recent touch",
}

const customerSortOptions: CustomerSortPreset[] = ["risk", "value", "recent"]

export function CustomersTableActions({
  tableToolbarProps,
  sortPreset,
  onSortPresetChange,
  lifecycleFilter,
  onLifecycleFilterChange,
}: CustomersTableActionsProps) {
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="outline"
              size="sm"
              className="h-9 rounded-xl"
              aria-label={customersPageSectionsCopy.openSortMenuAriaLabel}
            />
          }
        >
          <IconArrowsSort className="size-4" />
          {customerSortLabels[sortPreset]}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-44">
          <DropdownMenuGroup>
            <DropdownMenuRadioGroup
              value={sortPreset}
              onValueChange={(value) =>
                onSortPresetChange(value as CustomerSortPreset)
              }
            >
              {customerSortOptions.map((option) => (
                <DropdownMenuRadioItem key={option} value={option}>
                  {customerSortLabels[option]}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="outline" size="sm" className="h-9 rounded-xl" />
          }
        >
          {lifecycleFilter === "all"
            ? "All lifecycles"
            : customerLifecycleLabels[lifecycleFilter]}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-48">
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => onLifecycleFilterChange("all")}>
              All lifecycles
            </DropdownMenuItem>
            {(Object.keys(customerLifecycleLabels) as CustomerLifecycle[]).map(
              (lifecycle) => (
                <DropdownMenuItem
                  key={lifecycle}
                  onClick={() => onLifecycleFilterChange(lifecycle)}
                >
                  {customerLifecycleLabels[lifecycle]}
                </DropdownMenuItem>
              )
            )}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {tableToolbarProps ? (
        <DataGridColumnOptionsMenu
          {...tableToolbarProps}
          triggerLabel={customersPageSectionsCopy.tableOptionsTriggerLabel}
        />
      ) : null}
    </>
  )
}

type CustomersSelectionActionBarProps = {
  tableToolbarProps: DataGridToolbarRenderProps<CustomerColumnId> | null
  onMarkHealthy: () => void
  onMoveToWatch: () => void
  onArchive: () => void
  onExportSelection: () => void
  overlayStyle?: CSSProperties
}

export function CustomersSelectionActionBar({
  tableToolbarProps,
  onMarkHealthy,
  onMoveToWatch,
  onArchive,
  onExportSelection,
  overlayStyle,
}: CustomersSelectionActionBarProps) {
  const selectedRowCount = tableToolbarProps?.selectedRowCount ?? 0
  const [shouldRender, setShouldRender] = useState(selectedRowCount > 0)
  const [isVisible, setIsVisible] = useState(selectedRowCount > 0)
  const exitTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    if (exitTimeoutRef.current !== null) {
      window.clearTimeout(exitTimeoutRef.current)
      exitTimeoutRef.current = null
    }

    if (selectedRowCount > 0) {
      const frameId = window.requestAnimationFrame(() => {
        setShouldRender(true)
        setIsVisible(true)
      })

      return () => window.cancelAnimationFrame(frameId)
    }

    const timeoutId = window.setTimeout(() => {
      setIsVisible(false)
      exitTimeoutRef.current = window.setTimeout(() => {
        setShouldRender(false)
        exitTimeoutRef.current = null
      }, 220)
    }, 0)

    return () => {
      window.clearTimeout(timeoutId)
      if (exitTimeoutRef.current !== null) {
        window.clearTimeout(exitTimeoutRef.current)
        exitTimeoutRef.current = null
      }
    }
  }, [selectedRowCount])

  if (!shouldRender || !tableToolbarProps) return null

  const showSelectAllVisibleAction =
    selectedRowCount > 0 &&
    selectedRowCount < tableToolbarProps.visibleRowCount &&
    !tableToolbarProps.allVisibleRowsSelected

  const buttonClass =
    "h-8 rounded-lg px-2.5 text-[13px] text-inherit hover:bg-white/10 hover:text-inherit dark:hover:bg-black/8 dark:hover:text-inherit"

  return (
    <div
      className="pointer-events-none fixed z-40 flex justify-center px-1 sm:px-2"
      style={{
        bottom: "calc(env(safe-area-inset-bottom, 0px) + 1rem)",
        left: 0,
        width: "100%",
        ...overlayStyle,
      }}
    >
      <div
        className={cn(
          "pointer-events-auto flex w-fit max-w-full transform-gpu items-center gap-1 overflow-x-auto rounded-2xl border border-zinc-800/90 bg-zinc-950 px-1.5 py-1.5 text-zinc-100 shadow-xl ring-1 ring-black/20 will-change-[transform,opacity] dark:border-zinc-300/80 dark:bg-zinc-100 dark:text-zinc-900 dark:ring-white/25",
          "transition-[opacity,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
          isVisible ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
        )}
      >
        <Button
          variant="ghost"
          size="icon-sm"
          className="size-8 rounded-lg text-inherit hover:bg-white/10 hover:text-inherit dark:hover:bg-black/8 dark:hover:text-inherit"
          onClick={() => tableToolbarProps.clearSelection()}
          aria-label={customersPageSectionsCopy.clearSelectionAriaLabel}
        >
          <IconX className="size-4" />
        </Button>

        <div className="flex h-8 shrink-0 items-center gap-1.5 border-r border-white/10 pr-2 dark:border-black/10">
          <span className="text-xs font-medium sm:text-sm" aria-live="polite">
            {formatSelectedCustomersLabel(selectedRowCount)}
          </span>
          {showSelectAllVisibleAction ? (
            <>
              <span className="text-zinc-500 dark:text-zinc-500">•</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 rounded-md px-2 text-xs font-medium text-inherit underline-offset-4 hover:bg-white/10 hover:text-inherit hover:underline dark:hover:bg-black/8 dark:hover:text-inherit"
                onClick={() => tableToolbarProps.onToggleAllRows(true)}
              >
                {customersPageSectionsCopy.selectAllVisible(
                  tableToolbarProps.visibleRowCount
                )}
              </Button>
            </>
          ) : null}
        </div>

        <Button
          variant="ghost"
          size="sm"
          className={buttonClass}
          onClick={onMarkHealthy}
        >
          {customersPageSectionsCopy.markHealthy}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={buttonClass}
          onClick={onMoveToWatch}
        >
          {customersPageSectionsCopy.moveToWatch}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={buttonClass}
          onClick={onArchive}
        >
          {customersPageSectionsCopy.archive}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={buttonClass}
          onClick={onExportSelection}
        >
          <IconDownload className="size-4" />
          {customersPageSectionsCopy.exportCsv}
        </Button>
      </div>
    </div>
  )
}
