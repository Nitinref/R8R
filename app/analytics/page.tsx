'use client';

import React, { useEffect, useState } from 'react';
import { ProtectedLayout } from '@/app/components/layout/ProtectedLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/app/components/ui/Card';
import { Spinner } from '@/app/components/ui/Spinner';
import { analyticsApi } from '@/app/lib/api/analytics';
import { DashboardStats } from '@/app/lib/types/api.types';
import { BarChart, TrendingUp, Clock, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

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
      toast.error('Failed to load analytics');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <ProtectedLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Spinner size="lg" />
        </div>
      </ProtectedLayout>
    );
  }

  return (
    <ProtectedLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-600 mt-2">
            View detailed analytics and performance metrics
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Workflows</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {stats?.totalWorkflows || 0}
                  </p>
                </div>
                <div className="bg-blue-50 p-3 rounded-lg">
                  <BarChart className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Queries</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {stats?.totalQueries || 0}
                  </p>
                </div>
                <div className="bg-green-50 p-3 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Avg Latency</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {Math.round(stats?.avgLatency || 0)}ms
                  </p>
                </div>
                <div className="bg-yellow-50 p-3 rounded-lg">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Avg Confidence</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {Math.round((stats?.avgConfidence || 0) * 100)}%
                  </p>
                </div>
                <div className="bg-purple-50 p-3 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Performance Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <span className="text-gray-700">Active Workflows</span>
                <span className="text-lg font-semibold text-gray-900">
                  {stats?.activeWorkflows || 0}
                </span>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <span className="text-gray-700">Recent Queries (24h)</span>
                <span className="text-lg font-semibold text-gray-900">
                  {stats?.recentQueries || 0}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ProtectedLayout>
  );
}
