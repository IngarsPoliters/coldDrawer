import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatAddress(address: string, length = 6): string {
  if (!address) return ''
  return `${address.slice(0, length)}...${address.slice(-4)}`
}

export function formatBTC(satoshis: string | number): string {
  const sats = typeof satoshis === 'string' ? parseInt(satoshis) : satoshis
  return (sats / 100000000).toFixed(8) + ' BTC'
}

export function formatTimeAgo(timestamp: number): string {
  const now = Math.floor(Date.now() / 1000)
  const diff = now - timestamp
  
  if (diff < 60) return 'Just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString()
}

export function copyToClipboard(text: string): void {
  navigator.clipboard.writeText(text)
}

export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address)
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}