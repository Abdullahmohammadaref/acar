import { useState } from "react"
import { Outlet } from "react-router-dom"
import { cn } from "@/lib/utils"
import { Sidebar } from "./Sidebar"
import { Header } from "./Header"

/**
 * Main application layout with sidebar, header, and content area
 */
export function AppLayout() {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

    return (
        <div className="min-h-screen bg-background">
            {/* Sidebar */}
            <Sidebar
                collapsed={sidebarCollapsed}
                onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
            />

            {/* Header */}
            <Header sidebarCollapsed={sidebarCollapsed} />

            {/* Main Content */}
            <main
                className={cn(
                    "min-h-screen pt-16 transition-all duration-300",
                    sidebarCollapsed ? "pl-16" : "pl-64"
                )}
            >
                <div className="p-8 pb-32">
                    <Outlet />
                </div>
            </main>
        </div>
    )
}
