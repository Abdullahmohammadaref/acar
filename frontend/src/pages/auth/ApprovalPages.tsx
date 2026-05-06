import { useEffect, useState } from "react"
import { useParams, Link } from "react-router-dom"
import { CheckCircle, XCircle, Loader2, ArrowLeft, Key, Mail, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import axios from "axios"

type ApprovalStatus = "loading" | "success" | "error"

interface ApprovalData {
    success: boolean
    message: string
    status: string
    action_type?: string
    username?: string
    new_email?: string
}

/**
 * Universal Approval Page
 * Route: /login/approve/:token
 * 
 * Handles all approval/verification links:
 * - Manager login verification
 * - Employee login approval
 * - Password reset verification
 * - Email change verification
 */
export function ApprovalPage() {
    const { token } = useParams<{ token: string }>()

    const [status, setStatus] = useState<ApprovalStatus>("loading")
    const [data, setData] = useState<ApprovalData | null>(null)

    useEffect(() => {
        if (!token) {
            setStatus("error")
            setData({ success: false, message: "Invalid link", status: "error" })
            return
        }

        const approveRequest = async () => {
            try {
                // CRITICAL: Use plain axios WITHOUT credentials
                // This ensures we don't send any session cookies - just like a curl request
                // The /approve endpoint only updates the DB, it doesn't need authentication
                const response = await axios.get(`/api/auth/approve/${token}`, {
                    withCredentials: false,  // No cookies = no session hijack
                })

                // The response is HTML now, but we can parse if it was a success
                // Check if HTML contains success indicator
                if (typeof response.data === 'string' && response.data.includes('✓')) {
                    setStatus("success")
                    setData({
                        success: true,
                        message: "Approved!",
                        status: "approved",
                        action_type: "manager_login" // We don't have this from HTML, but UI will handle it
                    })
                } else if (response.data.success !== undefined) {
                    // Old JSON response format (fallback)
                    setData(response.data)
                    setStatus(response.data.success ? "success" : "error")
                } else {
                    // Assume success if we got 200
                    setStatus("success")
                    setData({ success: true, message: "Approved!", status: "approved" })
                }
            } catch (err: any) {
                setStatus("error")
                setData({
                    success: false,
                    message: err.response?.data?.message || "Failed to process request",
                    status: "error"
                })
            }
        }

        approveRequest()
    }, [token])

    if (status === "loading") {
        return (
            <div className="w-full max-w-md space-y-6 text-center">
                <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
                <p className="text-muted-foreground">Processing...</p>
            </div>
        )
    }

    if (status === "success" && data) {
        // Customize UI based on action type
        const getIcon = () => {
            switch (data.action_type) {
                case "employee_login":
                    return <User className="h-12 w-12 text-green-500" />
                case "manager_login":
                    return <User className="h-12 w-12 text-green-500" />
                case "password_reset":
                    return <Key className="h-12 w-12 text-green-500" />
                case "verify_email":
                    return <Mail className="h-12 w-12 text-green-500" />
                default:
                    return <CheckCircle className="h-12 w-12 text-green-500" />
            }
        }

        const getTitle = () => {
            switch (data.action_type) {
                case "employee_login":
                    return "Login Approved!"
                case "manager_login":
                    return "Login Verified!"
                case "password_reset":
                    return "Password Reset Verified!"
                case "verify_email":
                    return "Email Verified!"
                default:
                    return "Approved!"
            }
        }

        const getDescription = () => {
            switch (data.action_type) {
                case "employee_login":
                    return `${data.username}'s device will now log in automatically.`
                case "manager_login":
                    return "Your other device will now log in automatically."
                case "password_reset":
                    return "You can now set a new password on your original device."
                case "verify_email":
                    return data.new_email
                        ? `Your email has been changed to ${data.new_email}.`
                        : "Your email has been verified."
                default:
                    return data.message
            }
        }

        return (
            <div className="w-full max-w-md space-y-6 text-center">
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-green-500/10 mx-auto">
                    {getIcon()}
                </div>

                <div>
                    <h1 className="text-2xl font-bold text-foreground">{getTitle()}</h1>
                    <p className="mt-2 text-muted-foreground">{getDescription()}</p>
                </div>

                <div className="rounded-lg bg-muted/50 p-4">
                    <p className="text-sm text-muted-foreground">
                        You can close this page. The original browser will continue automatically.
                    </p>
                </div>

                <Link to="/login">
                    <Button variant="outline">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Login
                    </Button>
                </Link>
            </div>
        )
    }

    // Error state
    return (
        <div className="w-full max-w-md space-y-6 text-center">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-destructive/10 mx-auto">
                <XCircle className="h-12 w-12 text-destructive" />
            </div>

            <div>
                <h1 className="text-2xl font-bold text-foreground">Request Failed</h1>
                <p className="mt-2 text-muted-foreground">{data?.message || "An error occurred"}</p>
            </div>

            <Link to="/login">
                <Button>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Login
                </Button>
            </Link>
        </div>
    )
}


/**
 * Magic Link Verification Page (Legacy fallback)
 * Route: /login/verify/:uid/:token
 * 
 * For direct magic link logins (if we keep them in the future)
 */
export function VerifyPage() {
    const { uid, token } = useParams<{ uid: string; token: string }>()

    return (
        <div className="w-full max-w-md space-y-6 text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">
                Legacy link detected. Please use the new approval flow.
            </p>
            <Link to="/login">
                <Button variant="outline">Go to Login</Button>
            </Link>
        </div>
    )
}
