'use client';

import React, { useEffect, useState } from 'react';
import { ProtectedLayout } from '@/app/components/layout/ProtectedLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import { Badge } from '@/app/components/ui/Badge';
import { Spinner } from '@/app/components/ui/Spinner';
import { Modal } from '@/app/components/ui/Modal';
import { authApi } from '@/app/lib/api/auth';
import { ApiKey } from '@/app/lib/types/auth.types';
import { formatDateTime } from '@/app/lib/utils/helpers';
import { Plus, Copy, Trash2, Key } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ApiKeysPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);

  useEffect(() => {
    loadApiKeys();
  }, []);

  const loadApiKeys = async () => {
    try {
      setIsLoading(true);
      const response = await authApi.listApiKeys();
      setApiKeys(response.apiKeys);
    } catch (error) {
      toast.error('Failed to load API keys');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newKeyName.trim()) {
      toast.error('Please enter a name for the API key');
      return;
    }

    try {
      setIsCreating(true);
      const response = await authApi.createApiKey(newKeyName);
      setNewlyCreatedKey(response.apiKey);
      toast.success('API key created successfully');
      loadApiKeys();
      setNewKeyName('');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create API key');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (keyId: string) => {
    if (!confirm('Are you sure you want to delete this API key?')) return;

    try {
      await authApi.deleteApiKey(keyId);
      toast.success('API key deleted successfully');
      loadApiKeys();
    } catch (error) {
      toast.error('Failed to delete API key');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">API Keys</h1>
            <p className="text-gray-600 mt-2">
              Manage API keys for programmatic access
            </p>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create API Key
          </Button>
        </div>

        {apiKeys.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Key className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">No API keys yet</p>
              <Button onClick={() => setShowCreateModal(true)}>
                Create your first API key
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {apiKeys.map((apiKey) => (
              <Card key={apiKey.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <code className="bg-gray-100 px-3 py-1 rounded font-mono text-xs">
                          {apiKey.key.substring(0, 20)}...
                        </code>
                        <button
                          onClick={() => copyToClipboard(apiKey.key)}
                          className="text-primary-600 hover:text-primary-700 flex items-center"
                        >
                          <Copy className="w-4 h-4 mr-1" />
                          Copy
                        </button>
                      </div>
                      <div className="mt-2 text-xs text-gray-500">
                        Created: {formatDateTime(apiKey.createdAt)}
                        {apiKey.lastUsedAt && (
                          <> • Last used: {formatDateTime(apiKey.lastUsedAt)}</>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDelete(apiKey.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Create API Key Modal */}
        <Modal
          isOpen={showCreateModal}
          onClose={() => {
            setShowCreateModal(false);
            setNewlyCreatedKey(null);
            setNewKeyName('');
          }}
          title="Create API Key"
        >
          {newlyCreatedKey ? (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-800 mb-2 font-semibold">
                  API Key Created Successfully!
                </p>
                <p className="text-xs text-green-700 mb-3">
                  Make sure to copy your API key now. You won't be able to see it again!
                </p>
                <div className="bg-white border border-green-300 rounded p-3">
                  <code className="text-xs break-all font-mono text-gray-800">
                    {newlyCreatedKey}
                  </code>
                </div>
              </div>
              <Button
                variant="primary"
                className="w-full"
                onClick={() => copyToClipboard(newlyCreatedKey)}
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy to Clipboard
              </Button>
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => {
                  setShowCreateModal(false);
                  setNewlyCreatedKey(null);
                  setNewKeyName('');
                }}
              >
                Close
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <Input
                label="API Key Name"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="My API Key"
              />
              <div className="flex space-x-3 justify-end">
                <Button
                  variant="secondary"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  isLoading={isCreating}
                  onClick={handleCreate}
                >
                  Create
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </ProtectedLayout>
  );
}