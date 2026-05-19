import { useState } from "react"
import { Link } from "react-router-dom"
import { ArrowLeft, Loader2, Mail, User, Lock, CheckCircle, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import api from "@/lib/api"
import { useAuthPolling } from "@/hooks/useAuthPolling"

/**
 * Manager Login Page with Universal Polling
 * Route: /login/manager
 * 
 * Flow:
 * 1. Manager enters email/username + password
 * 2. API sends verification email to manager
 * 3. Manager clicks email link on ANY device
 * 4. This page polls until approved, then auto-logs in
 */
export function ManagerLoginPage() {
    const [loginMode, setLoginMode] = useState<"email" | "username">("email")
    const [email, setEmail] = useState("")
    const [username, setUsername] = useState("")
    const [password, setPassword] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const { status: pollStatus, message: pollMessage, startPolling } = useAuthPolling({
        onExpired: () => {
            setError("Login link expired. Please try again.")
        },
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setIsLoading(true)

        try {
            const response = await api.post("/auth/request-login", {
                email: loginMode === "email" ? email : undefined,
                username: loginMode === "username" ? username : undefined,
                password,
                login_type: "manager",
            })

            if (response.data.success && response.data.request_id) {
                // Start polling for approval
                startPolling(response.data.request_id)
            } else {
                setError(response.data.message || "Login failed")
            }
        } catch (err: any) {
            setError(err.response?.data?.detail || "An unexpected error occurred")
        } finally {
            setIsLoading(false)
        }
    }

    // Show polling/waiting UI
    if (pollStatus === "polling") {
        return (
            <div className="w-full max-w-md space-y-6 text-center">
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 mx-auto">
                    <Mail className="h-12 w-12 text-primary animate-pulse" />
                </div>

                <div>
                    <h1 className="text-2xl font-bold text-foreground">Check Your Email</h1>
                    <p className="mt-2 text-muted-foreground">{pollMessage}</p>
                </div>

                <div className="flex justify-center gap-1">
                    {[0, 1, 2].map((i) => (
                        <div
                            key={i}
                            className="h-2 w-2 rounded-full bg-primary animate-bounce"
                            style={{ animationDelay: `${i * 0.15}s` }}
                        />
                    ))}
                </div>

                <div className="rounded-lg bg-muted/50 p-4 text-left">
                    <h3 className="font-medium text-foreground mb-2">What's happening?</h3>
                    <ul className="text-sm text-muted-foreground space-y-1">
                        <li>✉️ A verification email was sent to your inbox</li>
                        <li>📱 Click the link on ANY device (phone, tablet, etc.)</li>
                        <li>🔄 This page will automatically log you in</li>
                    </ul>
                </div>
            </div>
        )
    }

    // Show approved UI
    if (pollStatus === "approved") {
        return (
            <div className="w-full max-w-md space-y-6 text-center">
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-green-500/10 mx-auto">
                    <CheckCircle className="h-12 w-12 text-green-500" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Login Successful!</h1>
                    <p className="mt-2 text-muted-foreground">{pollMessage}</p>
                </div>
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
            </div>
        )
    }

    // Show expired UI
    if (pollStatus === "expired") {
        return (
            <div className="w-full max-w-md space-y-6 text-center">
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-destructive/10 mx-auto">
                    <XCircle className="h-12 w-12 text-destructive" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Link Expired</h1>
                    <p className="mt-2 text-muted-foreground">{pollMessage}</p>
                </div>
                <Button onClick={() => window.location.reload()}>Try Again</Button>
            </div>
        )
    }

    // Default: Show login form
    return (
        <div className="w-full max-w-md space-y-6">
            <Link
                to="/login"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
                <ArrowLeft className="h-4 w-4" />
                Back to login options
            </Link>

            <div>
                <h1 className="text-2xl font-bold text-foreground">Manager Login</h1>
                <p className="mt-1 text-muted-foreground">
                    Sign in to manage your business
                </p>
            </div>

            {/* Login mode toggle */}
            <div className="flex gap-2">
                <Button
                    type="button"
                    variant={loginMode === "email" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setLoginMode("email")}
                    className="flex-1"
                >
                    <Mail className="mr-2 h-4 w-4" />
                    Email
                </Button>
                <Button
                    type="button"
                    variant={loginMode === "username" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setLoginMode("username")}
                    className="flex-1"
                >
                    <User className="mr-2 h-4 w-4" />
                    Username
                </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                {loginMode === "email" ? (
                    <div className="space-y-2">
                        <Label htmlFor="email" className="text-foreground">Email <span className="text-destructive ml-1">*</span></Label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                id="email"
                                type="email"
                                placeholder="Enter your email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="pl-10 text-foreground"
                                required
                                autoFocus
                                autoComplete="email"
                            />
                        </div>
                    </div>
                ) : (
                    <div className="space-y-2">
                        <Label htmlFor="username" className="text-foreground">Username <span className="text-destructive ml-1">*</span></Label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                id="username"
                                type="text"
                                placeholder="Enter your username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="pl-10 text-foreground"
                                required
                                autoFocus
                                autoComplete="username"
                            />
                        </div>
                    </div>
                )}

                <div className="space-y-2">
                    <Label htmlFor="password" className="text-foreground">Password <span className="text-destructive ml-1">*</span></Label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            id="password"
                            type="password"
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="pl-10 text-foreground"
                            required
                            autoComplete="current-password"
                        />
                    </div>
                </div>

                {error && (
                    <div className="rounded-lg bg-destructive/10 border border-destructive/50 p-3">
                        <p className="text-sm text-destructive">{error}</p>
                    </div>
                )}

                <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Sending Login Link...
                        </>
                    ) : (
                        "Send Login Link"
                    )}
                </Button>
            </form>

            <div className="flex justify-between text-sm">
                <Link to="/login/forgot-password" className="text-primary hover:underline">
                    Forgot Password?
                </Link>
                <Link to="/login/forgot-email" className="text-primary hover:underline">
                    Forgot Email?
                </Link>
            </div>
        </div>
    )
}
