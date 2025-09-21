/**
 * Landing page component for the SnapVault application.
 * 
 * Displays the main marketing page with:
 * - Header with navigation and branding
 * - Hero section with call-to-action
 * - Features and benefits sections
 * - Footer with company information
 * 
 * @component
 * @returns JSX element representing the landing page
 * 
 * @example
 * ```tsx
 * // This component is automatically rendered at the root route "/"
 * // Defined by Next.js app directory routing
 * ```
 */

import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            {/* Logo */}
            <div className="flex items-center">
              <Image src="/logo.png" alt="SnapVault" width={150} height={40} />
            </div>
            
            {/* Navigation */}
            <nav className="hidden md:flex space-x-8">
              <button className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium flex items-center">
                Solutions
                <svg className="ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <button className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium flex items-center">
                Features
                <svg className="ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <button className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium flex items-center">
                Resources
                <svg className="ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <button className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium flex items-center">
                About
                <svg className="ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <Link href="/pricing" className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium">
                Pricing
              </Link>
            </nav>
            
            {/* CTA Buttons */}
            <div className="flex items-center space-x-4">
              <Link 
                href="/signup"
                className="bg-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-20 lg:py-32">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Column - Content */}
            <div className="space-y-8">
              <div className="space-y-4">
                <div className="inline-block">
                  <span className="bg-blue-100 text-blue-800 text-sm font-semibold px-3 py-1 rounded-full">
                    File Management Platform
                  </span>
                </div>
                
                <h1 className="text-4xl lg:text-6xl font-bold text-gray-900 leading-tight">
                  Enterprise-Grade
                  <br />
                  <span className="text-blue-600">File Management</span>
                </h1>
                
                <p className="text-xl text-gray-600 leading-relaxed max-w-lg">
                  Streamline Operations, Boost Efficiency, and 
                  Secure Your Data.
                </p>
                
                <p className="text-gray-600 max-w-lg">
                  Delivering exceptional file organization and secure storage 
                  experiences efficiently, from end-to-end, requires 
                  the right tools.
                </p>
              </div>
              
              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <Link 
                  href="/signup"
                  className="bg-blue-600 text-white px-8 py-4 rounded-full text-base font-medium hover:bg-blue-700 transition-colors inline-flex items-center justify-center"
                >
                  Start Free Trial
                </Link>
              </div>
            </div>
            
            {/* Right Column - Dashboard Preview Placeholder */}
            <div className="relative">
              <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl p-8 shadow-2xl">
                {/* Browser mockup header */}
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                  <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                  <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                  <div className="ml-4 bg-white rounded px-3 py-1 text-xs text-gray-600">
                    snapvault.com
                  </div>
                </div>
                
                {/* Dashboard preview placeholder */}
                <div className="bg-white rounded-lg p-6 space-y-4">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">My Files</h3>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-blue-100 rounded-full"></div>
                    </div>
                  </div>
                  
                  {/* Stats cards */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">1.2K</div>
                      <div className="text-xs text-blue-600">Total Files</div>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">98%</div>
                      <div className="text-xs text-green-600">Uptime</div>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">15GB</div>
                      <div className="text-xs text-purple-600">Storage Used</div>
                    </div>
                  </div>
                  
                  {/* File list placeholder */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded">
                      <div className="w-8 h-8 bg-blue-200 rounded"></div>
                      <div className="flex-1">
                        <div className="h-3 bg-gray-300 rounded w-24"></div>
                        <div className="h-2 bg-gray-200 rounded w-16 mt-1"></div>
                      </div>
                      <div className="w-16 h-6 bg-gray-200 rounded"></div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded">
                      <div className="w-8 h-8 bg-green-200 rounded"></div>
                      <div className="flex-1">
                        <div className="h-3 bg-gray-300 rounded w-32"></div>
                        <div className="h-2 bg-gray-200 rounded w-20 mt-1"></div>
                      </div>
                      <div className="w-16 h-6 bg-gray-200 rounded"></div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded">
                      <div className="w-8 h-8 bg-purple-200 rounded"></div>
                      <div className="flex-1">
                        <div className="h-3 bg-gray-300 rounded w-28"></div>
                        <div className="h-2 bg-gray-200 rounded w-18 mt-1"></div>
                      </div>
                      <div className="w-16 h-6 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Floating elements for visual interest */}
              <div className="absolute -top-4 -right-4 w-16 h-16 bg-blue-100 rounded-full opacity-60"></div>
              <div className="absolute -bottom-6 -left-6 w-12 h-12 bg-purple-100 rounded-full opacity-60"></div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
