'use client';

import React from 'react';
import { Card, CardContent } from '@/app/components/ui/Card';
import { LucideIcon, ArrowUp, ArrowDown } from 'lucide-react';
// Assuming cn is a utility for conditionally joining class names
import { cn } from '@/app/lib/utils/helpers'; 

// Define the dark theme color palette
const CARD_BG = 'bg-gray-950'; // Deepest Black
const TEXT_LIGHT = 'text-gray-50'; // White/Light Text
const TEXT_MUTED = 'text-gray-400'; // Muted Text
const ACCENT_RED = 'text-red-500'; // Primary Red Accent
const ICON_BG = 'bg-red-900/10'; // Subtle red background for the icon

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

export function StatsCard({ title, value, icon: Icon, trend, className }: StatsCardProps) {
  // Determine trend color and icon
  const TrendIcon = trend?.isPositive ? ArrowUp : ArrowDown;
  const trendColorClass = trend?.isPositive ? 'text-green-400' : 'text-red-400';

  return (
    // Card styling: Deep black background with a subtle red border
    <Card className={cn(`shadow-2xl border border-red-900/50 ${CARD_BG}`, className)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            {/* Title: Uppercase, Muted Text */}
            <p className={`text-sm font-medium ${TEXT_MUTED} uppercase tracking-wider`}>{title}</p>
            
            {/* Value: Large, Bold, Light Text */}
            <p className={`text-4xl font-extrabold ${TEXT_LIGHT} mt-2`}>{value}</p>
            
            {/* Trend Indicator */}
            {trend && (
              <div className={cn('flex items-center mt-2', trendColorClass)}>
                <TrendIcon className="w-4 h-4 mr-1" />
                <p className="text-sm font-semibold">
                  {Math.abs(trend.value)}% 
                  <span className="ml-1">
                    {trend.isPositive ? 'Gain' : 'Loss'}
                  </span>
                </p>
              </div>
            )}
          </div>
          
          {/* Icon Area: Subtle red background with vibrant red icon */}
          <div className={`p-4 rounded-xl flex-shrink-0 ${ICON_BG} ring-1 ring-red-500/30`}>
            <Icon className={`w-8 h-8 ${ACCENT_RED}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}