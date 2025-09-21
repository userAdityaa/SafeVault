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
            
            {/* Navigation removed - not implemented */}
            
            {/* CTA Buttons */}
            <div className="flex items-center space-x-4">
              <Link 
                href="/login"
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
              <div className="bg-gradient-to-br from-blue-50 via-white to-purple-50 rounded-2xl p-8 shadow-2xl border border-blue-100">
                {/* Browser mockup header */}
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                  <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                  <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                  <div className="ml-4 bg-white rounded px-3 py-1 text-xs text-gray-600 shadow-sm border border-gray-200">
                    safevault.com
                  </div>
                </div>

                {/* Dashboard preview enhanced */}
                <div className="bg-white rounded-xl p-6 space-y-6 shadow-lg border border-gray-100">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-bold text-gray-900 tracking-tight">My Files</h3>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-200 to-blue-400 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V7M16 3v4M8 3v4m-5 4h18" /></svg>
                      </div>
                    </div>
                  </div>

                  {/* Stats cards */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-blue-100/80 p-4 rounded-xl shadow border border-blue-200 flex flex-col items-center">
                      <div className="text-3xl font-extrabold text-blue-700 drop-shadow">1.2K</div>
                      <div className="text-xs text-blue-700 font-semibold mt-1">Total Files</div>
                    </div>
                    <div className="bg-green-100/80 p-4 rounded-xl shadow border border-green-200 flex flex-col items-center">
                      <div className="text-3xl font-extrabold text-green-700 drop-shadow">98%</div>
                      <div className="text-xs text-green-700 font-semibold mt-1">Uptime</div>
                    </div>
                    <div className="bg-purple-100/80 p-4 rounded-xl shadow border border-purple-200 flex flex-col items-center">
                      <div className="text-3xl font-extrabold text-purple-700 drop-shadow">15GB</div>
                      <div className="text-xs text-purple-700 font-semibold mt-1">Storage Used</div>
                    </div>
                  </div>

                  {/* File list attractive */}
                  <div className="space-y-3">
                    {/* File row 1 */}
                    <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-blue-50 to-white rounded-xl border border-blue-100 shadow-sm hover:shadow-md transition-shadow">
                      <div className="w-10 h-10 bg-blue-200 rounded-lg flex items-center justify-center">
                        <svg className="w-6 h-6 text-blue-700" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16V4a2 2 0 012-2h8l6 6v8a2 2 0 01-2 2H6a2 2 0 01-2-2z" /></svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900 truncate">Project_Plan.pdf</div>
                        <div className="text-xs text-gray-500 truncate">PDF • 1.2MB</div>
                      </div>
                      <button className="w-10 h-10 flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow transition-all duration-150 group">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 12h16m-8-8v16" /></svg>
                      </button>
                    </div>
                    {/* File row 2 */}
                    <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-green-50 to-white rounded-xl border border-green-100 shadow-sm hover:shadow-md transition-shadow">
                      <div className="w-10 h-10 bg-green-200 rounded-lg flex items-center justify-center">
                        <svg className="w-6 h-6 text-green-700" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16V4a2 2 0 012-2h8l6 6v8a2 2 0 01-2 2H6a2 2 0 01-2-2z" /></svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900 truncate">Team_Photo.png</div>
                        <div className="text-xs text-gray-500 truncate">Image • 3.4MB</div>
                      </div>
                      <button className="w-10 h-10 flex items-center justify-center bg-green-600 hover:bg-green-700 text-white rounded-full shadow transition-all duration-150 group">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 12h16m-8-8v16" /></svg>
                      </button>
                    </div>
                    {/* File row 3 */}
                    <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-purple-50 to-white rounded-xl border border-purple-100 shadow-sm hover:shadow-md transition-shadow">
                      <div className="w-10 h-10 bg-purple-200 rounded-lg flex items-center justify-center">
                        <svg className="w-6 h-6 text-purple-700" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16V4a2 2 0 012-2h8l6 6v8a2 2 0 01-2 2H6a2 2 0 01-2-2z" /></svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900 truncate">Invoice_March.xlsx</div>
                        <div className="text-xs text-gray-500 truncate">Excel • 520KB</div>
                      </div>
                      <button className="w-10 h-10 flex items-center justify-center bg-purple-600 hover:bg-purple-700 text-white rounded-full shadow transition-all duration-150 group">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 12h16m-8-8v16" /></svg>
                      </button>
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
