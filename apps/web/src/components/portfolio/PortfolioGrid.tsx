import { AssetCard } from "./AssetCard"
import { LoadingSpinner } from "@/components/common/LoadingSpinner"
import { Button } from "@/components/ui/Button"
import { useFilteredAssets, useAppStore } from "@/stores/appStore"
import { Asset } from "@coldDrawer/shared"
import { Plus, Filter, Search } from "lucide-react"
import { Input } from "@/components/ui/Input"

interface PortfolioGridProps {
  onViewAsset?: (asset: Asset) => void
  onSellAsset?: (asset: Asset) => void
  onTransferAsset?: (asset: Asset) => void
  onMintAsset?: () => void
}

export function PortfolioGrid({ 
  onViewAsset, 
  onSellAsset, 
  onTransferAsset,
  onMintAsset 
}: PortfolioGridProps) {
  const assets = useFilteredAssets()
  const { loading, filters, setFilter, clearFilters } = useAppStore()

  const isLoading = loading.assets

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Portfolio</h1>
          <p className="text-muted-foreground">
            {assets.length} asset{assets.length !== 1 ? 's' : ''} in your collection
          </p>
        </div>
        
        <Button onClick={onMintAsset} className="gap-2">
          <Plus className="h-4 w-4" />
          Mint Asset
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search assets..."
            value={filters.search}
            onChange={(e) => setFilter('search', e.target.value)}
            className="pl-9"
          />
        </div>
        
        {(filters.category || filters.status || filters.search) && (
          <Button
            variant="outline"
            onClick={clearFilters}
            className="gap-2"
          >
            <Filter className="h-4 w-4" />
            Clear Filters
          </Button>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
          <span className="ml-2 text-muted-foreground">Loading assets...</span>
        </div>
      ) : assets.length === 0 ? (
        <EmptyState 
          hasFilters={!!(filters.category || filters.status || filters.search)}
          onMintAsset={onMintAsset}
          onClearFilters={clearFilters}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {assets.map((asset) => (
            <AssetCard
              key={asset.tokenId}
              asset={asset}
              onView={onViewAsset}
              onSell={onSellAsset}
              onTransfer={onTransferAsset}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface EmptyStateProps {
  hasFilters: boolean
  onMintAsset?: () => void
  onClearFilters: () => void
}

function EmptyState({ hasFilters, onMintAsset, onClearFilters }: EmptyStateProps) {
  if (hasFilters) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="p-4 rounded-full bg-muted mb-4">
          <Search className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">No assets found</h3>
        <p className="text-muted-foreground mb-4 max-w-md">
          No assets match your current filters. Try adjusting your search criteria.
        </p>
        <Button variant="outline" onClick={onClearFilters}>
          Clear Filters
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="p-4 rounded-full bg-muted mb-4">
        <Plus className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">No assets yet</h3>
      <p className="text-muted-foreground mb-4 max-w-md">
        Start building your digital asset portfolio by minting your first asset.
      </p>
      <Button onClick={onMintAsset} className="gap-2">
        <Plus className="h-4 w-4" />
        Mint Your First Asset
      </Button>
    </div>
  )
}