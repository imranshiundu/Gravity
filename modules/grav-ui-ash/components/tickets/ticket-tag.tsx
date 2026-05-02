import { Badge } from "@/components/ui/badge"
import {
  ticketHealthDotClassName,
  ticketHealthLabel,
  ticketHealthToneClassName,
} from "@/lib/tickets/presentation"
import { cn } from "@/lib/utils"
import type { TicketHealth } from "@/lib/tickets/types"

type TicketTagProps = {
  tone: TicketHealth
  className?: string
}

export function TicketTag({ tone, className }: TicketTagProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "h-5 gap-1 rounded-full px-2 text-xs font-medium",
        ticketHealthToneClassName[tone],
        className
      )}
    >
      <span
        className={cn("size-1.5 rounded-full", ticketHealthDotClassName[tone])}
      />
      {ticketHealthLabel[tone]}
    </Badge>
  )
}
