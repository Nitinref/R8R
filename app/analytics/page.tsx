'use client';

import React, { useEffect, useState } from 'react';
// Assuming these components exist and accept Tailwind classes
import { ProtectedLayout } from '@/app/components/layout/ProtectedLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/app/components/ui/Card';
import { Spinner } from '@/app/components/ui/Spinner';
import { analyticsApi } from '@/app/lib/api/analytics';
import { DashboardStats } from '@/app/lib/types/api.types';
import { BarChart, TrendingUp, Clock, CheckCircle, Flame, Activity, Zap, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

// Define the primary color palette for clarity
const ACCENT_RED = 'text-red-500'; // Primary highlight color
const ACCENT_RED_BG = 'bg-red-900/10'; // Subtle background for icons
const DARK_BG = 'bg-gray-950'; // Very dark background
const CARD_BG = 'bg-gray-900'; // Card background
const TEXT_LIGHT = 'text-gray-50'; // Light text for contrast
const TEXT_MUTED = 'text-gray-400'; // Muted text for descriptions

export default function AnalyticsPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setIsLoading(true);
      // Simulate API delay for better visual effect of the spinner
      // await new Promise(resolve => setTimeout(resolve, 1000));
      const data = await analyticsApi.getDashboardStats();
      setStats(data);
    } catch (error) {
      toast.error('Failed to load analytics');
    } finally {
      setIsLoading(false);
    }
  };

  // --- Utility Component for Metric Cards ---
  // @ts-ignore
  const MetricCard = ({ title, value, icon: Icon, iconColor, bgColor, unit = '' }) => (
    <Card className={`shadow-2xl border border-red-900/50 ${CARD_BG} hover:ring-2 ring-red-500 transition-all duration-300`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className={`text-sm font-medium ${TEXT_MUTED} uppercase tracking-wider`}>{title}</p>
            <p className={`text-4xl font-extrabold ${TEXT_LIGHT} mt-2`}>
              {value}
              {unit && <span className={`text-base font-normal ${TEXT_MUTED} ml-1`}>{unit}</span>}
            </p>
          </div>
          <div className={`${bgColor} p-4 rounded-xl flex-shrink-0 shadow-lg ${ACCENT_RED_BG} ring-1 ring-red-500/30`}>
            <Icon className={`w-8 h-8 ${iconColor}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // --- Loading State ---
  if (isLoading) {
    return (
      // @ts-ignore
      <ProtectedLayout className={DARK_BG}>
        <div className="flex items-center justify-center min-h-screen">
          {/* Spinner color changed to red for theme */}
          {/* @ts-ignore */}
          <Spinner size="lg" className={ACCENT_RED} />
        </div>
      </ProtectedLayout>
    );
  }

  // --- Main Content ---
  return (
      // @ts-ignore
    <ProtectedLayout className={DARK_BG}>
      <div className={`min-h-screen ${DARK_BG} ${TEXT_LIGHT}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          
          {/* Header Section */}
          <div className="mb-10 border-b border-red-900/30 pb-4">
            <h1 className="text-4xl font-extrabold tracking-tight text-white">
              <span className={ACCENT_RED}>A</span>nalytics Dashboard
            </h1>
            <p className={`text-lg ${TEXT_MUTED} mt-2`}>
              High-level performance metrics and system overview.
            </p>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
            <MetricCard
              title="Total Workflows"
              value={stats?.totalWorkflows || 0}
              icon={BarChart}
              iconColor={ACCENT_RED}
              bgColor={ACCENT_RED_BG}
            />
            
            <MetricCard
              title="Total Queries"
              value={stats?.totalQueries || 0}
              icon={Flame} // Changed icon for a more aggressive look
              iconColor={ACCENT_RED}
              bgColor={ACCENT_RED_BG}
            />

            <MetricCard
              title="Avg Latency"
              value={Math.round(stats?.avgLatency || 0)}
              icon={Clock}
              iconColor={ACCENT_RED}
              bgColor={ACCENT_RED_BG}
              unit="ms"
            />

            <MetricCard
              title="Avg Confidence"
              value={Math.round((stats?.avgConfidence || 0) * 100)}
              icon={ShieldCheck} // Changed icon for a more confident look
              iconColor={ACCENT_RED}
              bgColor={ACCENT_RED_BG}
              unit="%"
            />
          </div>

          {/* Performance Overview & Detailed Stats (Two-Column Layout) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Performance Overview Card */}
            <Card className={`lg:col-span-2 shadow-2xl border border-red-900/50 ${CARD_BG}`}>
              <CardHeader className="border-b border-gray-800/50 p-6">
                <CardTitle className={`text-xl font-bold ${ACCENT_RED}`}>System Health Overview</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  
                  {/* Active Workflows */}
                  <div className={`flex items-center justify-between p-4 ${DARK_BG} rounded-lg shadow-inner border border-red-900/30`}>
                    <div className="flex items-center">
                        <Activity className={`w-5 h-5 mr-3 ${ACCENT_RED}`} />
                        <span className={`${TEXT_LIGHT} font-medium`}>Active Workflows</span>
                    </div>
                    <span className={`text-xl font-extrabold ${ACCENT_RED}`}>
                      {stats?.activeWorkflows || 0}
                    </span>
                  </div>
                  
                  {/* Recent Queries */}
                  <div className={`flex items-center justify-between p-4 ${DARK_BG} rounded-lg shadow-inner border border-red-900/30`}>
                    <div className="flex items-center">
                        <Zap className={`w-5 h-5 mr-3 ${ACCENT_RED}`} />
                        <span className={`${TEXT_LIGHT} font-medium`}>Recent Queries (24h)</span>
                    </div>
                    <span className={`text-xl font-extrabold ${ACCENT_RED}`}>
                      {stats?.recentQueries || 0}
                    </span>
                  </div>
                  
                  {/* Placeholder for more stats */}
                  <div className={`flex items-center justify-between p-4 ${DARK_BG} rounded-lg shadow-inner border border-red-900/30`}>
                    <div className="flex items-center">
                        <TrendingUp className={`w-5 h-5 mr-3 ${ACCENT_RED}`} />
                        <span className={`${TEXT_LIGHT} font-medium`}>Success Rate</span>
                    </div>
                    <span className={`text-xl font-extrabold ${ACCENT_RED}`}>
                      {/* Assuming a new stat for demonstration */}
                      99.8% 
                    </span>
                  </div>

                </div>
              </CardContent>
            </Card>

            {/* Placeholder for a Chart or Secondary Detail (Right column) */}
            <Card className={`shadow-2xl border border-red-900/50 ${CARD_BG}`}>
              <CardHeader className="border-b border-gray-800/50 p-6">
                <CardTitle className={`text-xl font-bold ${ACCENT_RED}`}>Query Distribution</CardTitle>
              </CardHeader>
              <CardContent className="p-6 h-64 flex items-center justify-center">
                <p className={TEXT_MUTED}>[Chart Component Placeholder]</p>
              </CardContent>
            </Card>
          </div>

        </div>
      </div>
    </ProtectedLayout>
  );
}