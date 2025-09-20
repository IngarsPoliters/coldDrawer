import { Badge } from "@/components/ui/Badge"
import { Asset } from "@coldDrawer/shared"
import { cn } from "@/lib/utils"

interface StatusPillProps {
  status: Asset['status']
  className?: string
}

const statusConfig = {
  owned: {
    label: "Owned",
    variant: "default" as const,
    className: "status-owned"
  },
  for_sale: {
    label: "For Sale", 
    variant: "secondary" as const,
    className: "status-for_sale"
  },
  escrow: {
    label: "In Escrow",
    variant: "outline" as const,
    className: "status-escrow"
  },
  settled: {
    label: "Settled",
    variant: "default" as const,
    className: "status-settled"
  },
  refunded: {
    label: "Refunded",
    variant: "secondary" as const,
    className: "status-refunded"
  }
}

export function StatusPill({ status, className }: StatusPillProps) {
  const config = statusConfig[status]
  
  return (
    <Badge 
      variant={config.variant}
      className={cn(config.className, className)}
    >
      {config.label}
    </Badge>
  )
}