import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { Asset, AssetEvent } from '@coldDrawer/shared'

interface AppState {
  // UI State
  sidebarOpen: boolean
  currentView: 'portfolio' | 'history' | 'settings'
  theme: 'light' | 'dark'
  
  // Data State
  assets: Asset[]
  events: AssetEvent[]
  stats: {
    totalAssets: number
    totalEvents: number
    lastBlockProcessed: number
    assetsByStatus: Record<string, number>
    assetsByCategory: Record<string, number>
  } | null
  
  // Loading States
  loading: {
    assets: boolean
    events: boolean
    stats: boolean
  }
  
  // Filters
  filters: {
    category: string | null
    status: string | null
    search: string
  }
  
  // Error State
  error: string | null
}

interface AppActions {
  // UI Actions
  setSidebarOpen: (open: boolean) => void
  setCurrentView: (view: AppState['currentView']) => void
  setTheme: (theme: AppState['theme']) => void
  
  // Data Actions
  setAssets: (assets: Asset[]) => void
  addAsset: (asset: Asset) => void
  updateAsset: (tokenId: string, updates: Partial<Asset>) => void
  setEvents: (events: AssetEvent[]) => void
  addEvent: (event: AssetEvent) => void
  setStats: (stats: AppState['stats']) => void
  
  // Loading Actions
  setLoading: (key: keyof AppState['loading'], loading: boolean) => void
  
  // Filter Actions
  setFilter: (key: keyof AppState['filters'], value: string | null) => void
  clearFilters: () => void
  
  // Error Actions
  setError: (error: string | null) => void
  
  // Utility Actions
  reset: () => void
}

const initialState: AppState = {
  sidebarOpen: true,
  currentView: 'portfolio',
  theme: 'dark',
  assets: [],
  events: [],
  stats: null,
  loading: {
    assets: false,
    events: false,
    stats: false,
  },
  filters: {
    category: null,
    status: null,
    search: '',
  },
  error: null,
}

export const useAppStore = create<AppState & AppActions>()(
  devtools(
    (set, get) => ({
      ...initialState,
      
      // UI Actions
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      
      setCurrentView: (view) => set({ currentView: view }),
      
      setTheme: (theme) => {
        set({ theme })
        document.documentElement.classList.toggle('dark', theme === 'dark')
        localStorage.setItem('theme', theme)
      },
      
      // Data Actions
      setAssets: (assets) => set({ assets }),
      
      addAsset: (asset) => set((state) => ({
        assets: [asset, ...state.assets.filter(a => a.tokenId !== asset.tokenId)]
      })),
      
      updateAsset: (tokenId, updates) => set((state) => ({
        assets: state.assets.map(asset =>
          asset.tokenId === tokenId ? { ...asset, ...updates } : asset
        )
      })),
      
      setEvents: (events) => set({ events }),
      
      addEvent: (event) => set((state) => ({
        events: [event, ...state.events.filter(e => e.txid !== event.txid)]
      })),
      
      setStats: (stats) => set({ stats }),
      
      // Loading Actions
      setLoading: (key, loading) => set((state) => ({
        loading: { ...state.loading, [key]: loading }
      })),
      
      // Filter Actions
      setFilter: (key, value) => set((state) => ({
        filters: { ...state.filters, [key]: value }
      })),
      
      clearFilters: () => set({
        filters: { category: null, status: null, search: '' }
      }),
      
      // Error Actions
      setError: (error) => set({ error }),
      
      // Utility Actions
      reset: () => set(initialState),
    }),
    {
      name: 'coldDrawer-app-store',
    }
  )
)

// Selectors
export const useAssets = () => useAppStore((state) => state.assets)
export const useFilteredAssets = () => useAppStore((state) => {
  let filtered = state.assets
  
  if (state.filters.category) {
    filtered = filtered.filter(asset => asset.category === state.filters.category)
  }
  
  if (state.filters.status) {
    filtered = filtered.filter(asset => asset.status === state.filters.status)
  }
  
  if (state.filters.search) {
    const search = state.filters.search.toLowerCase()
    filtered = filtered.filter(asset =>
      asset.title.toLowerCase().includes(search) ||
      asset.category.toLowerCase().includes(search) ||
      (asset.note && asset.note.toLowerCase().includes(search)) ||
      JSON.stringify(asset.identifiers || {}).toLowerCase().includes(search) ||
      JSON.stringify(asset.attributes || {}).toLowerCase().includes(search)
    )
  }
  
  return filtered
})

export const useAssetsByCategory = () => useAppStore((state) => {
  const assets = state.assets
  const byCategory: Record<string, Asset[]> = {}
  
  for (const asset of assets) {
    if (!byCategory[asset.category]) {
      byCategory[asset.category] = []
    }
    byCategory[asset.category].push(asset)
  }
  
  return byCategory
})

export const useAssetsByStatus = () => useAppStore((state) => {
  const assets = state.assets
  const byStatus: Record<string, Asset[]> = {}
  
  for (const asset of assets) {
    if (!byStatus[asset.status]) {
      byStatus[asset.status] = []
    }
    byStatus[asset.status].push(asset)
  }
  
  return byStatus
})