import { useState, useEffect } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"
import { Moon, Sun, User, LogOut, ChevronDown, Building, Settings, ZoomIn, ZoomOut, UserCog } from "lucide-react"
import { NotificationsDropdown } from "@/components/layout/NotificationsDropdown"
import { useAuth } from "@/lib/auth"
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher"
import { SUPPORTED_LOCALES, DEFAULT_LOCALE, type SupportedLocale } from "@/lib/i18n"

interface HeaderProps {
    sidebarCollapsed: boolean
}

export function Header({ sidebarCollapsed }: HeaderProps) {
    const { user, logout } = useAuth()
    const navigate = useNavigate()
    const { t } = useTranslation()
    const { business_slug, locale } = useParams<{ business_slug: string; locale?: string }>()
    const [darkMode, setDarkMode] = useState(false)
    const [userMenuOpen, setUserMenuOpen] = useState(false)
    const [uiScale, setUiScale] = useState<number>(0.7)

    // Determine current locale
    const currentLocale = (locale && SUPPORTED_LOCALES.includes(locale as SupportedLocale))
        ? locale as SupportedLocale
        : DEFAULT_LOCALE

    // Build href with locale
    const buildHref = (path: string) => {
        if (currentLocale === DEFAULT_LOCALE) {
            return `/${business_slug}/${path}`
        }
        return `/${business_slug}/${currentLocale}/${path}`
    }

    // Initialize dark mode from localStorage or system preference
    useEffect(() => {
        const stored = localStorage.getItem("theme")
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
        const isDark = stored === "dark" || (!stored && prefersDark)
        setDarkMode(isDark)
        document.documentElement.classList.toggle("dark", isDark)

        // Initialize UI scale
        const storedScale = localStorage.getItem("ui-scale")
        const scale = storedScale ? parseFloat(storedScale) : 0.7
        setUiScale(scale)
        ;(document.documentElement.style as any).zoom = ""
        document.documentElement.style.fontSize = `${16 * scale}px`
    }, [])

    const handleZoomIn = () => {
        const newScale = Math.min(Math.round((uiScale + 0.1) * 10) / 10, 3.0)
        setUiScale(newScale)
        ;(document.documentElement.style as any).zoom = ""
        document.documentElement.style.fontSize = `${16 * newScale}px`
        localStorage.setItem("ui-scale", newScale.toString())
    }

    const handleZoomOut = () => {
        const newScale = Math.max(Math.round((uiScale - 0.1) * 10) / 10, 0.2)
        setUiScale(newScale)
        ;(document.documentElement.style as any).zoom = ""
        document.documentElement.style.fontSize = `${16 * newScale}px`
        localStorage.setItem("ui-scale", newScale.toString())
    }

    // Toggle dark mode
    const toggleDarkMode = () => {
        const newDarkMode = !darkMode
        setDarkMode(newDarkMode)
        document.documentElement.classList.toggle("dark", newDarkMode)
        localStorage.setItem("theme", newDarkMode ? "dark" : "light")
    }

    const handleLogout = () => {
        setUserMenuOpen(false)
        logout()
    }

    const handleNavigate = (path: string) => {
        setUserMenuOpen(false)
        navigate(buildHref(path))
    }

    return (
        <header
            className={cn(
                "fixed right-0 top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background px-6 transition-all duration-300",
                sidebarCollapsed ? "left-16" : "left-64"
            )}
        >
            {/* Business Name / Page Title */}
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <Building className="h-5 w-5 text-muted-foreground" />
                    <h1 className="text-lg font-semibold text-foreground">
                        {user?.business_name || t('common.vehicleManagement')}
                    </h1>
                </div>
            </div>

            {/* Right side actions */}
            <div className="flex items-center gap-2">
                {/* Notifications */}
                <NotificationsDropdown />

                {/* UI Scale Controls */}
                <div className="flex items-center mx-1 border border-border rounded-lg overflow-hidden bg-background">
                    <button
                        onClick={handleZoomOut}
                        className="flex h-9 w-9 items-center justify-center text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                        title="Zoom Out"
                    >
                        <ZoomOut className="h-4 w-4" />
                    </button>
                    <div className="h-4 w-[1px] bg-border" />
                    <span
                        className="px-2 text-xs font-semibold text-foreground select-none min-w-[42px] text-center"
                        title={`Current Zoom: ${Math.round(uiScale * 100)}%`}
                    >
                        {Math.round(uiScale * 100)}%
                    </span>
                    <div className="h-4 w-[1px] bg-border" />
                    <button
                        onClick={handleZoomIn}
                        className="flex h-9 w-9 items-center justify-center text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                        title="Zoom In"
                    >
                        <ZoomIn className="h-4 w-4" />
                    </button>
                </div>

                {/* Theme Toggle */}
                <button
                    onClick={toggleDarkMode}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    title={darkMode ? t('common.switchToLight') : t('common.switchToDark')}
                >
                    {darkMode ? (
                        <Sun className="h-5 w-5" />
                    ) : (
                        <Moon className="h-5 w-5" />
                    )}
                </button>

                {/* Language Switcher */}
                <LanguageSwitcher />

                {/* User Menu */}
                <div className="relative">
                    <button
                        onClick={() => setUserMenuOpen(!userMenuOpen)}
                        className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-accent"
                    >
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                            <User className="h-4 w-4 text-primary" />
                        </div>
                        <div className="hidden text-left md:block">
                            <p className="text-sm font-medium text-foreground">
                                {user?.username || "User"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {user?.is_manager ? t('user.manager') : t('user.employee')}
                            </p>
                        </div>
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </button>

                    {/* Dropdown Menu */}
                    {userMenuOpen && (
                        <>
                            <div
                                className="fixed inset-0 z-40"
                                onClick={() => setUserMenuOpen(false)}
                            />
                            <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-lg border border-border bg-popover p-1 shadow-lg">
                                <div className="px-3 py-2 border-b border-border mb-1">
                                    <p className="text-sm font-medium text-foreground">{user?.email}</p>
                                    <p className="text-xs text-muted-foreground">{user?.business_name}</p>
                                </div>

                                {user?.is_manager && (
                                    <div className="border-b border-border mb-1">
                                        <button
                                            onClick={() => handleNavigate("business-settings")}
                                            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                                        >
                                            <Settings className="h-4 w-4" />
                                            {t('user.businessSettings')}
                                        </button>
                                        <button
                                            onClick={() => handleNavigate("user-settings")}
                                            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                                        >
                                            <UserCog className="h-4 w-4" />
                                            User Settings
                                        </button>
                                    </div>
                                )}

                                <button
                                    onClick={handleLogout}
                                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-red-500 hover:bg-red-50"
                                >
                                    <LogOut className="h-4 w-4" />
                                    {t('user.logout')}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </header>
    )
}
