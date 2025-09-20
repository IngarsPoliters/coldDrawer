import { AssetEvent } from "@coldDrawer/shared"
import { Badge } from "@/components/ui/Badge"
import { formatTimeAgo, formatAddress } from "@/lib/utils"
import { 
  Package, 
  Send, 
  ShoppingCart, 
  CheckCircle2, 
  RefreshCw,
  Lock,
  FileText,
  ExternalLink
} from "lucide-react"

interface AssetTimelineProps {
  events: AssetEvent[]
}

const eventConfig = {
  mint: {
    icon: Package,
    label: "Minted",
    color: "bg-blue-500",
    description: (event: any) => `Minted by ${formatAddress(event.minter)}`
  },
  transfer: {
    icon: Send,
    label: "Transferred", 
    color: "bg-green-500",
    description: (event: any) => `From ${formatAddress(event.from)} to ${formatAddress(event.to)}`
  },
  sale_open: {
    icon: ShoppingCart,
    label: "Sale Opened",
    color: "bg-amber-500", 
    description: (event: any) => `Listed for ${(parseInt(event.priceBTC) / 100000000).toFixed(8)} BTC`
  },
  sale_settle: {
    icon: CheckCircle2,
    label: "Sale Settled",
    color: "bg-green-500",
    description: (event: any) => `Sold to ${formatAddress(event.buyer)}`
  },
  sale_refund: {
    icon: RefreshCw,
    label: "Sale Refunded", 
    color: "bg-gray-500",
    description: (event: any) => `Refunded to ${formatAddress(event.seller)}`
  },
  freeze: {
    icon: Lock,
    label: "Metadata Frozen",
    color: "bg-red-500",
    description: (event: any) => `Metadata frozen by ${formatAddress(event.owner)}`
  },
  note: {
    icon: FileText,
    label: "Note Added",
    color: "bg-purple-500",
    description: (event: any) => `Note: "${event.note}"`
  }
}

export function AssetTimeline({ events }: AssetTimelineProps) {
  const sortedEvents = [...events].sort((a, b) => b.blockNumber - a.blockNumber)

  if (events.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No events recorded for this asset
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {sortedEvents.map((event, index) => {
        const config = eventConfig[event.type]
        if (!config) return null

        const Icon = config.icon
        const isFirst = index === 0
        const isLast = index === sortedEvents.length - 1

        return (
          <div key={`${event.txid}-${event.type}`} className="flex gap-4">
            {/* Timeline Line */}
            <div className="flex flex-col items-center">
              <div className={`
                w-8 h-8 rounded-full ${config.color} 
                flex items-center justify-center text-white
                ${isFirst ? 'animate-pulse' : ''}
              `}>
                <Icon className="h-4 w-4" />
              </div>
              {!isLast && (
                <div className="w-px h-6 bg-border mt-2" />
              )}
            </div>

            {/* Event Content */}
            <div className="flex-1 pb-6">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-medium">{config.label}</h4>
                <Badge variant="outline" className="text-xs">
                  Block #{event.blockNumber}
                </Badge>
              </div>
              
              <p className="text-sm text-muted-foreground mb-2">
                {config.description(event)}
              </p>
              
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>{formatTimeAgo(event.timestamp)}</span>
                
                <button 
                  className="flex items-center gap-1 hover:text-foreground transition-colors"
                  onClick={() => {
                    const explorerUrl = `https://amoy.polygonscan.com/tx/${event.txid}`
                    window.open(explorerUrl, '_blank')
                  }}
                >
                  <ExternalLink className="h-3 w-3" />
                  View Transaction
                </button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}