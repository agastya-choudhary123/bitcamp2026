import { createFileRoute } from '@tanstack/react-router'
import { useAuth0 } from '@auth0/auth0-react'
import { useEffect } from 'react'

export const Route = createFileRoute('/callback')({
    component: CallbackPage
})

function CallbackPage() {
    const { isLoading, error } = useAuth0()
    if (error) return <div>Auth error: {error.message}</div>
    if (isLoading) return <div>Signing in...</div>
    return null
}