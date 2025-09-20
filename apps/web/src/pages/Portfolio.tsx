import { useState, useEffect } from "react"
import { PortfolioGrid } from "@/components/portfolio/PortfolioGrid"
import { AssetDetails } from "@/components/asset/AssetDetails"
import { useAppStore } from "@/stores/appStore"
import { useWalletConnected } from "@/stores/walletStore"
import { apiClient } from "@/lib/api"
import { Asset, AssetEvent } from "@coldDrawer/shared"
import { Button } from "@/components/ui/Button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Wallet } from "lucide-react"

type View = 'grid' | 'details'

export function Portfolio() {
  const [currentView, setCurrentView] = useState<View>('grid')
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)
  const [assetEvents, setAssetEvents] = useState<AssetEvent[]>([])
  
  const isConnected = useWalletConnected()
  const { 
    setAssets, 
    setLoading, 
    setError,
    setStats 
  } = useAppStore()

  // Load portfolio data
  useEffect(() => {
    if (!isConnected) return

    const loadPortfolio = async () => {
      try {
        setLoading('assets', true)
        setError(null)

        // Load assets and stats in parallel
        const [assetsResponse, statsResponse] = await Promise.all([
          apiClient.getAssets({ limit: 100 }),
          apiClient.getStats()
        ])

        setAssets(assetsResponse.assets)
        setStats(statsResponse)

      } catch (error) {
        console.error('Failed to load portfolio:', error)
        setError('Failed to load portfolio. Please try again.')
      } finally {
        setLoading('assets', false)
      }
    }

    loadPortfolio()
  }, [isConnected, setAssets, setLoading, setError, setStats])

  const handleViewAsset = async (asset: Asset) => {
    try {
      setLoading('events', true)
      const response = await apiClient.getAssetEvents(asset.tokenId)
      setAssetEvents(response.events)
      setSelectedAsset(asset)
      setCurrentView('details')
    } catch (error) {
      console.error('Failed to load asset events:', error)
      setError('Failed to load asset details.')
    } finally {
      setLoading('events', false)
    }
  }

  const handleBackToGrid = () => {
    setCurrentView('grid')
    setSelectedAsset(null)
    setAssetEvents([])
  }

  const handleSellAsset = (asset: Asset) => {
    // TODO: Open sell modal
    console.log('Sell asset:', asset)
  }

  const handleTransferAsset = (asset: Asset) => {
    // TODO: Open transfer modal  
    console.log('Transfer asset:', asset)
  }

  const handleMintAsset = () => {
    // TODO: Open mint modal
    console.log('Mint new asset')
  }

  // Show wallet connection prompt if not connected
  if (!isConnected) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="p-4 rounded-full bg-muted w-fit mx-auto mb-4">
              <Wallet className="h-8 w-8" />
            </div>
            <CardTitle>Connect Your Wallet</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-4">
              Connect your wallet to view and manage your digital assets.
            </p>
            <Button className="w-full gap-2">
              <Wallet className="h-4 w-4" />
              Connect Wallet
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Render based on current view
  if (currentView === 'details' && selectedAsset) {
    return (
      <AssetDetails
        asset={selectedAsset}
        events={assetEvents}
        onBack={handleBackToGrid}
        onSell={handleSellAsset}
        onTransfer={handleTransferAsset}
      />
    )
  }

  return (
    <PortfolioGrid
      onViewAsset={handleViewAsset}
      onSellAsset={handleSellAsset}
      onTransferAsset={handleTransferAsset}
      onMintAsset={handleMintAsset}
    />
  )
}