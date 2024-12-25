'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

// Create a single instance of the Supabase client with aggressive session persistence
export const supabase = createClientComponentClient({
  options: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'implicit'
  }
})

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [initialized, setInitialized] = useState(false)

  const fetchUserData = async (user) => {
    if (!user) return
    console.log('Fetching data for user:', user.id)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error) {
        console.error('Profile query error:', error)
        return
      }

      setProfile(data)
    } catch (error) {
      console.error('Error in fetchUserData:', error)
    }
  }

  // Add authentication methods
  const signIn = async ({ email, password, options = {} }) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
        options: {
          ...options,
          persistSession: true,
        }
      })
      if (error) throw error
      
      // Immediately fetch user data after successful sign in
      if (data.session?.user) {
        await fetchUserData(data.session.user)
      }
      
      return { data }
    } catch (error) {
      console.error('Error signing in:', error.message)
      return { error }
    }
  }

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      setUser(null)
      setProfile(null)
    } catch (error) {
      console.error('Error signing out:', error.message)
      return { error }
    }
  }

  useEffect(() => {
    let mounted = true

    // Get initial session
    const initializeAuth = async () => {
      try {
        console.log('Initializing auth...')
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Error getting initial session:', error)
          throw error
        }
        
        if (session?.user && mounted) {
          console.log('Found existing session for user:', session.user.id)
          setUser(session.user)
          await fetchUserData(session.user)
        } else {
          console.log('No existing session found')
        }
      } catch (error) {
        console.error('Error in initializeAuth:', error)
      } finally {
        if (mounted) {
          setLoading(false)
          setInitialized(true)
        }
      }
    }

    initializeAuth()

    // Set up auth state change listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.id)
      
      if (mounted) {
        if (session?.user) {
          setUser(session.user)
          await fetchUserData(session.user)
        } else {
          setUser(null)
          setProfile(null)
        }
        setLoading(false)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  // Don't render children until auth is initialized
  if (!initialized) {
    return <div>Loading...</div>
  }

  const value = {
    user,
    profile,
    loading,
    signIn,
    signOut
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
} 