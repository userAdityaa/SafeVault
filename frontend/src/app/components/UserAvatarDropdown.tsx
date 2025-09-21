'use client'

import { useState, useRef, useEffect } from 'react'
import { LogOut, User } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'

/**
 * Props for the UserAvatarDropdown component.
 */
interface UserAvatarDropdownProps {
  /** User data to display in the dropdown */
  user: {
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
}

/**
 * User avatar dropdown component with logout functionality.
 * 
 * Displays a clickable avatar that opens a dropdown menu with user information
 * and logout option. Handles click-outside behavior to close the dropdown.
 * 
 * Features:
 * - Profile picture or initials display
 * - Click-outside to close
 * - User info display
 * - Logout functionality
 * 
 * @component
 * @param props - Component props
 * @returns JSX element representing the user avatar dropdown
 * 
 * @example
 * ```tsx
 * const { user } = useAuth();
 * 
 * if (user) {
 *   return <UserAvatarDropdown user={user} />;
 * }
 * ```
 */
export default function UserAvatarDropdown({ user }: UserAvatarDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { logout } = useAuth()

  // Close dropdown when clicking outside
  useEffect(() => {
    /**
     * Handles click events outside the dropdown to close it.
     * @param event - Mouse click event
     */
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  /**
   * Gets the first letter of user's name or email for the avatar initial.
   * @returns Single uppercase character for avatar display
   */
  const getInitial = () => {
    const source = user?.name || user?.email || "?"
    return source.trim().charAt(0).toUpperCase()
  }

  /**
   * Handles logout by closing dropdown and calling auth logout function.
   */
  const handleLogout = () => {
    setIsOpen(false)
    logout()
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Avatar Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-9 h-9 rounded-full border hover:ring-2 hover:ring-blue-500 hover:ring-offset-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        {user?.picture ? (
          <img 
            src={user.picture} 
            alt="Profile" 
            className="w-9 h-9 rounded-full object-cover" 
          />
        ) : (
          <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-gray-700 font-semibold">
            {getInitial()}
          </div>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
          {/* User Info */}
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="flex items-center space-x-3">
              {user?.picture ? (
                <img 
                  src={user.picture} 
                  alt="Profile" 
                  className="w-10 h-10 rounded-full object-cover" 
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-700 font-semibold">
                  {getInitial()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user?.name || user?.email}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {user?.email}
                </p>
                {user?.isAdmin && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mt-1">
                    Admin
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="py-1">
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-150"
            >
              <LogOut className="w-4 h-4 mr-3" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}