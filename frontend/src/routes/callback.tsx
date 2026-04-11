import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useAuth0 } from '@auth0/auth0-react'
import { useEffect } from 'react'
import { ShieldAlert } from 'lucide-react'

export const Route = createFileRoute('/callback')({
    component: CallbackPage
})

function CallbackPage() {
    const { isLoading, error, isAuthenticated } = useAuth0()
    const navigate = useNavigate()

    useEffect(() => {
        if (!isLoading && isAuthenticated) {
            navigate({ to: '/' })
        }
    }, [isLoading, isAuthenticated, navigate])

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6">
                <div className="glass-card p-10 w-full max-w-md text-center">
                    <p className="text-red-400 font-semibold">Authentication error: {error.message}</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-6">
            <div className="glass-card p-10 w-full max-w-md flex flex-col items-center gap-4">
                <ShieldAlert size={48} className="text-primary animate-pulse" />
                <p className="text-muted-foreground">Signing you in...</p>
            </div>
        </div>
    )
}