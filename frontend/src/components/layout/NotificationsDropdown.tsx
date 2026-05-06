import { useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { Bell, Clock, ArrowRight, User, FileText, Car, Building2, Settings, List } from "lucide-react"
import { useRecentActivityLogs, type ActivityLogItem } from "@/hooks/useActivityLogs"
import { SUPPORTED_LOCALES, DEFAULT_LOCALE, type SupportedLocale } from "@/lib/i18n"

/**
 * Action icon mapping
 */
const actionIcons: Record<string, string> = {
    create: "✨",
    update: "✏️",
    delete: "🗑️",
    status_change: "🔄",
}

/**
 * Entity icon component
 */
function EntityIcon({ type }: { type: string }) {
    const className = "h-3 w-3"
    switch (type) {
        case "vehicle":
            return <Car className={className} />
        case "transaction":
            return <FileText className={className} />
        case "legal_entity":
            return <Building2 className={className} />
        case "user":
            return <User className={className} />
        case "business_settings":
            return <Settings className={className} />
        default:
            return <List className={className} />
    }
}

/**
 * Format timestamp to relative time
 */
function formatRelativeTime(timestamp: string): string {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`

    return date.toLocaleDateString()
}

/**
 * Single notification item component
 */
function NotificationItem({ log }: { log: ActivityLogItem }) {
    return (
        <div className="flex items-start gap-3 p-3 hover:bg-accent/50 transition-colors cursor-pointer rounded-md">
            <div className="flex-shrink-0 mt-0.5">
                <span className="text-sm">{actionIcons[log.action] || "📝"}</span>
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground line-clamp-2">
                    <span className="font-medium">{log.user_name}</span>
                    {" "}
                    <span className="text-muted-foreground">{log.action_display.toLowerCase()}</span>
                    {" "}
                    <span className="inline-flex items-center gap-1">
                        <EntityIcon type={log.entity_type} />
                        <span className="font-medium">{log.entity_name || log.entity_type_display}</span>
                    </span>
                </p>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatRelativeTime(log.timestamp)}
                </p>
            </div>
        </div>
    )
}

export function NotificationsDropdown() {
    const [isOpen, setIsOpen] = useState(false)
    const navigate = useNavigate()
    const { t } = useTranslation()
    const { business_slug, locale } = useParams<{ business_slug: string; locale?: string }>()

    const { data, isLoading } = useRecentActivityLogs()

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

    const handleViewAll = () => {
        setIsOpen(false)
        navigate(buildHref("activity-logs"))
    }

    const hasLogs = data?.logs && data.logs.length > 0

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                title={t('common.notifications', 'Notifications')}
            >
                <Bell className="h-5 w-5" />
                {hasLogs && (
                    <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary" />
                )}
            </button>

            {/* Dropdown */}
            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute right-0 top-full z-50 mt-1 w-80 rounded-lg border border-border bg-popover shadow-lg overflow-hidden">
                        {/* Header */}
                        <div className="px-4 py-3 border-b border-border">
                            <h3 className="font-medium text-foreground">
                                {t('notifications.title', 'Recent Activity')}
                            </h3>
                        </div>

                        {/* Content */}
                        <div className="max-h-80 overflow-y-auto">
                            {isLoading ? (
                                <div className="p-4 text-center text-muted-foreground text-sm">
                                    {t('common.loading', 'Loading...')}
                                </div>
                            ) : hasLogs ? (
                                <div className="p-1">
                                    {data.logs.map((log) => (
                                        <NotificationItem key={log.id} log={log} />
                                    ))}
                                </div>
                            ) : (
                                <div className="p-8 text-center text-muted-foreground text-sm">
                                    <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                    <p>{t('notifications.empty', 'No recent activity')}</p>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-4 py-3 border-t border-border bg-muted/30">
                            <button
                                onClick={handleViewAll}
                                className="w-full flex items-center justify-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                            >
                                {t('notifications.viewAll', 'View All Logs')}
                                <ArrowRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
