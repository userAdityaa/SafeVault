/**
 * Root layout component for the SafeVault application.
 * 
 * Provides the foundational structure for all pages including:
 * - Font configuration (Geist Sans and Mono)
 * - SEO metadata and Open Graph tags
 * - Authentication providers
 * - Toast notifications
 * - Global styling
 */

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { AuthProvider } from "@/lib/auth-context";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

/** Geist Sans font configuration for the application */
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

/** Geist Mono font configuration for code and monospace text */
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/**
 * Application metadata for SEO and social sharing.
 * 
 * Includes comprehensive metadata for:
 * - Search engine optimization
 * - Open Graph social sharing
 * - Twitter card integration
 * - Progressive Web App support
 */
export const metadata: Metadata = {
  title: "SafeVault - Enterprise File Management",
  description: "Streamline operations, boost efficiency, and secure your data with SafeVault's enterprise-grade file management platform.",
  keywords: ["file management", "cloud storage", "enterprise", "secure storage", "file sharing", "document management"],
  authors: [{ name: "SafeVault Team" }],
  creator: "SafeVault",
  publisher: "SafeVault",
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://safevault.com",
    title: "SafeVault - Enterprise File Management",
    description: "Streamline operations, boost efficiency, and secure your data with SafeVault's enterprise-grade file management platform.",
    siteName: "SafeVault",
    images: [
      {
        url: "/logo_small.png",
        width: 1200,
        height: 630,
        alt: "SafeVault Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SafeVault - Enterprise File Management",
    description: "Streamline operations, boost efficiency, and secure your data with SafeVault's enterprise-grade file management platform.",
    images: ["/logo_small.png"],
  },
  icons: {
    icon: "/logo_small.png",
    shortcut: "/logo_small.png",
    apple: "/logo_small.png",
  },
  manifest: "/manifest.json",
};

/**
 * Root layout component that wraps all pages with necessary providers and styling.
 * 
 * Sets up the application foundation including:
 * - Google OAuth integration for authentication
 * - Authentication context for user session management
 * - Toast notifications system
 * - Font loading and CSS variables
 * - Progressive Web App features
 * 
 * @component
 * @param props - Layout component props
 * @param props.children - Child pages/components to render
 * @returns JSX element representing the root HTML structure
 * 
 * @example
 * ```tsx
 * // This layout automatically wraps all pages in the app directory
 * // No manual usage required - Next.js handles this automatically
 * ```
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/logo_small.png" type="image/png" />
        <link rel="apple-touch-icon" href="/logo_small.png" />
        <meta name="theme-color" content="#2563eb" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!}>
          <AuthProvider>
            {children}
            <Toaster richColors position="top-right" />
          </AuthProvider>
        </GoogleOAuthProvider>
      </body>
    </html>
  );
}
