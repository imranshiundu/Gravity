"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import {
  IconAlertCircle,
  IconBuilding,
  IconCircleDot,
  IconClock,
  IconLayoutList,
  IconUser,
  IconUsersGroup,
} from "@tabler/icons-react"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { customerSidebarGroups } from "@/lib/customers/mock-data"
import type { CustomerSidebarGroup } from "@/lib/customers/types"
import { cn } from "@/lib/utils"

const BADGED_VIEW_KEYS = new Set(["mine", "at-risk", "renewal", "high-touch"])

function CustomerFilterIcon({
  groupKey,
  itemKey,
}: {
  groupKey: CustomerSidebarGroup["key"]
  itemKey: string
}) {
  if (groupKey === "views") {
    if (itemKey === "all") return <IconUsersGroup className="size-4" />
    if (itemKey === "mine") return <IconUser className="size-4" />
    if (itemKey === "at-risk") return <IconAlertCircle className="size-4" />
    if (itemKey === "renewal") return <IconClock className="size-4" />
  }

  if (groupKey === "segment") {
    return <IconBuilding className="size-4" />
  }

  if (groupKey === "lifecycle") {
    return <IconLayoutList className="size-4" />
  }

  return <IconCircleDot className="size-4" />
}

export function CustomerSidebarFilters() {
  const searchParams = useSearchParams()
  const activeView = searchParams.get("view") ?? "all"

  const buildItemHref = (groupKey: string, itemKey: string) => {
    const nextSearchParams = new URLSearchParams(searchParams.toString())

    if (groupKey === "views") {
      nextSearchParams.set("view", itemKey)
    }

    return `/customers?${nextSearchParams.toString()}`
  }

  return (
    <div className="flex flex-col gap-5 px-3 py-3">
      {customerSidebarGroups.map((group) => (
        <SidebarGroup key={group.key} className="p-2 pb-3 gap-2">
          <SidebarGroupLabel className="py-2 px-2 text-xs tracking-widest font-mono text-sidebar-foreground/65 uppercase">
            {group.label}
          </SidebarGroupLabel>

          <SidebarGroupContent>
            <SidebarMenu>
              {group.items.map((item) => {
                const isActive = group.key === "views" && item.key === activeView
                const shouldShowBadge =
                  group.key === "views" && BADGED_VIEW_KEYS.has(item.key)

                return (
                  <SidebarMenuItem key={item.key}>
                    <SidebarMenuButton
                      render={
                        <Link href={buildItemHref(group.key, item.key)} />
                      }
                      isActive={isActive}
                      className="h-8 rounded-lg px-2"
                    >
                      <CustomerFilterIcon
                        groupKey={group.key}
                        itemKey={item.key}
                      />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                    {shouldShowBadge ? (
                      <SidebarMenuBadge
                        className={cn(
                          "top-1.5 rounded-full px-1.5 text-xs font-medium",
                          isActive
                            ? "bg-background text-sidebar-accent-foreground"
                            : "bg-muted-foreground/10 text-sidebar-foreground/80"
                        )}
                      >
                        {item.count}
                      </SidebarMenuBadge>
                    ) : null}
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </div>
  )
}
