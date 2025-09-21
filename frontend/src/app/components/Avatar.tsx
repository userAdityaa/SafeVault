'use client'

import Image from "next/image";
import { useState } from "react";

interface AvatarProps {
  src?: string | null;
  alt: string;
  size?: number;
  fallbackText?: string;
  className?: string;
}

export default function Avatar({ 
  src, 
  alt, 
  size = 36, 
  fallbackText = "?", 
  className = "" 
}: AvatarProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  const handleImageError = () => {
    setImageError(true);
    setImageLoading(false);
  };

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