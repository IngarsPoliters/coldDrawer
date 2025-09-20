import { useEffect } from "react"
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Layout } from "@/components/layout/Layout"
import { Portfolio } from "@/pages/Portfolio"
import { History } from "@/pages/History"
import { Settings } from "@/pages/Settings"
import { useAppStore } from "@/stores/appStore"
import { wsClient } from "@/lib/api"
import "@/styles/globals.css"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
})

function App() {
  const { setTheme, currentView, addEvent, addAsset } = useAppStore()

  // Initialize theme
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark'
    if (savedTheme) {
      setTheme(savedTheme)
    } else {
      // Default to dark theme
      setTheme('dark')
    }
  }, [setTheme])

  // Initialize WebSocket connection
  useEffect(() => {
    const connectWebSocket = async () => {
      try {
        await wsClient.connect()

        // Subscribe to real-time events
        wsClient.subscribe('asset_event', (event) => {
          addEvent(event)
        })

        wsClient.subscribe('asset_update', (asset) => {
          addAsset(asset)
        })

        console.log('WebSocket connected successfully')
      } catch (error) {
        console.warn('WebSocket connection failed:', error)
        // Continue without real-time updates
      }
    }

    connectWebSocket()

    return () => {
      wsClient.disconnect()
    }
  }, [addEvent, addAsset])

  const renderCurrentView = () => {
    switch (currentView) {
      case 'portfolio':
        return <Portfolio />
      case 'history':
        return <History />
      case 'settings':
        return <Settings />
      default:
        return <Portfolio />
    }
  }

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-background text-foreground">
        <Layout>
          {renderCurrentView()}
        </Layout>
      </div>
    </QueryClientProvider>
  )
}

export default App