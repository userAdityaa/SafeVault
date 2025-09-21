"use client";

import React from "react";
import Lottie from "lottie-react";
import loaderAnimation from "@/../public/loader.json";

/**
 * Full-screen loading spinner component using Lottie animation.
 * 
 * Displays a centered animated loader that covers the entire viewport.
 * Uses a Lottie animation for smooth, engaging loading feedback.
 * 
 * @component
 * @returns JSX element representing a full-screen loader
 * 
 * @example
 * ```tsx
 * // Show loader while data is loading
 * {isLoading && <Loader />}
 * 
 * // Use in conditional rendering
 * return isLoading ? <Loader /> : <MainContent />;
 * ```
 */
const Loader: React.FC = () => {
    return (
        <div className="flex items-center justify-center h-screen w-full bg-white">
            <Lottie
                animationData={loaderAnimation}
                loop={true}
                style={{ width: 200, height: 200 }}
            />
        </div>
    );
};

export default Loader;
