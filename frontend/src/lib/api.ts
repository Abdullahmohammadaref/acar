import axios from "axios"

/**
 * Axios instance configured for the Django API
 * Uses relative URLs which Vite proxies to localhost:8000 in development
 */
const api = axios.create({
    baseURL: "/api",
    headers: {
        "Content-Type": "application/json",
    },
    withCredentials: true, // Include cookies for session authentication
})

/**
 * Get CSRF token from document.cookie
 * Uses the exact parsing logic to find csrftoken cookie
 */
function getCsrfToken(): string | null {
    const token = document.cookie
        .split("; ")
        .find((row) => row.startsWith("csrftoken="))
        ?.split("=")[1]

    return token ? decodeURIComponent(token) : null
}

/**
 * Ensure CSRF token is available by making a GET request first.
 * This MUST be called before any POST/PUT/PATCH/DELETE request.
 */
export async function ensureCsrfToken(): Promise<string | null> {
    let token = getCsrfToken()

    if (!token) {
        // No cookie exists - fetch the CSRF endpoint to seed it
        console.log("[CSRF] No token found, fetching from /api/auth/csrf...")
        try {
            await axios.get("/api/auth/csrf", { withCredentials: true })
            // Wait a tick for cookie to be set
            await new Promise((resolve) => setTimeout(resolve, 50))
            // Now read the cookie that was just set
            token = getCsrfToken()
            console.log("[CSRF] Token after fetch:", token ? "Found" : "Still missing")
        } catch (error) {
            console.error("[CSRF] Failed to fetch CSRF token:", error)
        }
    }

    // Set the default header for all future requests
    if (token) {
        axios.defaults.headers.common["X-CSRFToken"] = token
        api.defaults.headers.common["X-CSRFToken"] = token
    }

    return token
}

// Request interceptor - Add CSRF token for mutations
api.interceptors.request.use(async (config) => {
    // Only add CSRF for state-changing methods
    const method = config.method?.toLowerCase()
    if (method && ["post", "put", "patch", "delete"].includes(method)) {
        // Try to get token from cookie
        let token = getCsrfToken()

        // If no token, try to seed it
        if (!token) {
            token = await ensureCsrfToken()
        }

        if (token) {
            config.headers["X-CSRFToken"] = token
        } else {
            console.warn("[CSRF] No token available for", method.toUpperCase(), config.url)
        }
    }
    return config
})

// Response interceptor - Handle errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // Handle unauthorized - redirect to login
        if (error.response?.status === 401) {
            window.location.href = "/login"
        }

        // Log CSRF errors for debugging
        if (error.response?.status === 403) {
            console.error("[CSRF] 403 Forbidden - possible CSRF issue:", {
                url: error.config?.url,
                method: error.config?.method,
                hasToken: !!getCsrfToken(),
                cookies: document.cookie,
            })
        }

        return Promise.reject(error)
    }
)

export default api
