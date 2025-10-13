'use client';

import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { workflowsApi } from '../lib/api/workflow';
import { Workflow } from '../lib/types/workflow.types';
import toast from 'react-hot-toast';

export default function WorkflowsPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router, mounted]);

  useEffect(() => {
    if (mounted && isAuthenticated) {
      loadWorkflows();
    }
  }, [mounted, isAuthenticated]);

  const loadWorkflows = async () => {
    try {
      setLoading(true);
      const response = await workflowsApi.list();
      setWorkflows(response.workflows || []);
    } catch (error: any) {
      console.error('Failed to load workflows:', error);
      toast.error('Failed to load workflows');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete workflow "${name}"?`)) return;

    try {
      await workflowsApi.delete(id);
      toast.success('Workflow deleted');
      loadWorkflows();
    } catch (error) {
      toast.error('Failed to delete workflow');
    }
  };

  const handleActivate = async (id: string) => {
    try {
      await workflowsApi.update(id, { status: 'active' });
      toast.success('Workflow activated');
      loadWorkflows();
    } catch (error) {
      toast.error('Failed to activate workflow');
    }
  };

  if (!mounted || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-red-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="relative min-h-screen text-white">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gray-900" aria-hidden />
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[80vmin] w-[80vmin] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-50 blur-2xl"
        style={{
          background: "radial-gradient(circle at center, #dc2626, rgba(0,0,0,0) 60%)",
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-red-600/10 via-transparent to-red-700/10 -z-10"
        aria-hidden
      />

      {/* Header */}
      <div className="border-b border-white/10 bg-black/30 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="bg-gradient-to-r from-red-500 to-red-600 bg-clip-text text-2xl font-bold text-transparent">
                Workflows
              </h1>
              <p className="text-sm opacity-70">Create and manage your multi-LLM RAG pipelines</p>
            </div>
            <Link
              href="/workflows/new"
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-red-600 to-red-700 px-6 py-2 text-white transition hover:from-red-700 hover:to-red-800"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              New Workflow
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-6 py-8">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-red-600 border-t-transparent"></div>
          </div>
        ) : workflows.length === 0 ? (
          <div className="bg-black/40 backdrop-blur-sm rounded-lg border border-white/10 p-12 text-center">
            <div className="text-6xl mb-4">🚀</div>
            <h3 className="text-xl font-semibold text-white mb-2">No workflows yet</h3>
            <p className="text-gray-400 mb-6">Create your first workflow to start building intelligent RAG pipelines</p>
            <Link
              href="/workflows/new"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Create Your First Workflow
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {workflows.map((workflow) => (
              <div 
                key={workflow.id} 
                className="bg-black/40 backdrop-blur-sm rounded-lg border border-white/10 hover:border-red-500/30 transition-all duration-300 hover:transform hover:scale-[1.02]"
              >
                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white mb-1">{workflow.name}</h3>
                      {workflow.description && (
                        <p className="text-sm text-gray-400 line-clamp-2">{workflow.description}</p>
                      )}
                    </div>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded border ${
                        workflow.status === 'active'
                          ? 'bg-green-500/20 text-green-400 border-green-500/30'
                          : workflow.status === 'draft'
                          ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                          : 'bg-gray-500/20 text-gray-400 border-gray-500/30'
                      }`}
                    >
                      {workflow.status}
                    </span>
                  </div>

                  {/* Analytics */}
                  {workflow.analytics && (
                    <div className="mb-4 p-4 bg-white/5 rounded-lg border border-white/10">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-white">{workflow.analytics.totalQueries}</div>
                          <div className="text-xs text-gray-400 mt-1">Total Queries</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-white">
                            {Math.round(workflow.analytics.avgLatency || 0)}ms
                          </div>
                          <div className="text-xs text-gray-400 mt-1">Avg Latency</div>
                        </div>
                      </div>
                      {workflow.analytics.avgConfidence && (
                        <div className="mt-3">
                          <div className="flex justify-between text-xs text-gray-400 mb-1">
                            <span>Confidence</span>
                            <span>{Math.round((workflow.analytics.avgConfidence || 0) * 100)}%</span>
                          </div>
                          <div className="w-full bg-gray-700 rounded-full h-2">
                            <div 
                              className="bg-gradient-to-r from-red-500 to-red-600 h-2 rounded-full transition-all duration-500"
                              style={{ width: `${Math.round((workflow.analytics.avgConfidence || 0) * 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Steps Info */}
                  <div className="mb-4 flex items-center gap-2 text-sm text-gray-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <span>{workflow.configuration?.steps?.length || 0} steps</span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Link
                      href={`/workflows/${workflow.id}`}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      View
                    </Link>
                    <Link
                      href={`/workflows/${workflow.id}/edit`}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit
                    </Link>
                    <button
                      onClick={() => handleDelete(workflow.id, workflow.name)}
                      className="flex items-center justify-center px-3 py-2 text-sm bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors border border-red-500/30"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>

                  {/* Activate Button for Inactive Workflows */}
                  {workflow.status !== 'active' && (
                    <button
                      onClick={() => handleActivate(workflow.id)}
                      className="w-full mt-3 flex items-center justify-center gap-2 px-3 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Activate Workflow
                    </button>
                  )}

                  {/* Footer */}
                  <div className="mt-4 pt-4 border-t border-white/10 text-xs text-gray-500">
                    <div className="flex justify-between">
                      <span>Created {new Date(workflow.createdAt).toLocaleDateString()}</span>
                      <span>v{workflow.version || '1.0'}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Stats Bar */}
        {workflows.length > 0 && (
          <div className="mt-8 bg-black/40 backdrop-blur-sm rounded-lg border border-white/10 p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              <div>
                <div className="text-2xl font-bold text-white">{workflows.length}</div>
                <div className="text-sm text-gray-400">Total Workflows</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white">
                  {workflows.filter(w => w.status === 'active').length}
                </div>
                <div className="text-sm text-gray-400">Active</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white">
                  {workflows.reduce((total, w) => total + (w.analytics?.totalQueries || 0), 0)}
                </div>
                <div className="text-sm text-gray-400">Total Queries</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white">
                  {Math.round(
                    workflows.reduce((total, w) => total + (w.analytics?.avgLatency || 0), 0) / 
                    Math.max(workflows.filter(w => w.analytics?.avgLatency).length, 1)
                  )}ms
                </div>
                <div className="text-sm text-gray-400">Avg Latency</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}