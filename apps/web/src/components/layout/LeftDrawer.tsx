import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { useAppStore } from "@/stores/appStore"
import { useAssetsByStatus, useAssetsByCategory } from "@/stores/appStore"
import { cn } from "@/lib/utils"
import { 
  Grid3X3, 
  History, 
  Settings, 
  Car, 
  Home, 
  Wrench, 
  Package,
  Clock,
  ShoppingCart,
  CheckCircle2,
  RefreshCw
} from "lucide-react"

const navigationItems = [
  { id: 'portfolio', label: 'Portfolio', icon: Grid3X3, view: 'portfolio' as const },
  { id: 'history', label: 'History', icon: History, view: 'history' as const },
  { id: 'settings', label: 'Settings', icon: Settings, view: 'settings' as const },
]

const categoryItems = [
  { id: 'vehicle', label: 'Vehicles', icon: Car },
  { id: 'property', label: 'Property', icon: Home },
  { id: 'equipment', label: 'Equipment', icon: Wrench },
  { id: 'other', label: 'Other', icon: Package },
]

const statusItems = [
  { id: 'owned', label: 'Owned', icon: CheckCircle2 },
  { id: 'for_sale', label: 'For Sale', icon: ShoppingCart },
  { id: 'escrow', label: 'In Escrow', icon: Clock },
  { id: 'settled', label: 'Settled', icon: CheckCircle2 },
  { id: 'refunded', label: 'Refunded', icon: RefreshCw },
]

export function LeftDrawer() {
  const { 
    sidebarOpen, 
    currentView, 
    setCurrentView, 
    filters, 
    setFilter 
  } = useAppStore()
  
  const assetsByStatus = useAssetsByStatus()
  const assetsByCategory = useAssetsByCategory()

  if (!sidebarOpen) return null

  return (
    <div className="w-64 border-r border-border bg-background p-4">
      <div className="space-y-6">
        {/* Navigation */}
        <div>
          <h3 className="mb-2 text-sm font-medium text-muted-foreground">
            Navigation
          </h3>
          <div className="space-y-1">
            {navigationItems.map((item) => {
              const Icon = item.icon
              return (
                <Button
                  key={item.id}
                  variant={currentView === item.view ? "secondary" : "ghost"}
                  className="w-full justify-start gap-2"
                  onClick={() => setCurrentView(item.view)}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Button>
              )
            })}
          </div>
        </div>

        {/* Categories Filter */}
        {currentView === 'portfolio' && (
          <div>
            <h3 className="mb-2 text-sm font-medium text-muted-foreground">
              Categories
            </h3>
            <div className="space-y-1">
              <Button
                variant={!filters.category ? "secondary" : "ghost"}
                className="w-full justify-between"
                onClick={() => setFilter('category', null)}
              >
                <span className="flex items-center gap-2">
                  <Grid3X3 className="h-4 w-4" />
                  All Assets
                </span>
                <Badge variant="outline">
                  {Object.values(assetsByCategory).reduce((sum, assets) => sum + assets.length, 0)}
                </Badge>
              </Button>
              
              {categoryItems.map((item) => {
                const Icon = item.icon
                const count = assetsByCategory[item.id]?.length || 0
                return (
                  <Button
                    key={item.id}
                    variant={filters.category === item.id ? "secondary" : "ghost"}
                    className="w-full justify-between"
                    onClick={() => setFilter('category', item.id)}
                  >
                    <span className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </span>
                    {count > 0 && (
                      <Badge variant="outline">{count}</Badge>
                    )}
                  </Button>
                )
              })}
            </div>
          </div>
        )}

        {/* Status Filter */}
        {currentView === 'portfolio' && (
          <div>
            <h3 className="mb-2 text-sm font-medium text-muted-foreground">
              Status
            </h3>
            <div className="space-y-1">
              <Button
                variant={!filters.status ? "secondary" : "ghost"}
                className="w-full justify-between"
                onClick={() => setFilter('status', null)}
              >
                <span className="flex items-center gap-2">
                  <Grid3X3 className="h-4 w-4" />
                  All Status
                </span>
                <Badge variant="outline">
                  {Object.values(assetsByStatus).reduce((sum, assets) => sum + assets.length, 0)}
                </Badge>
              </Button>
              
              {statusItems.map((item) => {
                const Icon = item.icon
                const count = assetsByStatus[item.id]?.length || 0
                return (
                  <Button
                    key={item.id}
                    variant={filters.status === item.id ? "secondary" : "ghost"}
                    className="w-full justify-between"
                    onClick={() => setFilter('status', item.id)}
                  >
                    <span className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </span>
                    {count > 0 && (
                      <Badge variant="outline">{count}</Badge>
                    )}
                  </Button>
                )
              })}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div>
          <h3 className="mb-2 text-sm font-medium text-muted-foreground">
            Quick Actions
          </h3>
          <div className="space-y-1">
            <Button variant="outline" className="w-full justify-start gap-2">
              <Package className="h-4 w-4" />
              Mint Asset
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}