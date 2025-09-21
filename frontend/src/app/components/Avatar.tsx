'use client'

import Image from "next/image";
import { useState } from "react";

/**
 * Props for the Avatar component.
 */
interface AvatarProps {
  /** Image source URL. If null or undefined, fallback will be shown */
  src?: string | null;
  /** Alt text for the avatar image */
  alt: string;
  /** Size of the avatar in pixels. Defaults to 36 */
  size?: number;
  /** Fallback text to display when image fails to load. Defaults to "?" */
  fallbackText?: string;
  /** Additional CSS classes to apply to the avatar container */
  className?: string;
}

/**
 * Avatar component that displays a user profile image with fallback support.
 * 
 * Features:
 * - Automatic fallback to default icon when image fails to load
 * - Customizable size and styling
 * - Lazy loading for performance
 * - Error handling with graceful degradation
 * 
 * @component
 * @param props - The avatar component props
 * @returns JSX element representing the avatar
 * 
 * @example
 * ```tsx
 * // Basic usage with image
 * <Avatar src="/profile.jpg" alt="User Profile" />
 * 
 * // Custom size and fallback
 * <Avatar 
 *   src="/profile.jpg" 
 *   alt="John Doe" 
 *   size={64} 
 *   fallbackText="JD"
 *   className="border-2 border-blue-500"
 * />
 * 
 * // Fallback only
 * <Avatar alt="Anonymous User" fallbackText="AU" />
 * ```
 */
export default function Avatar({ 
  src, 
  alt, 
  size = 36, 
  fallbackText = "?", 
  className = "" 
}: AvatarProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  /**
   * Handles image loading errors by switching to fallback state.
   */
  const handleImageError = () => {
    setImageError(true);
    setImageLoading(false);
  };

  /**
   * Handles successful image loading by updating the loading state.
   */
  const handleImageLoad = () => {
    setImageLoading(false);
  };

  // Show fallback if no src, error occurred, or still loading and no src
  const showFallback = !src || imageError || (imageLoading && !src);

  if (showFallback) {
    return (
      <div 
        className={`relative flex items-center justify-center rounded-full bg-gray-200 text-gray-700 font-semibold border ${className}`}
        style={{ width: size, height: size }}
      >
        {/* Fallback icon SVG */}
        <Image
          src="/user-fallback.svg"
          alt="User avatar"
          width={size * 0.6}
          height={size * 0.6}
          className="text-gray-500"
        />
      </div>
    );
  }

  return (
    <div className={`relative rounded-full border overflow-hidden ${className}`} style={{ width: size, height: size }}>
      <img
        src={src}
        alt={alt}
        className="w-full h-full object-cover"
        onError={handleImageError}
        onLoad={handleImageLoad}
        loading="lazy"
      />
    </div>
  );
}