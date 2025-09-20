import { Asset, AssetEvent, EventFilter } from '@coldDrawer/shared'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        ...options,
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error)
      throw error
    }
  }

  // Assets
  async getAssets(params: {
    owner?: string
    category?: string
    status?: string
    search?: string
    limit?: number
    offset?: number
  } = {}): Promise<{
    assets: Asset[]
    total: number
    limit: number
    offset: number
    hasMore: boolean
  }> {
    const query = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        query.append(key, value.toString())
      }
    })
    
    return this.request(`/api/assets?${query}`)
  }

  async getAsset(tokenId: string): Promise<Asset> {
    return this.request(`/api/assets/${tokenId}`)
  }

  async getAssetEvents(tokenId: string): Promise<{
    events: AssetEvent[]
    tokenId: string
  }> {
    return this.request(`/api/assets/${tokenId}/events`)
  }

  // Events
  async getEvents(filter: EventFilter = {}): Promise<{
    events: AssetEvent[]
    filter: EventFilter
  }> {
    const query = new URLSearchParams()
    Object.entries(filter).forEach(([key, value]) => {
      if (value !== undefined) {
        query.append(key, value.toString())
      }
    })
    
    return this.request(`/api/events?${query}`)
  }

  // Portfolio
  async getPortfolio(address: string): Promise<{
    owner: string
    totalAssets: number
    byCategory: Record<string, number>
    byStatus: Record<string, number>
    assets: Asset[]
  }> {
    return this.request(`/api/portfolio/${address}`)
  }

  // Stats
  async getStats(): Promise<{
    totalAssets: number
    totalEvents: number
    lastBlockProcessed: number
    assetsByStatus: Record<string, number>
    assetsByCategory: Record<string, number>
  }> {
    return this.request('/api/stats')
  }

  // Health
  async getHealth(): Promise<any> {
    return this.request('/health')
  }

  // Admin
  async forceSync(fromBlock?: number): Promise<{
    success: boolean
    message: string
    fromBlock?: number
  }> {
    return this.request('/api/admin/sync', {
      method: 'POST',
      body: JSON.stringify({ fromBlock }),
    })
  }
}

export const apiClient = new ApiClient(API_BASE_URL)

// WebSocket client
export class WebSocketClient {
  private ws: WebSocket | null = null
  private url: string
  private listeners = new Map<string, Set<(data: any) => void>>()

  constructor(url: string) {
    this.url = url
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url)

        this.ws.onopen = () => {
          console.log('WebSocket connected')
          resolve()
        }

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data)
            this.handleMessage(message)
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error)
          }
        }

        this.ws.onclose = () => {
          console.log('WebSocket disconnected')
          this.ws = null
        }

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error)
          reject(error)
        }

      } catch (error) {
        reject(error)
      }
    })
  }

  private handleMessage(message: any) {
    if (message.type === 'event' && message.data?.event) {
      const eventType = message.data.event
      const listeners = this.listeners.get(eventType)
      
      if (listeners) {
        listeners.forEach(listener => listener(message.data.data))
      }
    }
  }

  subscribe(eventType: string, listener: (data: any) => void) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set())
    }
    
    this.listeners.get(eventType)!.add(listener)

    // Send subscription message
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'subscribe',
        data: { type: eventType }
      }))
    }
  }

  unsubscribe(eventType: string, listener: (data: any) => void) {
    const listeners = this.listeners.get(eventType)
    if (listeners) {
      listeners.delete(listener)
      if (listeners.size === 0) {
        this.listeners.delete(eventType)
      }
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }
}

export const wsClient = new WebSocketClient(
  import.meta.env.VITE_WS_URL || 'ws://localhost:3001'
)