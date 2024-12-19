'use client'
import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react'
import { supabase } from '@/utils/supabase'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Initialize auth state
  useEffect(() => {
    let mounted = true

    const initializeAuth = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) throw sessionError
        if (mounted) setUser(session?.user ?? null)
      } catch (error) {
        console.error('Auth initialization error:', error)
        if (mounted) setError(error.message)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    initializeAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setUser(session?.user ?? null)
        setError(null)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  // Memoized auth methods
  const signIn = useCallback(async (credentials) => {
    try {
      setError(null)
      const { data, error } = await supabase.auth.signInWithPassword(credentials)
      if (error) throw error
      return { data, error: null }
    } catch (error) {
      setError(error.message)
      return { data: null, error }
    }
  }, [])

  const signUp = useCallback(async (credentials) => {
    try {
      setError(null)
      const { data, error } = await supabase.auth.signUp(credentials)
      
      if (error) throw error

      // Handle successful signup
      if (data) {
        // Set the user immediately if auto-confirm is enabled
        if (data.session) {
          setUser(data.session.user)
        }
        return { data, error: null }
      }
    } catch (error) {
      setError(error.message)
      return { data: null, error }
    }
  }, [])

  const signOut = useCallback(async () => {
    try {
      setError(null)
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      return { error: null }
    } catch (error) {
      setError(error.message)
      return { error }
    }
  }, [])

  // Memoized context value
  const value = useMemo(() => ({
    user,
    loading,
    error,
    signIn,
    signUp,
    signOut,
  }), [user, loading, error, signIn, signUp, signOut])

  if (loading) {
    return <div className="d-flex justify-content-center align-items-center min-vh-100">
      <div className="spinner-border text-primary" role="status">
        <span className="visually-hidden">Loading...</span>
      </div>
    </div>
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
} 