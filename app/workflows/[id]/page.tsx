'use client';

import { useAuth } from '@/app/context/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { workflowsApi } from '@/app/lib/api/workflow';
import { queriesApi } from '@/app/lib/api/queries';
import { Workflow } from '@/app/lib/types/workflow.types';
import { QueryResponse } from '@/app/lib/types/api.types';
import toast from 'react-hot-toast';

export default function WorkflowDetailPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const workflowId = params.id as string;

  const [mounted, setMounted] = useState(false);
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState<QueryResponse | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router, mounted]);

  useEffect(() => {
    if (mounted && isAuthenticated && workflowId) {
      loadWorkflow();
    }
  }, [mounted, isAuthenticated, workflowId]);

  const loadWorkflow = async () => {
    try {
      setLoading(true);
      const response = await workflowsApi.get(workflowId);
      setWorkflow(response.workflow);
    } catch (error: any) {
      console.error('Failed to load workflow:', error);
      toast.error('Failed to load workflow');
      router.push('/workflows');
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = async () => {
    if (!query.trim()) {
      toast.error('Please enter a query');
      return;
    }

    if (workflow?.status !== 'active') {
      toast.error('Workflow must be active to execute queries');
      return;
    }

    try {
      setExecuting(true);
      const response = await queriesApi.execute({
        workflowId,
        query,
      });
      setResult(response);
      toast.success('Query executed successfully!');
    } catch (error: any) {
      console.error('Execute error:', error);
      toast.error(error.response?.data?.error || 'Failed to execute query');
    } finally {
      setExecuting(false);
    }
  };

  const handleActivate = async () => {
    try {
      await workflowsApi.update(workflowId, { status: 'active' });
      toast.success('Workflow activated');
      loadWorkflow();
    } catch (error) {
      toast.error('Failed to activate workflow');
    }
  };

  if (!mounted || isLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!isAuthenticated || !workflow) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/workflows"
            className="text-primary-600 hover:text-primary-700 mb-4 inline-block"
          >
            ← Back to Workflows
          </Link>
          
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-gray-900">{workflow.name}</h1>
                <span
                  className={`px-3 py-1 text-sm font-medium rounded ${
                    workflow.status === 'active'
                      ? 'bg-green-100 text-green-800'
                      : workflow.status === 'draft'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {workflow.status}
                </span>
              </div>
              {workflow.description && (
                <p className="text-gray-600 mt-2">{workflow.description}</p>
              )}
            </div>
            <div className="flex gap-2">
              {workflow.status !== 'active' && (
                <button
                  onClick={handleActivate}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Activate
                </button>
              )}
              <Link
                href={`/workflows/${workflow.id}/edit`}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                Edit Workflow
              </Link>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Test Query Section */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Test Query</h2>
                <p className="text-sm text-gray-600 mt-1">
                  {workflow.status === 'active'
                    ? 'Execute a test query to see your workflow in action'
                    : 'Activate this workflow to test queries'}
                </p>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Enter your query
                  </label>
                  <textarea
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    rows={3}
                    placeholder="What is machine learning?"
                    disabled={workflow.status !== 'active'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>

                <button
                  onClick={handleExecute}
                  disabled={executing || workflow.status !== 'active'}
                  className="w-full px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                >
                  {executing ? 'Executing...' : '▶ Execute Query'}
                </button>

                {workflow.status !== 'active' && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm text-yellow-800">
                      ⚠️ This workflow is not active. Activate it to execute queries.
                    </p>
                  </div>
                )}

                {result && (
                  <div className="mt-6 space-y-4">
                    {/* Answer */}
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h3 className="text-sm font-semibold text-green-900 mb-2">
                        ✓ Answer
                      </h3>
                      <p className="text-gray-800 whitespace-pre-wrap">{result.answer}</p>
                    </div>

                    {/* Metrics */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-xs text-gray-600">Latency</p>
                        <p className="text-2xl font-bold text-gray-900">{result.latency}ms</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-xs text-gray-600">Confidence</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {result.confidence ? `${(result.confidence * 100).toFixed(0)}%` : 'N/A'}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-xs text-gray-600">Sources</p>
                        <p className="text-2xl font-bold text-gray-900">{result.sources.length}</p>
                      </div>
                    </div>

                    {/* LLMs & Retrievers Used */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p className="text-sm font-semibold text-blue-900 mb-2">LLMs Used</p>
                        <div className="space-y-1">
                          {result.llmsUsed.map((llm, idx) => (
                            <span
                              key={idx}
                              className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded mr-1"
                            >
                              {llm}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                        <p className="text-sm font-semibold text-purple-900 mb-2">Retrievers Used</p>
                        <div className="space-y-1">
                          {result.retrieversUsed.map((retriever, idx) => (
                            <span
                              key={idx}
                              className="inline-block px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded mr-1"
                            >
                              {retriever}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Sources */}
                    {result.sources.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900 mb-3">
                          📚 Source Documents
                        </h3>
                        <div className="space-y-3">
                          {result.sources.map((source, idx) => (
                            <div
                              key={idx}
                              className="bg-gray-50 border border-gray-200 rounded-lg p-4"
                            >
                              <div className="flex items-start justify-between mb-2">
                                <span className="text-xs font-semibold text-gray-600">
                                  Source {idx + 1}
                                </span>
                                {source.score && (
                                  <span className="text-xs text-gray-600">
                                    Score: {source.score.toFixed(3)}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-700">{source.content}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {result.cached && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-sm text-blue-800">
                          ⚡ This result was retrieved from cache
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Workflow Info Sidebar */}
          <div className="space-y-6">
            {/* Workflow Stats */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Workflow Info</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">Total Steps</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {(workflow.configuration as any).steps?.length || 0}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Version</p>
                  <p className="text-2xl font-bold text-gray-900">{workflow.version}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Created</p>
                  <p className="text-sm text-gray-900">
                    {new Date(workflow.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Last Updated</p>
                  <p className="text-sm text-gray-900">
                    {new Date(workflow.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Analytics */}
            {workflow.analytics && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Analytics</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600">Total Queries</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {workflow.analytics.totalQueries}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Success Rate</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {workflow.analytics.totalQueries > 0
                        ? `${((workflow.analytics.successfulQueries / workflow.analytics.totalQueries) * 100).toFixed(0)}%`
                        : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Avg Latency</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {Math.round(workflow.analytics.avgLatency)}ms
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Avg Confidence</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {(workflow.analytics.avgConfidence * 100).toFixed(0)}%
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <Link
                  href={`/workflows/${workflow.id}/edit`}
                  className="block w-full px-4 py-2 bg-primary-50 text-primary-700 rounded-lg hover:bg-primary-100 text-center font-medium"
                >
                  Edit Workflow
                </Link>
                <Link
                  href="/analytics"
                  className="block w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-center font-medium"
                >
                  View Analytics
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
