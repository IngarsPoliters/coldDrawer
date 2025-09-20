import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

interface WalletState {
  // Connection State
  isConnected: boolean
  address: string | null
  chainId: number | null
  
  // Balance State
  balance: string | null
  
  // Network State
  network: {
    name: string
    chainId: number
    explorerUrl: string
  } | null
  
  // UI State
  showConnectModal: boolean
  
  // Error State
  error: string | null
}

interface WalletActions {
  // Connection Actions
  connect: (address: string, chainId: number) => void
  disconnect: () => void
  setNetwork: (network: WalletState['network']) => void
  
  // Balance Actions
  setBalance: (balance: string) => void
  
  // UI Actions
  setShowConnectModal: (show: boolean) => void
  
  // Error Actions
  setError: (error: string | null) => void
  
  // Utility
  reset: () => void
}

const initialState: WalletState = {
  isConnected: false,
  address: null,
  chainId: null,
  balance: null,
  network: null,
  showConnectModal: false,
  error: null,
}

export const useWalletStore = create<WalletState & WalletActions>()(
  devtools(
    (set, get) => ({
      ...initialState,
      
      connect: (address, chainId) => set({
        isConnected: true,
        address,
        chainId,
        error: null,
      }),
      
      disconnect: () => set({
        isConnected: false,
        address: null,
        chainId: null,
        balance: null,
        network: null,
        error: null,
      }),
      
      setNetwork: (network) => set({ network }),
      
      setBalance: (balance) => set({ balance }),
      
      setShowConnectModal: (show) => set({ showConnectModal: show }),
      
      setError: (error) => set({ error }),
      
      reset: () => set(initialState),
    }),
    {
      name: 'coldDrawer-wallet-store',
    }
  )
)

// Mock wallet connection for demo
export const mockWalletConnect = () => {
  const { connect, setNetwork, setBalance } = useWalletStore.getState()
  
  // Simulate wallet connection
  const mockAddress = '0x742d35Cc6635C0532925a3b8D598C1F2db5C23dE'
  const mockChainId = 80002 // Polygon Amoy
  
  connect(mockAddress, mockChainId)
  
  setNetwork({
    name: 'Polygon Amoy Testnet',
    chainId: 80002,
    explorerUrl: 'https://amoy.polygonscan.com'
  })
  
  setBalance('1.23456789') // Mock MATIC balance
}

// Selectors
export const useWallet = () => useWalletStore()
export const useWalletAddress = () => useWalletStore((state) => state.address)
export const useWalletConnected = () => useWalletStore((state) => state.isConnected)