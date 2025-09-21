import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { Input } from "@/components/ui/Input"
import { useAppStore } from "@/stores/appStore"
import { useWallet, mockWalletConnect } from "@/stores/walletStore"
import { formatAddress } from "@/lib/utils"
import { 
  Settings as SettingsIcon,
  Wallet,
  Network,
  Database,
  Moon,
  Sun,
  RefreshCw,
  Download,
  Upload,
  Copy,
  ExternalLink
} from "lucide-react"

export function Settings() {
  const { theme, setTheme, stats, clearFilters } = useAppStore()
  const { 
    isConnected, 
    address, 
    network, 
    balance, 
    disconnect 
  } = useWallet()

  const handleThemeToggle = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  const handleDisconnectWallet = () => {
    disconnect()
  }

  const handleConnectWallet = () => {
    mockWalletConnect()
  }

  const handleExportData = async () => {
    // TODO: Implement data export
    console.log('Export data')
  }

  const handleImportData = () => {
    // TODO: Implement data import
    console.log('Import data')
  }

  const handleRefreshData = () => {
    // TODO: Implement data refresh
    window.location.reload()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your wallet connection, preferences, and data
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Wallet Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Wallet Connection
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isConnected ? (
              <>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Connected Address</label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="text-sm bg-muted px-2 py-1 rounded flex-1">
                      {formatAddress(address!, 12)}
                    </code>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => navigator.clipboard.writeText(address!)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {balance && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Balance</label>
                    <p className="text-lg font-medium">{balance} MATIC</p>
                  </div>
                )}

                {network && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Network</label>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="h-2 w-2 rounded-full bg-green-500" />
                      <span>{network.name}</span>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6"
                        onClick={() => window.open(network.explorerUrl, '_blank')}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}

                <Button variant="destructive" onClick={handleDisconnectWallet}>
                  Disconnect Wallet
                </Button>
              </>
            ) : (
              <div className="text-center py-4">
                <p className="text-muted-foreground mb-4">No wallet connected</p>
                <Button onClick={handleConnectWallet} className="gap-2">
                  <Wallet className="h-4 w-4" />
                  Connect Wallet
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Network Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Network className="h-5 w-5" />
              Network Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Asset Chain</span>
              <Badge variant="outline" className="gap-1">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                Polygon Amoy
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Bitcoin Network</span>
              <Badge variant="outline" className="gap-1">
                <div className="h-2 w-2 rounded-full bg-orange-500" />
                Testnet
              </Badge>
            </div>

            {stats && (
              <div className="space-y-2 pt-2 border-t">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Last Block</span>
                  <span className="font-mono text-sm">#{stats.lastBlockProcessed}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total Assets</span>
                  <span className="font-medium">{stats.totalAssets}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total Events</span>
                  <span className="font-medium">{stats.totalEvents}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* App Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon className="h-5 w-5" />
              Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium">Theme</label>
                <p className="text-xs text-muted-foreground">Toggle between light and dark mode</p>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={handleThemeToggle}
              >
                {theme === 'dark' ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium">Clear Filters</label>
                <p className="text-xs text-muted-foreground">Reset all portfolio filters</p>
              </div>
              <Button variant="outline" onClick={clearFilters}>
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Data Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Data Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium">Refresh Data</label>
                <p className="text-xs text-muted-foreground">Reload all asset and event data</p>
              </div>
              <Button variant="outline" onClick={handleRefreshData} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium">Export Data</label>
                <p className="text-xs text-muted-foreground">Download your portfolio data</p>
              </div>
              <Button variant="outline" onClick={handleExportData} className="gap-2">
                <Download className="h-4 w-4" />
                Export
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium">Import Data</label>
                <p className="text-xs text-muted-foreground">Import portfolio data from file</p>
              </div>
              <Button variant="outline" onClick={handleImportData} className="gap-2">
                <Upload className="h-4 w-4" />
                Import
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* API Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            API Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Indexer API URL</label>
            <Input 
              value={import.meta.env.VITE_API_URL || "http://localhost:3001"}
              readOnly
              className="font-mono text-sm"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground">WebSocket URL</label>
            <Input 
              value={import.meta.env.VITE_WS_URL || "ws://localhost:3001"}
              readOnly
              className="font-mono text-sm"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground">Contract Address</label>
            <div className="flex items-center gap-2">
              <Input 
                value={import.meta.env.VITE_CONTRACT_ADDRESS || "Not configured"}
                readOnly
                className="font-mono text-sm flex-1"
              />
              {import.meta.env.VITE_CONTRACT_ADDRESS && (
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => {
                    const url = `https://amoy.polygonscan.com/address/${import.meta.env.VITE_CONTRACT_ADDRESS}`
                    window.open(url, '_blank')
                  }}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}