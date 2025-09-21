'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'

interface User {
  id: string
  email: string
  name?: string
  picture?: string
  isGoogle?: boolean
  isAdmin?: boolean
}

interface AuthContextType {
  user: User | null
  token: string | null
  login: (token: string, user: User) => void
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  // Define route types
  const protectedRoutes = ['/dashboard']
  const authRoutes = ['/login', '/signup']
  const publicRoutes = ['/']

  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route))
  const isPublicRoute = publicRoutes.includes(pathname)

  useEffect(() => {
    // Load user and token from localStorage on mount
    const savedToken = localStorage.getItem('token')
    const savedUser = localStorage.getItem('user')

    console.log('Auth Context: Loading from localStorage', { savedToken: !!savedToken, savedUser: !!savedUser })

    if (savedToken && savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser)
        setToken(savedToken)
        setUser(parsedUser)
        console.log('Auth Context: Loaded user and token', { user: parsedUser })
      } catch (error) {
        console.log('Auth Context: Error parsing saved user, clearing localStorage', error)
        // Clear invalid data
        localStorage.removeItem('token')
        localStorage.removeItem('user')
      }
    }
    
    setIsLoading(false)
  }, [])

  useEffect(() => {
    // Handle route protection after loading is complete
    if (!isLoading) {
      console.log('Auth Context: Route protection check', {
        pathname,
        isProtectedRoute,
        isAuthRoute,
        hasToken: !!token,
        user: user?.email
      })

      // If trying to access protected route without token, redirect to login
      if (isProtectedRoute && !token) {
        console.log('Auth Context: Redirecting to login (no token for protected route)')
        router.push('/login')
        return
      }

      // If authenticated user tries to access auth routes, redirect to dashboard
      if (isAuthRoute && token) {
        console.log('Auth Context: Redirecting to dashboard (authenticated user on auth route)')
        router.push('/dashboard')
        return
      }
    }
  }, [isLoading, token, isProtectedRoute, isAuthRoute, router, pathname, user])

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem('token', newToken)
    localStorage.setItem('user', JSON.stringify(newUser))
    setToken(newToken)
    setUser(newUser)
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setToken(null)
    setUser(null)
    router.push('/login')
  }

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}