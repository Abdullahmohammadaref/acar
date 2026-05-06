import { Link, useLocation } from "react-router-dom"
import { Mail, ArrowLeft, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

/**
 * Check Email Page - Generic success/feedback page
 * Route: /login/check-email
 * 
 * Displays appropriate message based on the type of action:
 * - employee: "Login link sent to your manager"
 * - manager: "Login link sent to your email"
 * - password-reset: "Password reset link sent"
 * - email-change: "Verification email sent"
 */
export function CheckEmailPage() {
    const location = useLocation()
    const state = location.state as {
        message?: string
        type?: "employee" | "manager" | "password-reset" | "email-change"
        email?: string
    } | null

    const message = state?.message || "Please check your email for the next step."
    const type = state?.type || "manager"

    // Determine back link based on type
    const getBackLink = () => {
        switch (type) {
            case "employee":
                return { href: "/login/employee", label: "Back to employee login" }
            case "password-reset":
                return { href: "/login/forgot-password", label: "Try again" }
            case "email-change":
                return { href: "/login/forgot-email", label: "Try again" }
            default:
                return { href: "/login/manager", label: "Back to manager login" }
        }
    }

    const backLink = getBackLink()

    // Get title based on type
    const getTitle = () => {
        switch (type) {
            case "password-reset":
                return "Password Reset Sent"
            case "email-change":
                return "Verification Started"
            default:
                return "Check Your Email"
        }
    }

    return (
        <div className="w-full max-w-md space-y-6 text-center">
            {/* Success Icon */}
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-500/10 mx-auto">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-500/20">
                    <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
            </div>

            {/* Title */}
            <div>
                <h1 className="text-2xl font-bold text-foreground">{getTitle()}</h1>
                <p className="mt-2 text-muted-foreground">{message}</p>
            </div>

            {/* Email indicator */}
            {state?.email && (
                <div className="inline-flex items-center gap-2 rounded-full bg-muted px-4 py-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-foreground">{state.email}</span>
                </div>
            )}

            {/* Info Box */}
            <div className="rounded-lg bg-muted/50 p-4 text-left">
                <h3 className="font-medium text-foreground mb-2">What happens next?</h3>
                {type === "employee" ? (
                    <p className="text-sm text-muted-foreground">
                        Your manager will receive a login link. Once they click it,
                        you'll be logged in automatically. This usually takes a few minutes.
                    </p>
                ) : type === "email-change" ? (
                    <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
                        <li>Check your backup email for a verification link</li>
                        <li>Click the link to verify your identity</li>
                        <li>A second link will be sent to your new email</li>
                        <li>Click that link to complete the change</li>
                    </ol>
                ) : (
                    <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Check your inbox (and spam folder)</li>
                        <li>• The link expires in 1 minute</li>
                        <li>• Click the link to continue</li>
                    </ul>
                )}
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3">
                <Link to={backLink.href}>
                    <Button variant="outline" className="w-full">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        {backLink.label}
                    </Button>
                </Link>

                <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    Return to login options
                </Link>
            </div>
        </div>
    )
}
