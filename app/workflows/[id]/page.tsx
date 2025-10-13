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
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    setMounted(true);
    // Get API key from localStorage or context
    const storedApiKey = localStorage.getItem('apiKey') || '';
    setApiKey(storedApiKey);
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

    if (!apiKey.trim()) {
      toast.error('Please set your API key first');
      return;
    }

    if (workflow?.status !== 'active') {
      toast.error('Workflow must be active to execute queries');
      return;
    }

    try {
      setExecuting(true);
      
      // Set the API key for the request
      const response = await queriesApi.execute({
        workflowId,
        query,
        // @ts-ignore
      }, apiKey); // Pass API key as second parameter
      
      setResult(response);
      toast.success('Query executed successfully!');
    } catch (error: any) {
      console.error('Execute error:', error);
      if (error.response?.status === 401) {
        toast.error('Invalid API key. Please check your API key.');
      } else if (error.response?.status === 403) {
        toast.error('API key missing or insufficient permissions');
      } else {
        toast.error(error.response?.data?.error || 'Failed to execute query');
      }
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

  // Mock function for demo purposes
  const executeMockQuery = () => {
    setExecuting(true);
    
    // Simulate API call delay
    setTimeout(() => {
      const mockResult: QueryResponse = {
        answer: "Machine learning is a subset of artificial intelligence that enables computers to learn and make decisions from data without being explicitly programmed. It uses algorithms to identify patterns in data and make predictions or decisions based on those patterns.",
        latency: 1247,
        confidence: 0.92,
        sources: [
          {
            content: "Machine learning algorithms build a mathematical model based on sample data, known as training data, in order to make predictions or decisions without being explicitly programmed to perform the task.",
            score: 0.95,
            metadata: { source: "Wikipedia", page: 42 }
          },
          {
            content: "The term machine learning was coined in 1959 by Arthur Samuel, an American IBMer and pioneer in the field of computer gaming and artificial intelligence.",
            score: 0.87,
            metadata: { source: "Tech Journal", page: 15 }
          },
          {
            content: "Modern machine learning includes deep learning and neural networks, which have revolutionized fields like computer vision, natural language processing, and autonomous systems.",
            score: 0.82,
            metadata: { source: "AI Research Paper", page: 8 }
          }
        ],
        cached: false,
        llmsUsed: ["gpt-4", "claude-3-sonnet"],
        retrieversUsed: ["pinecone", "elasticsearch"]
      };
      
      setResult(mockResult);
      setExecuting(false);
      toast.success('Query executed successfully! (Demo Mode)');
    }, 2000);
  };

  if (!mounted || isLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-red-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!isAuthenticated || !workflow) return null;

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

      <div className="max-w-7xl mx-auto px-4 py-8 relative z-10">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/workflows"
            className="text-red-400 hover:text-red-300 mb-4 inline-block flex items-center gap-2 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Workflows
          </Link>
          
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-red-400 to-red-600 bg-clip-text text-transparent">
                  {workflow.name}
                </h1>
                <span
                  className={`px-3 py-1 text-sm font-medium rounded border ${
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
              {workflow.description && (
                <p className="text-gray-400 mt-2">{workflow.description}</p>
              )}
            </div>
            <div className="flex gap-2">
              {workflow.status !== 'active' && (
                <button
                  onClick={handleActivate}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors border border-green-500/30"
                >
                  Activate
                </button>
              )}
              <Link
                href={`/workflows/${workflow.id}/edit`}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors border border-red-500/30"
              >
                Edit Workflow
              </Link>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Test Query Section */}
          <div className="lg:col-span-2">
            <div className="bg-black/40 backdrop-blur-sm rounded-lg border border-white/10">
              <div className="p-6 border-b border-white/10">
                <h2 className="text-xl font-semibold text-white">Test Query</h2>
                <p className="text-sm text-gray-400 mt-1">
                  {workflow.status === 'active'
                    ? 'Execute a test query to see your workflow in action'
                    : 'Activate this workflow to test queries'}
                </p>
              </div>

              <div className="p-6 space-y-4">
                {/* API Key Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    API Key
                  </label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => {
                      setApiKey(e.target.value);
                      localStorage.setItem('apiKey', e.target.value);
                    }}
                    placeholder="Enter your API key..."
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-white placeholder-gray-400"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Your API key is stored locally in your browser
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Enter your query
                  </label>
                  <textarea
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    rows={3}
                    placeholder="What is machine learning?"
                    disabled={workflow.status !== 'active'}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-white placeholder-gray-400 disabled:bg-gray-700 disabled:cursor-not-allowed"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleExecute}
                    disabled={executing || workflow.status !== 'active' || !apiKey}
                    className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-colors border border-red-500/30"
                  >
                    {executing ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Executing...
                      </span>
                    ) : (
                      '▶ Execute Query'
                    )}
                  </button>
                  
                  <button
                    onClick={executeMockQuery}
                    disabled={executing || workflow.status !== 'active'}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-colors border border-blue-500/30"
                  >
                    Demo
                  </button>
                </div>

                {workflow.status !== 'active' && (
                  <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-4">
                    <p className="text-sm text-yellow-400 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      This workflow is not active. Activate it to execute queries.
                    </p>
                  </div>
                )}

                {!apiKey && (
                  <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4">
                    <p className="text-sm text-red-400 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      Please set your API key to execute queries.
                    </p>
                  </div>
                )}

                {result && (
                  <div className="mt-6 space-y-4">
                    {/* Answer */}
                    <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4">
                      <h3 className="text-sm font-semibold text-green-400 mb-2 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Answer
                      </h3>
                      <p className="text-white whitespace-pre-wrap">{result.answer}</p>
                    </div>

                    {/* Metrics */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                        <p className="text-xs text-gray-400">Latency</p>
                        <p className="text-2xl font-bold text-white">{result.latency}ms</p>
                      </div>
                      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                        <p className="text-xs text-gray-400">Confidence</p>
                        <p className="text-2xl font-bold text-white">
                          {result.confidence ? `${(result.confidence * 100).toFixed(0)}%` : 'N/A'}
                        </p>
                      </div>
                      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                        <p className="text-xs text-gray-400">Sources</p>
                        <p className="text-2xl font-bold text-white">{result.sources.length}</p>
                      </div>
                    </div>

                    {/* LLMs & Retrievers Used */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-4">
                        <p className="text-sm font-semibold text-blue-400 mb-2">LLMs Used</p>
                        <div className="space-y-1">
                          {result.llmsUsed.map((llm, idx) => (
                            <span
                              key={idx}
                              className="inline-block px-2 py-1 bg-blue-500/30 text-blue-300 text-xs rounded mr-1 border border-blue-500/30"
                            >
                              {llm}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="bg-purple-500/20 border border-purple-500/30 rounded-lg p-4">
                        <p className="text-sm font-semibold text-purple-400 mb-2">Retrievers Used</p>
                        <div className="space-y-1">
                          {result.retrieversUsed.map((retriever, idx) => (
                            <span
                              key={idx}
                              className="inline-block px-2 py-1 bg-purple-500/30 text-purple-300 text-xs rounded mr-1 border border-purple-500/30"
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
                        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          </svg>
                          Source Documents
                        </h3>
                        <div className="space-y-3">
                          {result.sources.map((source, idx) => (
                            <div
                              key={idx}
                              className="bg-gray-800 border border-gray-700 rounded-lg p-4"
                            >
                              <div className="flex items-start justify-between mb-2">
                                <span className="text-xs font-semibold text-gray-400">
                                  Source {idx + 1}
                                </span>
                                {source.score && (
                                  <span className="text-xs text-gray-400">
                                    Score: {source.score.toFixed(3)}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-300">{source.content}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {result.cached && (
                      <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-3">
                        <p className="text-sm text-blue-400 flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          This result was retrieved from cache
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
            <div className="bg-black/40 backdrop-blur-sm rounded-lg border border-white/10 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Workflow Info</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-400">Total Steps</p>
                  <p className="text-2xl font-bold text-white">
                    {(workflow.configuration as any).steps?.length || 0}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Version</p>
                  <p className="text-2xl font-bold text-white">{workflow.version}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Created</p>
                  <p className="text-sm text-white">
                    {new Date(workflow.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Last Updated</p>
                  <p className="text-sm text-white">
                    {new Date(workflow.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Analytics */}
            {workflow.analytics && (
              <div className="bg-black/40 backdrop-blur-sm rounded-lg border border-white/10 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Analytics</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-400">Total Queries</p>
                    <p className="text-2xl font-bold text-white">
                      {workflow.analytics.totalQueries}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Success Rate</p>
                    <p className="text-2xl font-bold text-white">
                      {workflow.analytics.totalQueries > 0
                        ? `${((workflow.analytics.successfulQueries / workflow.analytics.totalQueries) * 100).toFixed(0)}%`
                        : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Avg Latency</p>
                    <p className="text-2xl font-bold text-white">
                      {Math.round(workflow.analytics.avgLatency)}ms
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Avg Confidence</p>
                    <p className="text-2xl font-bold text-white">
                      {(workflow.analytics.avgConfidence * 100).toFixed(0)}%
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="bg-black/40 backdrop-blur-sm rounded-lg border border-white/10 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <Link
                  href={`/workflows/${workflow.id}/edit`}
                  className="block w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-center font-medium transition-colors border border-red-500/30"
                >
                  Edit Workflow
                </Link>
                <Link
                  href="/analytics"
                  className="block w-full px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-center font-medium transition-colors border border-gray-700"
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