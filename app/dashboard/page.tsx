'use client';

import React, { useEffect, useState } from 'react';
import { ProtectedLayout } from '@/app/components/layout/ProtectedLayout';
import { StatsCard } from '@/app/components/dashboard/StatsCard';
import { RecentQueries } from '@/app/components/dashboard/RecentQueries';
import { WorkflowList } from '@/app/components/dashboard/WorkflowList';
import { Spinner } from '@/app/components/ui/Spinner';
import { analyticsApi } from '@/app/lib/api/analytics';
import { workflowsApi } from '@/app/lib/api/workflow';
import { queriesApi } from '@/app/lib/api/queries';
import { DashboardStats } from '@/app/lib/types/api.types';
import { Workflow } from '@/app/lib/types/workflow.types';
import { QueryLog } from '@/app/lib/types/api.types';
import { 
  Workflow as WorkflowIcon, 
  Activity, 
  Clock, 
  TrendingUp, 
  Zap,
  Brain,
  Database,
  BarChart3,
  Sparkles,
  Rocket,
  Play,
  Plus,
  Eye
} from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [recentQueries, setRecentQueries] = useState<QueryLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      const [statsData, workflowsData, queriesData] = await Promise.all([
        analyticsApi.getDashboardStats(),
        workflowsApi.list(),
        queriesApi.getHistory({ limit: 5 })
      ]);

      setStats(statsData);
      setWorkflows(workflowsData.workflows.slice(0, 5));
      setRecentQueries(queriesData.logs);
    } catch (error: any) {
      toast.error('Failed to load dashboard data');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <ProtectedLayout>
        <div className="flex items-center justify-center min-h-screen bg-[var(--brand-bg)]">
          <div className="text-center">
            <Spinner size="lg" />
            <p className="mt-4 text-white/60">Loading your dashboard...</p>
          </div>
        </div>
      </ProtectedLayout>
    );
  }

  return (
    <>
      <style jsx global>{`
        @keyframes glowMove1 {
          0% {
            transform: translate(-100vw, -100vh) scale(0.8);
            opacity: 0.1;
          }
          50% {
            transform: translate(0, 0) scale(1.2);
            opacity: 0.2;
          }
          100% {
            transform: translate(100vw, 100vh) scale(0.8);
            opacity: 0.1;
          }
        }

        @keyframes glowMove2 {
          0% {
            transform: translate(100vw, -50vh) scale(1);
            opacity: 0.15;
          }
          50% {
            transform: translate(-20vw, 20vh) scale(0.9);
            opacity: 0.25;
          }
          100% {
            transform: translate(-100vw, 100vh) scale(1);
            opacity: 0.15;
          }
        }

        .background-glow {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          z-index: -1;
          pointer-events: none;
        }

        .glow-1 {
          width: 600px;
          height: 600px;
          background: radial-gradient(circle, var(--brand-red-1), transparent 60%);
          animation: glowMove1 25s infinite alternate ease-in-out;
          top: -300px;
          left: -300px;
        }

        .glow-2 {
          width: 700px;
          height: 700px;
          background: radial-gradient(circle, var(--brand-red-2), transparent 70%);
          animation: glowMove2 30s infinite alternate-reverse ease-in-out;
          bottom: -350px;
          right: -350px;
        }

        .grid-pattern {
          background-image: 
            linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
          background-size: 50px 50px;
        }

        .shimmer-text {
          background: linear-gradient(90deg, #fff 0%, var(--brand-red-1) 50%, #fff 100%);
          background-size: 1000px 100%;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shimmer 3s infinite linear;
        }

        @keyframes shimmer {
          0% { background-position: -1000px 0; }
          100% { background-position: 1000px 0; }
        }
      `}</style>

      <ProtectedLayout>
        <main className="relative min-h-screen overflow-hidden text-[var(--brand-contrast)] bg-[var(--brand-bg)] grid-pattern">
          {/* Background Glow Effects */}
          {isClient && (
            <>
              <div className="background-glow glow-1"></div>
              <div className="background-glow glow-2"></div>
            </>
          )}

          {/* Centering Gradient */}
          <div
            className="pointer-events-none absolute left-1/2 top-1/2 h-[120vmin] w-[120vmin] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-15 blur-3xl"
            style={{
              background: "radial-gradient(circle at center, var(--brand-red-1), rgba(0,0,0,0) 75%)",
            }}
            aria-hidden
          />

          <div className="relative z-10 max-w-7xl mx-auto px-6 py-8">
            {/* Header Section */}
            <div className="mb-8">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 mb-4">
                    <Rocket className="h-4 w-4 text-[var(--brand-red-1)]" />
                    <span className="text-sm font-medium text-white/80">Welcome to Your Dashboard</span>
                  </div>
                  
                  <h1 className="text-4xl font-bold bg-gradient-to-br from-white to-white/80 bg-clip-text text-transparent">
                    Dashboard
                  </h1>
                  <p className="text-white/60 mt-2 text-lg">
                    Monitor your RAG workflows and analytics in real-time
                  </p>
                </div>

                <div className="flex gap-3">
                  <Link
                    href="/workflows/new"
                    className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[var(--brand-red-1)] to-[var(--brand-red-2)] px-6 py-3 font-semibold text-white transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-[var(--brand-red-1)]/30"
                  >
                    <Plus className="h-5 w-5" />
                    New Workflow
                  </Link>
                  
                  <Link
                    href="/analytics"
                    className="group inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-6 py-3 font-semibold text-white/90 transition-all duration-300 hover:bg-white/10 hover:scale-105"
                  >
                    <BarChart3 className="h-5 w-5" />
                    View Analytics
                  </Link>
                </div>
              </div>
            </div>

            {/* Stats Grid - Enhanced */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="group relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-[var(--brand-red-1)] to-[var(--brand-red-2)] rounded-2xl blur opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
                <div className="relative bg-black/40 border border-white/10 rounded-2xl p-6 backdrop-blur-sm hover:border-[var(--brand-red-1)]/30 transition-all duration-300 group-hover:scale-105">
                  <div className="flex items-center justify-between mb-4">
                    <WorkflowIcon className="h-8 w-8 text-[var(--brand-red-1)]" />
                    <Sparkles className="h-5 w-5 text-[var(--brand-red-1)] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>
                  <h3 className="text-white/60 text-sm font-medium mb-2">Total Workflows</h3>
                  <div className="text-3xl font-bold text-white">{stats?.totalWorkflows || 0}</div>
                  <div className="text-sm text-green-400 mt-2 flex items-center gap-1">
                    <TrendingUp className="h-4 w-4" />
                    +12% this month
                  </div>
                </div>
              </div>

              <div className="group relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl blur opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
                <div className="relative bg-black/40 border border-white/10 rounded-2xl p-6 backdrop-blur-sm hover:border-blue-400/30 transition-all duration-300 group-hover:scale-105">
                  <div className="flex items-center justify-between mb-4">
                    <Activity className="h-8 w-8 text-blue-400" />
                    <Zap className="h-5 w-5 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>
                  <h3 className="text-white/60 text-sm font-medium mb-2">Active Workflows</h3>
                  <div className="text-3xl font-bold text-white">{stats?.activeWorkflows || 0}</div>
                  <div className="text-sm text-blue-400 mt-2 flex items-center gap-1">
                    <Eye className="h-4 w-4" />
                    Running now
                  </div>
                </div>
              </div>

              <div className="group relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl blur opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
                <div className="relative bg-black/40 border border-white/10 rounded-2xl p-6 backdrop-blur-sm hover:border-green-400/30 transition-all duration-300 group-hover:scale-105">
                  <div className="flex items-center justify-between mb-4">
                    <Brain className="h-8 w-8 text-green-400" />
                    <TrendingUp className="h-5 w-5 text-green-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>
                  <h3 className="text-white/60 text-sm font-medium mb-2">Total Queries</h3>
                  <div className="text-3xl font-bold text-white">{stats?.totalQueries || 0}</div>
                  <div className="text-sm text-green-400 mt-2 flex items-center gap-1">
                    <Database className="h-4 w-4" />
                    All time
                  </div>
                </div>
              </div>

              <div className="group relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl blur opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
                <div className="relative bg-black/40 border border-white/10 rounded-2xl p-6 backdrop-blur-sm hover:border-purple-400/30 transition-all duration-300 group-hover:scale-105">
                  <div className="flex items-center justify-between mb-4">
                    <Clock className="h-8 w-8 text-purple-400" />
                    <Zap className="h-5 w-5 text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>
                  <h3 className="text-white/60 text-sm font-medium mb-2">Avg Latency</h3>
                  <div className="text-3xl font-bold text-white">{Math.round(stats?.avgLatency || 0)}ms</div>
                  <div className="text-sm text-purple-400 mt-2 flex items-center gap-1">
                    <Play className="h-4 w-4" />
                    Real-time
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content Grid - Enhanced */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              {/* Workflows Section */}
              <div className="group relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-[var(--brand-red-1)] to-[var(--brand-red-2)] rounded-3xl blur opacity-20 group-hover:opacity-30 transition-opacity duration-300"></div>
                <div className="relative bg-black/40 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                        <WorkflowIcon className="h-5 w-5 text-[var(--brand-red-1)]" />
                        Recent Workflows
                      </h2>
                      <p className="text-white/60 text-sm mt-1">Your most recent AI workflows</p>
                    </div>
                    <Link
                      href="/workflows"
                      className="text-[var(--brand-red-1)] hover:text-[var(--brand-red-2)] text-sm font-medium transition-colors duration-200"
                    >
                      View All →
                    </Link>
                  </div>
                  <WorkflowList workflows={workflows} />
                </div>
              </div>

              {/* Recent Queries Section */}
              <div className="group relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-3xl blur opacity-20 group-hover:opacity-30 transition-opacity duration-300"></div>
                <div className="relative bg-black/40 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                        <Activity className="h-5 w-5 text-blue-400" />
                        Recent Queries
                      </h2>
                      <p className="text-white/60 text-sm mt-1">Latest query activity</p>
                    </div>
                    <Link
                      href="/analytics"
                      className="text-blue-400 hover:text-cyan-400 text-sm font-medium transition-colors duration-200"
                    >
                      View All →
                    </Link>
                  </div>
                  {/* @ts-ignore */}
                  <RecentQueries queries={recentQueries} />
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
              <Link
                href="/editor"
                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[var(--brand-red-1)]/10 to-[var(--brand-red-2)]/10 p-6 backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:border-[var(--brand-red-1)]/30"
              >
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 bg-gradient-to-r from-[var(--brand-red-1)] to-[var(--brand-red-2)] rounded-xl flex items-center justify-center">
                    <Plus className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Create Workflow</h3>
                    <p className="text-white/60 text-sm mt-1">Build a new RAG pipeline</p>
                  </div>
                </div>
              </Link>

              <Link
                href="/templates"
                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 p-6 backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:border-blue-400/30"
              >
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                    <WorkflowIcon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Use Template</h3>
                    <p className="text-white/60 text-sm mt-1">Start from a template</p>
                  </div>
                </div>
              </Link>

              <Link
                href="/docs"
                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-green-500/10 to-emerald-500/10 p-6 backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:border-green-400/30"
              >
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                    <Brain className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Documentation</h3>
                    <p className="text-white/60 text-sm mt-1">Learn best practices</p>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </main>
      </ProtectedLayout>
    </>
  );
}