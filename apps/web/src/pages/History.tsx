import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { LoadingSpinner } from "@/components/common/LoadingSpinner"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { useAppStore } from "@/stores/appStore"
import { useWalletConnected } from "@/stores/walletStore"
import { apiClient } from "@/lib/api"
import { AssetEvent, EventFilter } from "@coldDrawer/shared"
import { formatTimeAgo, formatAddress } from "@/lib/utils"
import { 
  Calendar,
  Filter,
  ExternalLink,
  Package,
  Send,
  ShoppingCart,
  CheckCircle2,
  RefreshCw,
  Lock,
  FileText,
  Search
} from "lucide-react"

const eventIcons = {
  mint: Package,
  transfer: Send,
  sale_open: ShoppingCart,
  sale_settle: CheckCircle2,
  sale_refund: RefreshCw,
  freeze: Lock,
  note: FileText
}

const eventLabels = {
  mint: "Minted",
  transfer: "Transferred",
  sale_open: "Sale Opened", 
  sale_settle: "Sale Settled",
  sale_refund: "Sale Refunded",
  freeze: "Metadata Frozen",
  note: "Note Added"
}

export function History() {
  const [events, setEvents] = useState<AssetEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<EventFilter>({})
  const [searchQuery, setSearchQuery] = useState("")
  
  const isConnected = useWalletConnected()
  const { setError } = useAppStore()

  useEffect(() => {
    if (!isConnected) return

    const loadEvents = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await apiClient.getEvents({
          ...filter,
          limit: 50
        })

        setEvents(response.events)

      } catch (error) {
        console.error('Failed to load events:', error)
        setError('Failed to load transaction history.')
      } finally {
        setLoading(false)
      }
    }

    loadEvents()
  }, [isConnected, filter, setError])

  const filteredEvents = events.filter(event => {
    if (!searchQuery) return true
    
    const query = searchQuery.toLowerCase()
    return (
      event.tokenId.includes(query) ||
      event.txid.toLowerCase().includes(query) ||
      JSON.stringify(event).toLowerCase().includes(query)
    )
  })

  const handleFilterByType = (type: string) => {
    setFilter(prev => ({
      ...prev,
      type: prev.type === type ? undefined : type as any
    }))
  }

  const clearFilters = () => {
    setFilter({})
    setSearchQuery("")
  }

  const getEventDescription = (event: AssetEvent) => {
    switch (event.type) {
      case 'mint':
        const mintEvent = event as any
        return `Token ${event.tokenId} minted by ${formatAddress(mintEvent.minter)}`
      
      case 'transfer':
        const transferEvent = event as any
        return `Token ${event.tokenId} transferred from ${formatAddress(transferEvent.from)} to ${formatAddress(transferEvent.to)}`
      
      case 'sale_open':
        const saleEvent = event as any
        return `Token ${event.tokenId} listed for ${(parseInt(saleEvent.priceBTC) / 100000000).toFixed(8)} BTC`
      
      case 'sale_settle':
        const settleEvent = event as any
        return `Token ${event.tokenId} sold to ${formatAddress(settleEvent.buyer)}`
      
      case 'sale_refund':
        const refundEvent = event as any
        return `Sale of token ${event.tokenId} refunded to ${formatAddress(refundEvent.seller)}`
      
      case 'freeze':
        const freezeEvent = event as any
        return `Metadata for token ${event.tokenId} frozen by ${formatAddress(freezeEvent.owner)}`
      
      case 'note':
        const noteEvent = event as any
        return `Note added to token ${event.tokenId}: "${noteEvent.note}"`
      
      default:
        return `Event for token ${(event as AssetEvent).tokenId}`
    }
  }

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>Connect Your Wallet</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Connect your wallet to view transaction history.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Transaction History</h1>
        <p className="text-muted-foreground">
          View all asset-related transactions and events
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by token ID, transaction hash..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {Object.entries(eventLabels).map(([type, label]) => (
            <Button
              key={type}
              variant={filter.type === type ? "default" : "outline"}
              size="sm"
              onClick={() => handleFilterByType(type)}
              className="gap-1"
            >
              {React.createElement(eventIcons[type as keyof typeof eventIcons], {
                className: "h-3 w-3"
              })}
              {label}
            </Button>
          ))}
        </div>

        {(filter.type || searchQuery) && (
          <Button variant="outline" onClick={clearFilters} className="gap-2">
            <Filter className="h-4 w-4" />
            Clear
          </Button>
        )}
      </div>

      {/* Events List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Recent Events
            {filteredEvents.length > 0 && (
              <Badge variant="outline">{filteredEvents.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner size="lg" />
              <span className="ml-2 text-muted-foreground">Loading events...</span>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {events.length === 0 ? "No events found" : "No events match your filters"}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredEvents.map((event) => {
                const Icon = eventIcons[event.type]
                const label = eventLabels[event.type]
                
                return (
                  <div
                    key={`${event.txid}-${event.type}`}
                    className="flex items-center gap-4 p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="p-2 rounded-lg bg-muted">
                      <Icon className="h-4 w-4" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium">{label}</h4>
                        <Badge variant="outline" className="text-xs">
                          Block #{event.blockNumber}
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-muted-foreground truncate">
                        {getEventDescription(event)}
                      </p>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {formatTimeAgo(event.timestamp)}
                      </p>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs"
                        onClick={() => {
                          const explorerUrl = `https://amoy.polygonscan.com/tx/${event.txid}`
                          window.open(explorerUrl, '_blank')
                        }}
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        View
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}