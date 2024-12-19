import { useAuth } from '@/context/auth-context'
import { useRouter } from 'next/router'
import { useEffect } from 'react'

export function withAuth(Component) {
  return function ProtectedRoute(props) {
    const { user } = useAuth()
    const router = useRouter()

    useEffect(() => {
      if (!user) {
        router.push('/signin')
      }
    }, [user, router])

    return user ? <Component {...props} /> : null
  }
} 