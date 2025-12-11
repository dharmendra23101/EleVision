import React, { createContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (isMounted) {
          setUser(session?.user ??  null)
          
          if (session?.user) {
            await fetchProfile(session.user.id)
          }
          
          // Always set loading to false, regardless of profile fetch result
          setLoading(false)
        }
      } catch (error) {
        console.error('Session error:', error)
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    getInitialSession()

    const { data: { subscription } } = supabase. auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event)
        
        if (isMounted) {
          setUser(session?.user ??  null)
          
          if (session?. user) {
            // Don't wait for profile fetch to complete
            fetchProfile(session.user.id). catch(console.error)
          } else {
            setProfile(null)
          }
          
          // Set loading to false immediately after setting user
          setLoading(false)
        }
      }
    )

    return () => {
      isMounted = false
      subscription. unsubscribe()
    }
  }, [])

  const fetchProfile = async (userId) => {
    try {
      console.log('Fetching profile for user:', userId)
      
      const { data, error } = await supabase
        . from('profiles')
        .select('*')
        .eq('id', userId)
        . single()

      if (! error && data) {
        console.log('Profile fetched successfully:', data)
        setProfile(data)
      } else {
        console.log('Profile not found or error:', error?. message)
        setProfile(null)
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
      setProfile(null)
    }
  }

  const signUp = async (email, password, userData) => {
    try {
      console.log('Creating user account.. .')
      
      const { data, error } = await supabase. auth.signUp({
        email,
        password,
      })

      if (error) {
        console.error('Signup error:', error)
        return { data, error }
      }

      if (! data.user?. id) {
        return { data, error: { message: 'User creation failed' } }
      }

      const userId = data.user. id
      console.log('User created:', userId)

      // Immediately confirm the email manually
      try {
        console.log('Confirming email manually...')
        await supabase.rpc('confirm_user_email', { user_id: userId })
      } catch (confirmError) {
        console.log('Email confirmation failed, continuing anyway.. .')
      }

      // Create profile asynchronously (don't wait)
      createProfile(userId, userData). catch(console.error)

      return { data, error: null }
    } catch (err) {
      console.error('Signup error:', err)
      return { data: null, error: err }
    }
  }

  const createProfile = async (userId, userData) => {
    try {
      console.log('Creating profile for user:', userId)
      
      const { data, error } = await supabase
        . from('profiles')
        .insert([{
          id: userId,
          full_name: userData. fullName,
          mobile_number: userData.mobileNumber,
          state: userData.state,
          district: userData.district,
          village_city: userData.villageCity
        }])
        .select()
        .single()

      if (error) {
        console.error('Profile creation error:', error)
        // Try updating if insert fails (profile might exist from trigger)
        const { data: updateData, error: updateError } = await supabase
          . from('profiles')
          .update({
            full_name: userData.fullName,
            mobile_number: userData.mobileNumber,
            state: userData.state,
            district: userData.district,
            village_city: userData.villageCity
          })
          .eq('id', userId)
          .select()
          .single()

        if (! updateError && updateData) {
          console.log('Profile updated successfully:', updateData)
          setProfile(updateData)
        }
      } else {
        console.log('Profile created successfully:', data)
        setProfile(data)
      }
    } catch (error) {
      console.error('Profile creation failed:', error)
    }
  }

  const signIn = async (email, password) => {
    try {
      console.log('Attempting login for:', email)
      
      const { data, error } = await supabase.auth. signInWithPassword({
        email,
        password,
      })

      // If email not confirmed, try to fix it
      if (error && error.message === 'Email not confirmed') {
        console.log('Email not confirmed, trying to fix...')
        
        try {
          // Fix the email confirmation
          await supabase.rpc('confirm_user_email_direct', { user_email: email })
          
          // Wait a second then retry login
          await new Promise(resolve => setTimeout(resolve, 1000))
          
          const { data: retryData, error: retryError } = await supabase. auth.signInWithPassword({
            email,
            password,
          })

          if (! retryError) {
            console. log('Login successful after email fix!')
            return { data: retryData, error: null }
          } else {
            console.log('Retry failed:', retryError. message)
            return { data: retryData, error: retryError }
          }
        } catch (fixError) {
          console. error('Could not fix email confirmation:', fixError)
          return { data, error }
        }
      }

      console.log('Login response:', { success: !!data. user, error: error?.message })
      return { data, error }
    } catch (err) {
      console.error('Sign in error:', err)
      return { data: null, error: err }
    }
  }

  const signInWithGoogle = async () => {
    try {
      return await supabase. auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      })
    } catch (err) {
      console.error('Google sign in error:', err)
      return { data: null, error: err }
    }
  }

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (! error) {
        setUser(null)
        setProfile(null)
      }
      return { error }
    } catch (err) {
      console.error('Sign out error:', err)
      return { error: err }
    }
  }

  const updateProfile = async (updates) => {
    if (!user) return { error: 'No user logged in' }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ ...updates, updated_at: new Date(). toISOString() })
        .eq('id', user.id)
        .select()
        .single()

      if (! error) {
        setProfile(data)
      }

      return { data, error }
    } catch (err) {
      console.error('Update profile error:', err)
      return { data: null, error: err }
    }
  }

  const value = {
    user,
    profile,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    updateProfile,
    isAdmin: profile?.is_admin || false,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export { AuthContext }