"use client"

import { Toaster as Sonner, ToasterProps } from "sonner"

/**
 * Custom Toaster component wrapper around Sonner toast library.
 * 
 * Provides a pre-configured toast notification system with custom styling
 * that matches the application's design system. Uses light theme with
 * custom CSS variables for consistent appearance.
 * 
 * @component
 * @param props - All ToasterProps from sonner library
 * @returns Configured Sonner toaster component
 * 
 * @example
 * ```tsx
 * // Add to your root layout or app component
 * import { Toaster } from "@/components/ui/sonner";
 * 
 * function Layout({ children }) {
 *   return (
 *     <div>
 *       {children}
 *       <Toaster />
 *     </div>
 *   );
 * }
 * 
 * // Use in components with toast function
 * import { toast } from "sonner";
 * 
 * function MyComponent() {
 *   const handleClick = () => {
 *     toast.success("File uploaded successfully!");
 *     toast.error("Upload failed");
 *     toast.info("Processing file...");
 *   };
 * }
 * ```
 */
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      style={
        {
          "--normal-bg": "hsl(0 0% 100%)",
          "--normal-text": "hsl(222.2 84% 4.9%)",
          "--normal-border": "hsl(214.3 31.8% 91.4%)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
