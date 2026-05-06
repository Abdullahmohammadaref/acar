import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { UserCircle, Users, ArrowRight } from "lucide-react"

/**
 * Login Landing Page - Selection between Manager and Employee login
 * Route: /login
 */
export function LoginPage() {
    const { t } = useTranslation()

    return (
        <div className="w-full max-w-md space-y-8">
            {/* Title */}
            <div className="text-center">
                <h1 className="text-3xl font-bold text-foreground">{t('auth.welcomeBack')}</h1>
                <p className="mt-2 text-muted-foreground">
                    {t('auth.signInToManage')}
                </p>
            </div>

            {/* Login Options */}
            <div className="space-y-4">
                {/* Manager Login */}
                <Link
                    to="/login/manager"
                    className="group flex items-center justify-between p-6 rounded-2xl border border-border bg-card hover:border-primary hover:shadow-lg transition-all"
                >
                    <div className="flex items-center gap-4">
                        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                            <UserCircle className="h-7 w-7 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-foreground">{t('auth.managerLogin')}</h2>
                            <p className="text-sm text-muted-foreground">
                                {t('auth.fullAccess')}
                            </p>
                        </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </Link>

                {/* Employee Login */}
                <Link
                    to="/login/employee"
                    className="group flex items-center justify-between p-6 rounded-2xl border border-border bg-card hover:border-primary hover:shadow-lg transition-all"
                >
                    <div className="flex items-center gap-4">
                        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-muted group-hover:bg-muted/80 transition-colors">
                            <Users className="h-7 w-7 text-muted-foreground" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-foreground">{t('auth.employeeLogin')}</h2>
                            <p className="text-sm text-muted-foreground">
                                {t('auth.loginLinkSent')}
                            </p>
                        </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </Link>
            </div>

            {/* Help Text */}
            <p className="text-center text-sm text-muted-foreground">
                {t('auth.needHelp')}{" "}
                <a href="mailto:support@acar.de" className="text-primary hover:underline">
                    {t('auth.contactSupport')}
                </a>
            </p>

            {/* Register Link */}
            <p className="text-center text-sm text-muted-foreground">
                Don't have an account?{" "}
                <Link to="/register" className="text-primary hover:underline font-medium">
                    Register as Manager
                </Link>
            </p>
        </div>
    )
}
