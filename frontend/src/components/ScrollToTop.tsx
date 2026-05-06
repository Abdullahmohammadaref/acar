import { useEffect } from "react"
import { useLocation } from "react-router-dom"

/**
 * ScrollToTop Component
 * 
 * A utility component that automatically scrolls the window to the top
 * whenever the route changes. This ensures users always see the top of
 * each page (including success/error banners) when navigating.
 * 
 * Usage: Place inside <BrowserRouter> but outside <Routes>
 * 
 * Example:
 * ```tsx
 * <BrowserRouter>
 *   <ScrollToTop />
 *   <Routes>...</Routes>
 * </BrowserRouter>
 * ```
 */
export function ScrollToTop() {
    const { pathname } = useLocation()

    useEffect(() => {
        // Scroll to the absolute top of the page on route change
        window.scrollTo({
            top: 0,
            left: 0,
            behavior: "instant" // Use "instant" for immediate scroll, "smooth" for animated
        })
    }, [pathname])

    // This component renders nothing - it only handles scroll behavior
    return null
}
