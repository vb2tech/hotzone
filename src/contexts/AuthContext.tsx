import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface AccountInfo {
  userId: string
  email: string
  session: Session
}

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  accounts: AccountInfo[]
  showAddAccount: boolean
  signIn: (email: string, password: string, addAccount?: boolean) => Promise<{ error: any }>
  signOut: () => Promise<void>
  switchAccount: (userId: string) => Promise<void>
  setShowAddAccount: (show: boolean) => void
}

const STORAGE_KEY = 'hotzone_accounts'
const CURRENT_ACCOUNT_KEY = 'hotzone_current_account'

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Helper functions to manage accounts in localStorage
const getStoredAccounts = (): AccountInfo[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return []
    const accounts = JSON.parse(stored)
    // Validate and filter out invalid sessions
    return accounts.filter((acc: AccountInfo) => acc.session && acc.userId && acc.email)
  } catch {
    return []
  }
}

const saveAccounts = (accounts: AccountInfo[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts))
  } catch (error) {
    console.error('Failed to save accounts:', error)
  }
}

const getCurrentAccountId = (): string | null => {
  return localStorage.getItem(CURRENT_ACCOUNT_KEY)
}

const setCurrentAccountId = (userId: string | null) => {
  if (userId) {
    localStorage.setItem(CURRENT_ACCOUNT_KEY, userId)
  } else {
    localStorage.removeItem(CURRENT_ACCOUNT_KEY)
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [accounts, setAccounts] = useState<AccountInfo[]>([])
  const [showAddAccount, setShowAddAccount] = useState(false)

  // Helper function to switch to an account
  const switchToAccount = async (account: AccountInfo) => {
    try {
      const { data, error } = await supabase.auth.setSession({
        access_token: account.session.access_token,
        refresh_token: account.session.refresh_token,
      })
      if (!error && data.session) {
        setSession(data.session)
        setUser(data.session.user)
        setCurrentAccountId(account.userId)
        
        // Update the account with fresh session
        const storedAccounts = getStoredAccounts()
        const accountIndex = storedAccounts.findIndex(acc => acc.userId === account.userId)
        if (accountIndex >= 0) {
          storedAccounts[accountIndex] = {
            ...account,
            session: data.session,
          }
          saveAccounts(storedAccounts)
          setAccounts(storedAccounts)
        }
      }
    } catch (error) {
      console.error('Failed to switch account:', error)
    }
  }

  // Load accounts and restore current session
  useEffect(() => {
    const loadAccounts = async () => {
      const storedAccounts = getStoredAccounts()
      setAccounts(storedAccounts)

      const currentAccountId = getCurrentAccountId()
      
      if (currentAccountId && storedAccounts.length > 0) {
        // Find the current account
        const currentAccount = storedAccounts.find(acc => acc.userId === currentAccountId)
        if (currentAccount) {
          // Restore the session
          try {
            const { data, error } = await supabase.auth.setSession({
              access_token: currentAccount.session.access_token,
              refresh_token: currentAccount.session.refresh_token,
            })
            if (!error && data.session) {
              setSession(data.session)
              setUser(data.session.user)
            } else {
              // Session expired, remove it
              const updatedAccounts = storedAccounts.filter(acc => acc.userId !== currentAccountId)
              saveAccounts(updatedAccounts)
              setAccounts(updatedAccounts)
              if (updatedAccounts.length > 0) {
                // Switch to first available account
                const firstAccount = updatedAccounts[0]
                await switchToAccount(firstAccount)
              } else {
                setCurrentAccountId(null)
              }
            }
          } catch (error) {
            console.error('Failed to restore session:', error)
          }
        }
      } else if (storedAccounts.length > 0) {
        // No current account set, use the first one
        await switchToAccount(storedAccounts[0])
      } else {
        // No stored accounts, check for default session
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          setSession(session)
          setUser(session.user)
          // Store this as an account
          const accountInfo: AccountInfo = {
            userId: session.user.id,
            email: session.user.email || '',
            session,
          }
          const updatedAccounts = [accountInfo]
          saveAccounts(updatedAccounts)
          setAccounts(updatedAccounts)
          setCurrentAccountId(session.user.id)
        }
      }
      
      setLoading(false)
    }

    loadAccounts()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (newSession) {
        setSession(newSession)
        setUser(newSession.user)
        
        // Update stored accounts
        const storedAccounts = getStoredAccounts()
        const accountIndex = storedAccounts.findIndex(acc => acc.userId === newSession.user.id)
        
        const accountInfo: AccountInfo = {
          userId: newSession.user.id,
          email: newSession.user.email || '',
          session: newSession,
        }

        if (accountIndex >= 0) {
          // Update existing account
          storedAccounts[accountIndex] = accountInfo
        } else {
          // Add new account
          storedAccounts.push(accountInfo)
        }
        
        saveAccounts(storedAccounts)
        setAccounts(storedAccounts)
        setCurrentAccountId(newSession.user.id)
      } else {
        // Session removed
        setSession(null)
        setUser(null)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string, addAccount: boolean = false) => {
    if (addAccount) {
      // For adding an account, we need to sign in and then store the session
      // Note: Supabase doesn't support multiple simultaneous sessions natively
      // We'll sign in, store the session, then restore the previous session
      const previousSession = session
      const previousUserId = user?.id

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        return { error }
      }

      if (data.session) {
        // Store the new account
        const storedAccounts = getStoredAccounts()
        const newAccount: AccountInfo = {
          userId: data.session.user.id,
          email: data.session.user.email || email,
          session: data.session,
        }

        // Check if account already exists
        const existingIndex = storedAccounts.findIndex(acc => acc.userId === newAccount.userId)
        if (existingIndex >= 0) {
          // Update existing account
          storedAccounts[existingIndex] = newAccount
        } else {
          // Add new account
          storedAccounts.push(newAccount)
        }

        saveAccounts(storedAccounts)
        setAccounts(storedAccounts)

        // If there was a previous session, restore it
        if (previousSession && previousUserId) {
          await switchToAccount({
            userId: previousUserId,
            email: previousSession.user.email || '',
            session: previousSession,
          })
        } else {
          // Otherwise, keep the new session active
          setCurrentAccountId(newAccount.userId)
        }
      }

      return { error: null }
    } else {
      // Regular sign in (replaces current session)
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      return { error }
    }
  }

  const signOut = async () => {
    const currentUserId = user?.id
    if (currentUserId) {
      // Remove from stored accounts
      const storedAccounts = getStoredAccounts()
      const updatedAccounts = storedAccounts.filter(acc => acc.userId !== currentUserId)
      saveAccounts(updatedAccounts)
      setAccounts(updatedAccounts)

      // If there are other accounts, switch to the first one
      if (updatedAccounts.length > 0) {
        await switchToAccount(updatedAccounts[0])
      } else {
        // No more accounts, sign out completely
        await supabase.auth.signOut()
        setCurrentAccountId(null)
      }
    } else {
      await supabase.auth.signOut()
      setCurrentAccountId(null)
    }
  }

  const switchAccount = async (userId: string) => {
    const storedAccounts = getStoredAccounts()
    const account = storedAccounts.find(acc => acc.userId === userId)
    if (account) {
      await switchToAccount(account)
    }
  }

  const value = {
    user,
    session,
    loading,
    accounts,
    showAddAccount,
    signIn,
    signOut,
    switchAccount,
    setShowAddAccount,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
