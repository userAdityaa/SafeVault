'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'

/**
 * User data structure for authenticated users.
 */
interface User {
  /** Unique user identifier */
  id: string
  /** User's email address */
  email: string
  /** Display name (optional) */
  name?: string
  /** Profile picture URL (optional) */
  picture?: string
  /** Whether user authenticated via Google OAuth */
  isGoogle?: boolean
  /** Whether user has admin privileges */
  isAdmin?: boolean
}

/**
 * Authentication context value interface.
 */
interface AuthContextType {
  /** Currently authenticated user or null if not authenticated */
  user: User | null
  /** Authentication token or null if not authenticated */
  token: string | null
  /** Function to log in a user with token and user data */
  login: (token: string, user: User) => void
  /** Function to log out the current user */
  logout: () => void
  /** Whether authentication state is still being determined */
  isLoading: boolean
}

/**
 * React context for managing authentication state throughout the application.
 */
const AuthContext = createContext<AuthContextType | null>(null)

/**
 * Custom hook to access authentication context.
 * 
 * @throws Error if used outside of AuthProvider
 * @returns Authentication context value
 * 
 * @example
 * ```tsx
 * const { user, token, login, logout, isLoading } = useAuth();
 * 
 * if (isLoading) return <Loader />;
 * 
 * if (!user) {
 *   return <LoginForm onLogin={login} />;
 * }
 * 
 * return <Dashboard user={user} onLogout={logout} />;
 * ```
 */
export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

/**
 * Authentication provider component that manages auth state and route protection.
 * 
 * Features:
 * - Persistent authentication via localStorage
 * - Automatic route protection and redirection
 * - Loading state management during auth checks
 * - Route-based access control
 * 
 * Route Types:
 * - Protected routes: Require authentication (/dashboard)
 * - Auth routes: Only accessible when not authenticated (/login, /signup)
 * - Public routes: Always accessible (/)
 * 
 * @component
 * @param props - Component props
 * @param props.children - Child components to render within the auth context
 * 
 * @example
 * ```tsx
 * // Wrap your app with AuthProvider
 * function App() {
 *   return (
 *     <AuthProvider>
 *       <Router>
 *         <Routes>
 *           <Route path="/" element={<Home />} />
 *           <Route path="/login" element={<Login />} />
 *           <Route path="/dashboard" element={<Dashboard />} />
 *         </Routes>
 *       </Router>
 *     </AuthProvider>
 *   );
 * }
 * ```
 */
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  // Define route types
  /** Routes that require authentication */
  const protectedRoutes = ['/dashboard']
  /** Routes only accessible when not authenticated */
  const authRoutes = ['/login', '/signup']
  /** Routes accessible to everyone */
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

  /**
   * Authenticates a user by storing their token and data.
   * 
   * @param newToken - JWT authentication token
   * @param newUser - User data to store
   */
  const login = (newToken: string, newUser: User) => {
    localStorage.setItem('token', newToken)
    localStorage.setItem('user', JSON.stringify(newUser))
    setToken(newToken)
    setUser(newUser)
  }

  /**
   * Logs out the current user by clearing all stored data.
   * Automatically redirects to the login page.
   */
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