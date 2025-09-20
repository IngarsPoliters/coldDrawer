import { ReactNode } from "react"
import { TopBar } from "./TopBar"
import { LeftDrawer } from "./LeftDrawer"
import { useAppStore } from "@/stores/appStore"
import { cn } from "@/lib/utils"

interface LayoutProps {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  const sidebarOpen = useAppStore((state) => state.sidebarOpen)
  
  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      
      <div className="flex">
        <div className={cn(
          "transition-all duration-200 ease-in-out",
          sidebarOpen ? "w-64" : "w-0"
        )}>
          <LeftDrawer />
        </div>
        
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}