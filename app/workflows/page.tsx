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
      setWorkflows(response.workflows);
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Workflows</h1>
          <p className="text-gray-600 mt-2">Create and manage your RAG workflows</p>
        </div>
        <Link
          href="/workflows/new"
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          + New Workflow
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent"></div>
        </div>
      ) : workflows.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="text-6xl mb-4">📋</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No workflows yet</h3>
          <p className="text-gray-600 mb-6">Create your first workflow to get started</p>
          <Link
            href="/workflows/new"
            className="inline-block px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Create Workflow
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {workflows.map((workflow) => (
            <div key={workflow.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">{workflow.name}</h3>
                    {workflow.description && (
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">{workflow.description}</p>
                    )}
                  </div>
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded ${
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

                {workflow.analytics && (
                  <div className="grid grid-cols-2 gap-4 mb-4 p-3 bg-gray-50 rounded">
                    <div>
                      <p className="text-xs text-gray-600">Queries</p>
                      <p className="text-lg font-semibold">{workflow.analytics.totalQueries}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Avg Latency</p>
                      <p className="text-lg font-semibold">{Math.round(workflow.analytics.avgLatency)}ms</p>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <Link
                    href={`/workflows/${workflow.id}`}
                    className="flex-1 px-3 py-2 text-sm bg-primary-50 text-primary-700 rounded hover:bg-primary-100 text-center"
                  >
                    View
                  </Link>
                  <Link
                    href={`/workflows/${workflow.id}/edit`}
                    className="flex-1 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-center"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => handleDelete(workflow.id, workflow.name)}
                    className="px-3 py-2 text-sm bg-red-50 text-red-700 rounded hover:bg-red-100"
                  >
                    Delete
                  </button>
                </div>

                {workflow.status !== 'active' && (
                  <button
                    onClick={() => handleActivate(workflow.id)}
                    className="w-full mt-2 px-3 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    Activate
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}