import { cn } from '@/app/lib/utils/helpers';
import React from 'react';

// Define props for size and visual customization
interface SpinnerProps {
  /** Sets the width and height of the spinner. */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** Sets the border width (thickness) of the spinner. */
  thickness?: 'thin' | 'normal' | 'thick';
  /** The color of the main spinning stroke (e.g., 'red-500', 'white'). */
  color?: string;
  /** The background color of the spinner's track (faded part). */
  trackColor?: string;
  /** Optional class name for the wrapper div. */
  className?: string;
}

export function Spinner({ 
  size = 'md', 
  thickness = 'normal', 
  color = 'red-500', 
  trackColor = 'gray-700',
  className
}: SpinnerProps) {
  const sizes = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-6 h-6', // Slightly reduced size for a sleek look
    lg: 'w-8 h-8',
    xl: 'w-12 h-12',
  };

  const thicknesses = {
    thin: 'border-2',
    normal: 'border-4',
    thick: 'border-6',
  };
  
  // Construct the dynamic class strings
  const spinnerClasses = cn(
    'animate-spin rounded-full',
    sizes[size],
    thicknesses[thickness],
    `border-${trackColor} border-t-${color}`, // Dynamically set track and active colors
  );

  return (
    <div 
      className={cn("flex items-center justify-center", className)}
      role="status" 
      aria-live="polite" // Important for accessibility
    >
      <div
        className={spinnerClasses}
      />
      {/* Visually hidden text for screen readers */}
      <span className="sr-only">Loading...</span> 
    </div>
  );
}