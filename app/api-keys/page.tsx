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
import { Plus, Copy, Trash2, Key, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ApiKeysPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
  const [showFullKey, setShowFullKey] = useState<string | null>(null);

  useEffect(() => {
    console.log('🔍 ApiKeysPage mounted - loading API keys');
    loadApiKeys();
  }, []);

  const loadApiKeys = async () => {
    try {
      console.log('🔄 Loading API keys...');
      setIsLoading(true);
      const response = await authApi.listApiKeys();
      console.log('📋 API keys loaded:', response);
      setApiKeys(response.apiKeys);
    } catch (error: any) {
      console.error('❌ Failed to load API keys:', error);
      toast.error(error.response?.data?.error || 'Failed to load API keys');
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
      console.log('🚀 Creating API key:', newKeyName);
      setIsCreating(true);
      const response = await authApi.createApiKey(newKeyName);
      console.log('✅ API key created:', response);
      setNewlyCreatedKey(response.apiKey);
      toast.success('API key created successfully!');
      loadApiKeys(); // Refresh the list
      setNewKeyName('');
    } catch (error: any) {
      console.error('❌ Failed to create API key:', error);
      toast.error(error.response?.data?.error || 'Failed to create API key');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (keyId: string) => {
    if (!confirm('Are you sure you want to delete this API key? This action cannot be undone.')) return;

    try {
      await authApi.deleteApiKey(keyId);
      toast.success('API key deleted successfully');
      loadApiKeys();
    } catch (error: any) {
      console.error('❌ Failed to delete API key:', error);
      toast.error(error.response?.data?.error || 'Failed to delete API key');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const toggleKeyVisibility = (keyId: string) => {
    setShowFullKey(showFullKey === keyId ? null : keyId);
  };

  const maskApiKey = (key: string) => {
    if (key.length <= 8) return key;
    return `${key.substring(0, 8)}${'*'.repeat(key.length - 8)}`;
  };

  if (isLoading) {
    return (
      <ProtectedLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Spinner size="lg" />
            <p className="mt-4 text-gray-600">Loading API keys...</p>
          </div>
        </div>
      </ProtectedLayout>
    );
  }

  return (
    <ProtectedLayout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">API Keys</h1>
            <p className="text-gray-600 mt-2">
              Manage API keys for programmatic access to your workflows
            </p>
          </div>
          <Button 
            onClick={() => setShowCreateModal(true)}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create API Key
          </Button>
        </div>

        {/* API Keys List */}
        {apiKeys.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Key className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No API keys yet</h3>
              <p className="text-gray-500 mb-6">
                Create your first API key to start integrating with your applications
              </p>
              <Button 
                onClick={() => setShowCreateModal(true)}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create your first API key
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {apiKeys.map((apiKey) => (
              <Card key={apiKey.id} className="border border-gray-200">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h4 className="font-semibold text-gray-900">{apiKey.name}</h4>
                        <Badge 
                          // @ts-ignore
                          variant={apiKey.isActive ? "success" : "secondary"}
                          className="text-xs"
                        >
                          {apiKey.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      
                      {/* API Key Value */}
                      <div className="flex items-center gap-3 mb-3">
                        <code className="bg-gray-100 px-3 py-2 rounded font-mono text-sm border">
                          {showFullKey === apiKey.id ? apiKey.key : maskApiKey(apiKey.key)}
                        </code>
                        <div className="flex gap-2">
                          <button
                            onClick={() => toggleKeyVisibility(apiKey.id)}
                            className="text-gray-500 hover:text-gray-700 p-1"
                            title={showFullKey === apiKey.id ? 'Hide key' : 'Show key'}
                          >
                            {showFullKey === apiKey.id ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => copyToClipboard(apiKey.key)}
                            className="text-blue-600 hover:text-blue-700 p-1"
                            title="Copy to clipboard"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Metadata */}
                      <div className="text-sm text-gray-600 space-y-1">
                        <div className="flex items-center gap-4">
                          <span>Created: {formatDateTime(apiKey.createdAt)}</span>
                          {apiKey.lastUsedAt && (
                            <span>• Last used: {formatDateTime(apiKey.lastUsedAt)}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-4">
                          {/* @ts-ignore*/}
                          <span>Read: {apiKey.canRead ? '✓' : '✗'}</span>
                            {/* @ts-ignore*/}
                          <span>Write: {apiKey.canWrite ? '✓' : '✗'}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Delete Button */}
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDelete(apiKey.id)}
                      title="Delete API key"
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
          title={newlyCreatedKey ? "API Key Created" : "Create API Key"}
          size="lg"
        >
          {newlyCreatedKey ? (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-800 mb-2 font-semibold">
                  🎉 API Key Created Successfully!
                </p>
                <p className="text-xs text-green-700 mb-3">
                  Make sure to copy your API key now. You won't be able to see it again!
                </p>
                <div className="bg-white border border-green-300 rounded p-3">
                  <code className="text-sm break-all font-mono text-gray-800 bg-gray-50 p-2 rounded block">
                    {newlyCreatedKey}
                  </code>
                </div>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="primary"
                  className="flex-1"
                  onClick={() => copyToClipboard(newlyCreatedKey)}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy to Clipboard
                </Button>
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewlyCreatedKey(null);
                    setNewKeyName('');
                  }}
                >
                  Close
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  API Key Name *
                </label>
                <Input
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="e.g., Production, Development, Mobile App"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') handleCreate();
                  }}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Choose a descriptive name to identify this key
                </p>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <strong>Permissions:</strong> This key will have read access to execute workflows.
                  Write access can be configured separately.
                </p>
              </div>

              <div className="flex space-x-3 justify-end pt-4">
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
                  disabled={!newKeyName.trim()}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create API Key
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </ProtectedLayout>
  );
}