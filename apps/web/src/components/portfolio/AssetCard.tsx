import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { StatusPill } from "@/components/common/StatusPill"
import { Asset, ASSET_CATEGORIES } from "@coldDrawer/shared"
import { formatAddress, formatTimeAgo } from "@/lib/utils"
import { 
  MoreHorizontal, 
  Send, 
  ShoppingCart, 
  Eye,
  Car,
  Home,
  Wrench,
  Package
} from "lucide-react"

interface AssetCardProps {
  asset: Asset
  onView?: (asset: Asset) => void
  onSell?: (asset: Asset) => void
  onTransfer?: (asset: Asset) => void
}

const categoryIcons = {
  vehicle: Car,
  property: Home,
  equipment: Wrench,
  other: Package,
}

export function AssetCard({ asset, onView, onSell, onTransfer }: AssetCardProps) {
  const CategoryIcon = categoryIcons[asset.category]
  const categoryConfig = ASSET_CATEGORIES[asset.category]

  const handleAction = (action: 'view' | 'sell' | 'transfer') => {
    switch (action) {
      case 'view':
        onView?.(asset)
        break
      case 'sell':
        onSell?.(asset)
        break
      case 'transfer':
        onTransfer?.(asset)
        break
    }
  }

  const getKeyIdentifier = () => {
    if (asset.identifiers?.vin) return `VIN: ${asset.identifiers.vin}`
    if (asset.identifiers?.serial) return `S/N: ${asset.identifiers.serial}`
    if (asset.identifiers?.plate) return `Plate: ${asset.identifiers.plate}`
    return `Token ID: ${asset.tokenId}`
  }

  const getKeyAttribute = () => {
    if (asset.attributes?.make && asset.attributes?.model) {
      return `${asset.attributes.make} ${asset.attributes.model}`
    }
    if (asset.attributes?.year) {
      return `Year: ${asset.attributes.year}`
    }
    return null
  }

  return (
    <Card className="group hover:shadow-md transition-all duration-200 animate-fadeIn">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-muted">
              <CategoryIcon className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-semibold truncate max-w-[200px]" title={asset.title}>
                {asset.title}
              </h3>
              <p className="text-sm text-muted-foreground">
                {categoryConfig?.label}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <StatusPill status={asset.status} />
            <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100">
              <MoreHorizontal className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pb-3">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Identifier:</span>
            <span className="font-mono text-xs">{getKeyIdentifier()}</span>
          </div>
          
          {getKeyAttribute() && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Details:</span>
              <span className="text-xs">{getKeyAttribute()}</span>
            </div>
          )}
          
          <div className="flex justify-between">
            <span className="text-muted-foreground">Owner:</span>
            <span className="font-mono text-xs">{formatAddress(asset.ownerAddress)}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-muted-foreground">Updated:</span>
            <span className="text-xs">{formatTimeAgo(asset.updatedAt)}</span>
          </div>

          {asset.note && (
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground italic line-clamp-2">
                "{asset.note}"
              </p>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="pt-0">
        <div className="flex gap-1 w-full">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => handleAction('view')}
          >
            <Eye className="h-3 w-3 mr-1" />
            View
          </Button>
          
          {asset.status === 'owned' && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => handleAction('sell')}
              >
                <ShoppingCart className="h-3 w-3 mr-1" />
                Sell
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => handleAction('transfer')}
              >
                <Send className="h-3 w-3 mr-1" />
                Transfer
              </Button>
            </>
          )}
          
          {asset.status === 'for_sale' && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              disabled
            >
              Listed for Sale
            </Button>
          )}
          
          {asset.status === 'escrow' && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              disabled
            >
              In Escrow
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  )
}