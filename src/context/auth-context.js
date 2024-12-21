'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchUserData = async (authUser) => {
    try {
      console.log('Fetching data for user:', authUser.id);

      // Fetch user profile with subscription data
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', authUser.id)
        .single();

      if (profileError) {
        console.error('Profile query error:', profileError);
        throw profileError;
      }

      console.log('Profile found:', profile);

      // Create subscription object if status is active
      const subscription = profile.subscription_status === 'active' ? {
        plan: profile.subscription_plan || 'Standard',
        status: profile.subscription_status,
        current_period_end: profile.subscription_period_end,
        stripe_subscription_id: profile.stripe_subscription_id,
        stripe_customer_id: profile.stripe_customer_id
      } : null;

      // Maintain backward compatibility with existing code
      const userData = {
        ...authUser,
        id: authUser.id,  // Ensure id is from auth user
        email: authUser.email,  // Ensure email is from auth user
        subscription_status: profile.subscription_status,
        stripe_customer_id: profile.stripe_customer_id,
        stripe_subscription_id: profile.stripe_subscription_id,
        subscription_period_end: profile.subscription_period_end,
        first_name: profile.first_name,
        last_name: profile.last_name,
        company_name: profile.company_name,
        phone_number: profile.phone_number,
        role: profile.role || authUser.role,
        avatar_url: profile.avatar_url,
        subscription  // Add the formatted subscription object
      };

      console.log('Setting user data:', userData);
      setUser(userData);

    } catch (error) {
      console.error('Error in fetchUserData:', error);
      // If profile fetch fails, still maintain basic user data
      setUser({
        ...authUser,
        id: authUser.id,
        email: authUser.email,
        role: authUser.role
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchUserData(session.user)
      } else {
        setLoading(false)
        setUser(null)
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchUserData(session.user)
      } else {
        setUser(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Add authentication methods
  const signIn = async ({ email, password }) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error
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
    } catch (error) {
      console.error('Error signing out:', error.message)
      return { error }
    }
  }

  const resetPassword = async (email) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (error) throw error
      return { data: true }
    } catch (error) {
      console.error('Error resetting password:', error.message)
      return { error }
    }
  }

  const value = {
    user,
    loading,
    setUser,
    signIn,
    signOut,
    resetPassword,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  return useContext(AuthContext)
} 