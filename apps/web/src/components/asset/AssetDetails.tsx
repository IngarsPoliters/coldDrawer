import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { StatusPill } from "@/components/common/StatusPill"
import { Asset, AssetEvent } from "@coldDrawer/shared"
import { formatAddress, formatTimeAgo, formatDate, copyToClipboard } from "@/lib/utils"
import { 
  ArrowLeft, 
  ExternalLink, 
  Copy, 
  Send, 
  ShoppingCart,
  Calendar,
  User,
  Hash,
  FileText,
  Lock
} from "lucide-react"
import { AssetTimeline } from "./AssetTimeline"

interface AssetDetailsProps {
  asset: Asset
  events: AssetEvent[]
  onBack: () => void
  onSell?: (asset: Asset) => void
  onTransfer?: (asset: Asset) => void
}

export function AssetDetails({ asset, events, onBack, onSell, onTransfer }: AssetDetailsProps) {
  const handleCopyAddress = () => {
    copyToClipboard(asset.ownerAddress)
  }

  const handleCopyTokenId = () => {
    copyToClipboard(asset.tokenId)
  }

  const handleViewOnExplorer = () => {
    const explorerUrl = `https://amoy.polygonscan.com/token/${process.env.VITE_CONTRACT_ADDRESS}?a=${asset.tokenId}`
    window.open(explorerUrl, '_blank')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold">{asset.title}</h1>
            <StatusPill status={asset.status} />
            {asset.frozen && (
              <Badge variant="outline" className="gap-1">
                <Lock className="h-3 w-3" />
                Frozen
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            {asset.category.charAt(0).toUpperCase() + asset.category.slice(1)} • Token ID: {asset.tokenId}
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={handleViewOnExplorer} className="gap-2">
            <ExternalLink className="h-4 w-4" />
            View on Explorer
          </Button>
          
          {asset.status === 'owned' && (
            <>
              <Button variant="outline" onClick={() => onSell?.(asset)} className="gap-2">
                <ShoppingCart className="h-4 w-4" />
                Sell for BTC
              </Button>
              
              <Button onClick={() => onTransfer?.(asset)} className="gap-2">
                <Send className="h-4 w-4" />
                Transfer
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Asset Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Asset Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Token ID</label>
                  <div className="flex items-center gap-2">
                    <code className="text-sm bg-muted px-2 py-1 rounded">{asset.tokenId}</code>
                    <Button variant="ghost" size="icon" onClick={handleCopyTokenId} className="h-6 w-6">
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Category</label>
                  <p className="capitalize">{asset.category}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Created</label>
                  <p>{formatDate(asset.createdAt)}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Last Updated</label>
                  <p>{formatTimeAgo(asset.updatedAt)}</p>
                </div>
              </div>

              {/* Identifiers */}
              {asset.identifiers && Object.keys(asset.identifiers).length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Identifiers</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {Object.entries(asset.identifiers).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <span className="text-sm font-medium capitalize">{key}:</span>
                        <code className="text-sm">{value}</code>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Attributes */}
              {asset.attributes && Object.keys(asset.attributes).length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Attributes</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {Object.entries(asset.attributes).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <span className="text-sm font-medium capitalize">{key}:</span>
                        <span className="text-sm">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Note */}
              {asset.note && (
                <div>
                  <h4 className="font-medium mb-2">Note</h4>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm italic">"{asset.note}"</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Asset Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AssetTimeline events={events} />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Ownership */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Ownership
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Current Owner</label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="text-sm bg-muted px-2 py-1 rounded flex-1">
                    {formatAddress(asset.ownerAddress, 8)}
                  </code>
                  <Button variant="ghost" size="icon" onClick={handleCopyAddress} className="h-6 w-6">
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">Network</label>
                <div className="flex items-center gap-2 mt-1">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span className="text-sm">Polygon Amoy Testnet</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Hash className="h-5 w-5" />
                Quick Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Total Events</span>
                <span className="font-medium">{events.length}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Days Owned</span>
                <span className="font-medium">
                  {Math.floor((Date.now() / 1000 - asset.createdAt) / 86400)}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Transfers</span>
                <span className="font-medium">
                  {events.filter(e => e.type === 'transfer').length}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}