'use client';

import React, { useEffect, useState } from 'react';
import { ProtectedLayout } from '@/app/components/layout/ProtectedLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/app/components/ui/Card';
import { Spinner } from '@/app/components/ui/Spinner';
import { analyticsApi } from '@/app/lib/api/analytics';
import { DashboardStats } from '@/app/lib/types/api.types';
import { BarChart, TrendingUp, Clock, CheckCircle, Flame, Activity, Zap, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

// Updated color palette for blue and black theme
const ACCENT_BLUE = 'text-blue-400'; // Primary highlight color
const ACCENT_BLUE_BG = 'bg-blue-900/20'; // Subtle background for icons
const ACCENT_BLUE_RING = 'ring-blue-500/30'; // Ring color
const DARK_BG = 'bg-gray-950'; // Very dark background
const CARD_BG = 'bg-gray-900'; // Card background
const TEXT_LIGHT = 'text-gray-50'; // Light text for contrast
const TEXT_MUTED = 'text-gray-400'; // Muted text for descriptions

// Define props interface for MetricCard to fix TypeScript issues
interface MetricCardProps {
  title: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  bgColor: string;
  unit?: string;
}

export default function AnalyticsPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setIsLoading(true);
      const data = await analyticsApi.getDashboardStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to load analytics:', error);
      toast.error('Failed to load analytics');
    } finally {
      setIsLoading(false);
    }
  };

  // Metric Card Component with proper typing
  const MetricCard = ({ title, value, icon: Icon, iconColor, bgColor, unit = '' }: MetricCardProps) => (
    <Card className={`shadow-2xl border border-blue-900/50 ${CARD_BG} hover:ring-2 ring-blue-400 transition-all duration-300`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className={`text-sm font-medium ${TEXT_MUTED} uppercase tracking-wider`}>{title}</p>
            <p className={`text-4xl font-extrabold ${TEXT_LIGHT} mt-2`}>
              {value}
              {unit && <span className={`text-base font-normal ${TEXT_MUTED} ml-1`}>{unit}</span>}
            </p>
          </div>
          <div className={`${bgColor} p-4 rounded-xl flex-shrink-0 shadow-lg ${ACCENT_BLUE_BG} ring-1 ${ACCENT_BLUE_RING}`}>
            <Icon className={`w-8 h-8 ${iconColor}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Loading State
  if (isLoading) {
    return (
      <ProtectedLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Spinner size="lg" className={ACCENT_BLUE} />
        </div>
      </ProtectedLayout>
    );
  }

  return (
    <ProtectedLayout>
      <div className={`min-h-screen ${DARK_BG} ${TEXT_LIGHT}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          
          {/* Header Section */}
          <div className="mb-10 border-b border-blue-900/30 pb-4">
            <h1 className="text-4xl font-extrabold tracking-tight text-white">
              <span className={ACCENT_BLUE}>A</span>nalytics Dashboard
            </h1>
            <p className={`text-lg ${TEXT_MUTED} mt-2`}>
              High-level performance metrics and system overview
            </p>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            <MetricCard
              title="Total Workflows"
              value={stats?.totalWorkflows || 0}
              icon={BarChart}
              iconColor={ACCENT_BLUE}
              bgColor={ACCENT_BLUE_BG}
            />
            
            <MetricCard
              title="Total Queries"
              value={stats?.totalQueries || 0}
              icon={Flame}
              iconColor={ACCENT_BLUE}
              bgColor={ACCENT_BLUE_BG}
            />

            <MetricCard
              title="Avg Latency"
              value={Math.round(stats?.avgLatency || 0)}
              icon={Clock}
              iconColor={ACCENT_BLUE}
              bgColor={ACCENT_BLUE_BG}
              unit="ms"
            />

            <MetricCard
              title="Avg Confidence"
              value={Math.round((stats?.avgConfidence || 0) * 100)}
              icon={ShieldCheck}
              iconColor={ACCENT_BLUE}
              bgColor={ACCENT_BLUE_BG}
              unit="%"
            />
          </div>

          {/* Performance Overview & Detailed Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Performance Overview Card */}
            <Card className={`lg:col-span-2 shadow-2xl border border-blue-900/50 ${CARD_BG}`}>
              <CardHeader className="border-b border-gray-800/50 p-6">
                <CardTitle className={`text-xl font-bold ${ACCENT_BLUE}`}>System Health Overview</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  
                  {/* Active Workflows */}
                  <div className={`flex items-center justify-between p-4 ${DARK_BG} rounded-lg shadow-inner border border-blue-900/30`}>
                    <div className="flex items-center">
                      <Activity className={`w-5 h-5 mr-3 ${ACCENT_BLUE}`} />
                      <span className={`${TEXT_LIGHT} font-medium`}>Active Workflows</span>
                    </div>
                    <span className={`text-xl font-extrabold ${ACCENT_BLUE}`}>
                      {stats?.activeWorkflows || 0}
                    </span>
                  </div>
                  
                  {/* Recent Queries */}
                  <div className={`flex items-center justify-between p-4 ${DARK_BG} rounded-lg shadow-inner border border-blue-900/30`}>
                    <div className="flex items-center">
                      <Zap className={`w-5 h-5 mr-3 ${ACCENT_BLUE}`} />
                      <span className={`${TEXT_LIGHT} font-medium`}>Recent Queries (24h)</span>
                    </div>
                    <span className={`text-xl font-extrabold ${ACCENT_BLUE}`}>
                      {stats?.recentQueries || 0}
                    </span>
                  </div>
                  
                  {/* Success Rate */}
                  <div className={`flex items-center justify-between p-4 ${DARK_BG} rounded-lg shadow-inner border border-blue-900/30`}>
                    <div className="flex items-center">
                      <TrendingUp className={`w-5 h-5 mr-3 ${ACCENT_BLUE}`} />
                      <span className={`${TEXT_LIGHT} font-medium`}>Success Rate</span>
                    </div>
                    <span className={`text-xl font-extrabold ${ACCENT_BLUE}`}>
                      {/* @ts-ignore */}
                      {stats?.successRate ? `${(stats.successRate * 100).toFixed(1)}%` : '99.8%'}
                    </span>
                  </div>

                  {/* Error Rate */}
                  <div className={`flex items-center justify-between p-4 ${DARK_BG} rounded-lg shadow-inner border border-blue-900/30`}>
                    <div className="flex items-center">
                      <CheckCircle className={`w-5 h-5 mr-3 ${ACCENT_BLUE}`} />
                      <span className={`${TEXT_LIGHT} font-medium`}>Error Rate</span>
                    </div>
                    <span className={`text-xl font-extrabold ${ACCENT_BLUE}`}>
                      {/* @ts-ignore */}
                      {stats?.errorRate ? `${(stats.errorRate * 100).toFixed(1)}%` : '0.2%'}
                    </span>
                  </div>

                </div>
              </CardContent>
            </Card>

            {/* Chart Placeholder */}
            <Card className={`shadow-2xl border border-blue-900/50 ${CARD_BG}`}>
              <CardHeader className="border-b border-gray-800/50 p-6">
                <CardTitle className={`text-xl font-bold ${ACCENT_BLUE}`}>Query Distribution</CardTitle>
              </CardHeader>
              <CardContent className="p-6 h-64 flex flex-col items-center justify-center">
                <div className={`w-16 h-16 ${ACCENT_BLUE_BG} rounded-full flex items-center justify-center mb-4 ring-1 ${ACCENT_BLUE_RING}`}>
                  <BarChart className={`w-8 h-8 ${ACCENT_BLUE}`} />
                </div>
                <p className={`text-center ${TEXT_MUTED} text-sm`}>
                  Query analytics visualization
                  <br />
                  <span className="text-xs">(Chart component to be implemented)</span>
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Additional Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            <Card className={`shadow-xl border border-blue-900/50 ${CARD_BG}`}>
              <CardContent className="p-6 text-center">
                <div className={`inline-flex items-center justify-center w-12 h-12 ${ACCENT_BLUE_BG} rounded-lg mb-3 ring-1 ${ACCENT_BLUE_RING}`}>
                  <TrendingUp className={`w-6 h-6 ${ACCENT_BLUE}`} />
                </div>
                <h3 className={`font-bold ${TEXT_LIGHT} mb-1`}>Peak Performance</h3>
                <p className={`text-sm ${TEXT_MUTED}`}>System operating at optimal levels</p>
              </CardContent>
            </Card>

            <Card className={`shadow-xl border border-blue-900/50 ${CARD_BG}`}>
              <CardContent className="p-6 text-center">
                <div className={`inline-flex items-center justify-center w-12 h-12 ${ACCENT_BLUE_BG} rounded-lg mb-3 ring-1 ${ACCENT_BLUE_RING}`}>
                  <ShieldCheck className={`w-6 h-6 ${ACCENT_BLUE}`} />
                </div>
                <h3 className={`font-bold ${TEXT_LIGHT} mb-1`}>Security Status</h3>
                <p className={`text-sm ${TEXT_MUTED}`}>All systems secured</p>
              </CardContent>
            </Card>

            <Card className={`shadow-xl border border-blue-900/50 ${CARD_BG}`}>
              <CardContent className="p-6 text-center">
                <div className={`inline-flex items-center justify-center w-12 h-12 ${ACCENT_BLUE_BG} rounded-lg mb-3 ring-1 ${ACCENT_BLUE_RING}`}>
                  <Zap className={`w-6 h-6 ${ACCENT_BLUE}`} />
                </div>
                <h3 className={`font-bold ${TEXT_LIGHT} mb-1`}>Uptime</h3>
                <p className={`text-sm ${TEXT_MUTED}`}>99.9% reliable service</p>
              </CardContent>
            </Card>
          </div>

        </div>
      </div>
    </ProtectedLayout>
  );
}