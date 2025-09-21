import { Card, CardContent } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { useAssetsByCategory, useAppStore } from "@/stores/appStore"
import { 
  Car, 
  Home, 
  Wrench, 
  Package,
  TrendingUp,
  TrendingDown,
  Minus
} from "lucide-react"

const categoryConfig = {
  vehicle: {
    label: "Vehicles",
    icon: Car,
    color: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    iconColor: "text-blue-600 dark:text-blue-400"
  },
  property: {
    label: "Property",
    icon: Home,
    color: "bg-green-500/10 text-green-600 dark:text-green-400",
    iconColor: "text-green-600 dark:text-green-400"
  },
  equipment: {
    label: "Equipment",
    icon: Wrench,
    color: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    iconColor: "text-purple-600 dark:text-purple-400"
  },
  other: {
    label: "Other",
    icon: Package,
    color: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
    iconColor: "text-orange-600 dark:text-orange-400"
  }
}

export function CategoryOverview() {
  const assetsByCategory = useAssetsByCategory()
  const { setFilter, filters } = useAppStore()

  const categories = Object.entries(categoryConfig).map(([key, config]) => {
    const assets = assetsByCategory[key] || []
    const count = assets.length
    const value = assets.reduce((sum, asset) => {
      // Mock value calculation - in real app would use actual values
      const baseValue = Math.random() * 100000 + 10000
      return sum + baseValue
    }, 0)

    return {
      key,
      ...config,
      count,
      value,
      assets
    }
  })

  const totalValue = categories.reduce((sum, cat) => sum + cat.value, 0)
  const totalAssets = categories.reduce((sum, cat) => sum + cat.count, 0)

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Assets</p>
                <p className="text-2xl font-bold">{totalAssets}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Portfolio Value</p>
                <p className="text-2xl font-bold">${(totalValue / 1000).toFixed(0)}K</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Car className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Categories</p>
                <p className="text-2xl font-bold">{categories.filter(c => c.count > 0).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Tiles */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Asset Categories</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {categories.map((category) => {
            const Icon = category.icon
            const isSelected = filters.category === category.key
            
            return (
              <Card 
                key={category.key}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  isSelected ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => setFilter('category', isSelected ? null : category.key)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-3 rounded-lg ${category.color}`}>
                      <Icon className={`h-6 w-6 ${category.iconColor}`} />
                    </div>
                    {isSelected && (
                      <Badge variant="default" className="text-xs">
                        Active
                      </Badge>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-semibold">{category.label}</h4>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>{category.count} asset{category.count !== 1 ? 's' : ''}</span>
                      <span>${(category.value / 1000).toFixed(0)}K</span>
                    </div>
                    
                    {category.count > 0 && (
                      <div className="flex items-center gap-1 text-xs">
                        <TrendingUp className="h-3 w-3 text-green-500" />
                        <span className="text-green-600 dark:text-green-400">
                          +{Math.floor(Math.random() * 15 + 5)}%
                        </span>
                        <span className="text-muted-foreground">this month</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}