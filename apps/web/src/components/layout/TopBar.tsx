import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { useWallet, mockWalletConnect } from "@/stores/walletStore"
import { useAppStore } from "@/stores/appStore"
import { formatAddress } from "@/lib/utils"
import { Wallet, Menu, Settings, Bell } from "lucide-react"

export function TopBar() {
  const { isConnected, address, network, balance } = useWallet()
  const { setSidebarOpen, sidebarOpen, stats } = useAppStore()

  const handleConnectWallet = () => {
    if (!isConnected) {
      mockWalletConnect()
    }
  }

  return (
    <div className="flex h-16 items-center justify-between border-b border-border bg-background px-6">
      {/* Left side */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </Button>
        
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold">coldDrawer</h1>
          <Badge variant="outline" className="text-xs">
            Beta
          </Badge>
        </div>
      </div>

      {/* Center - Network Status */}
      <div className="hidden md:flex items-center gap-4">
        {network && (
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            <span className="text-sm text-muted-foreground">
              {network.name}
            </span>
          </div>
        )}
        
        {stats && (
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>{stats.totalAssets} Assets</span>
            <span>Block #{stats.lastBlockProcessed}</span>
          </div>
        )}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <Button variant="ghost" size="icon" className="hidden md:flex">
          <Bell className="h-4 w-4" />
        </Button>

        {/* Settings */}
        <Button variant="ghost" size="icon" className="hidden md:flex">
          <Settings className="h-4 w-4" />
        </Button>

        {/* Wallet Connection */}
        {isConnected ? (
          <div className="flex items-center gap-2">
            {balance && (
              <span className="hidden sm:block text-sm text-muted-foreground">
                {balance} MATIC
              </span>
            )}
            <Button variant="outline" className="gap-2">
              <Wallet className="h-4 w-4" />
              <span className="hidden sm:inline">
                {formatAddress(address!)}
              </span>
            </Button>
          </div>
        ) : (
          <Button onClick={handleConnectWallet} className="gap-2">
            <Wallet className="h-4 w-4" />
            Connect Wallet
          </Button>
        )}
      </div>
    </div>
  )
}