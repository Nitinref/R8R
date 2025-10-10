'use client';

import { useAuth } from '@/app/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { workflowsApi } from '@/app/lib/api/workflow';
import { WorkflowNode, StepType, LLMProvider, RetrieverType } from '@/app/lib/types/workflow.types';
import toast from 'react-hot-toast';

export default function NewWorkflowPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [nodes, setNodes] = useState<WorkflowNode[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Drag state
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router, mounted]);

  // Add node to canvas
  const addNode = (type: StepType) => {
    const newNode: WorkflowNode = {
      id: `node-${Date.now()}`,
      type,
      position: { x: 100 + nodes.length * 50, y: 100 + nodes.length * 50 },
      config: getDefaultConfig(type),
    };
    setNodes([...nodes, newNode]);
    setSelectedNodeId(newNode.id);
    toast.success('Node added');
  };

  // Delete node
  const deleteNode = (id: string) => {
    setNodes(nodes.filter(n => n.id !== id));
    if (selectedNodeId === id) {
      setSelectedNodeId(null);
    }
    toast.success('Node deleted');
  };

  // Handle drag start
  const handleDragStart = (nodeId: string, e: React.MouseEvent) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    setDraggingNodeId(nodeId);
    setDragOffset({
      x: e.clientX - node.position.x,
      y: e.clientY - node.position.y,
    });
  };

  // Handle drag
  const handleDrag = (e: React.MouseEvent) => {
    if (!draggingNodeId) return;

    const canvas = document.getElementById('workflow-canvas');
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, e.clientX - rect.left - dragOffset.x);
    const y = Math.max(0, e.clientY - rect.top - dragOffset.y);

    setNodes(nodes.map(n =>
      n.id === draggingNodeId ? { ...n, position: { x, y } } : n
    ));
  };

  // Handle drag end
  const handleDragEnd = () => {
    setDraggingNodeId(null);
  };

  // Update node config
  const updateNodeConfig = (nodeId: string, config: any) => {
    setNodes(nodes.map(n =>
      n.id === nodeId ? { ...n, config: { ...n.config, ...config } } : n
    ));
  };

  // Save workflow
  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Please enter a workflow name');
      return;
    }

    if (nodes.length === 0) {
      toast.error('Please add at least one node');
      return;
    }

    try {
      setSaving(true);
      const configuration = {
        id: '',
        name,
        description,
        steps: nodes,
        cacheEnabled: true,
        cacheTTL: 3600,
      };

      await workflowsApi.create({
        name,
        description,
        configuration,
      });

      toast.success('Workflow created successfully!');
      router.push('/workflows');
    } catch (error: any) {
      console.error('Save error:', error);
      toast.error(error.response?.data?.error || 'Failed to save workflow');
    } finally {
      setSaving(false);
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

  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex-1 max-w-xl">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Workflow Name *"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 font-semibold"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => router.back()}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Workflow'}
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Node Palette */}
        <div className="w-64 bg-white border-r border-gray-200 p-4 overflow-y-auto">
          <h3 className="font-semibold text-gray-900 mb-4">Add Nodes</h3>
          <div className="space-y-2">
            {Object.values(StepType).map((type) => (
              <button
                key={type}
                onClick={() => addNode(type)}
                className="w-full p-3 text-left bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 rounded-lg border-2 border-blue-200 transition-all"
              >
                <div className="font-semibold text-sm text-blue-900">
                  {type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </div>
                <div className="text-xs text-blue-700 mt-1">
                  {getNodeDescription(type)}
                </div>
              </button>
            ))}
          </div>

          <div className="mt-6 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-xs text-yellow-800">
              💡 <strong>Tip:</strong> Click to add nodes, drag to move them, click a node to configure it
            </p>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 relative overflow-hidden">
          <div
            id="workflow-canvas"
            className="absolute inset-0 bg-gray-50"
            style={{
              backgroundImage: `
                linear-gradient(to right, #e5e7eb 1px, transparent 1px),
                linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)
              `,
              backgroundSize: '20px 20px',
            }}
            onMouseMove={draggingNodeId ? handleDrag : undefined}
            onMouseUp={handleDragEnd}
          >
            {nodes.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <div className="text-6xl mb-4">🎯</div>
                  <p className="text-lg font-semibold">Start building your workflow</p>
                  <p className="text-sm mt-2">Add nodes from the left panel</p>
                </div>
              </div>
            )}

            {/* Nodes */}
            {nodes.map((node) => (
              <div
                key={node.id}
                style={{
                  position: 'absolute',
                  left: node.position.x,
                  top: node.position.y,
                  cursor: draggingNodeId === node.id ? 'grabbing' : 'grab',
                }}
                className={`w-48 rounded-lg border-2 p-4 shadow-lg transition-all ${
                  selectedNodeId === node.id
                    ? 'ring-2 ring-primary-500 ring-offset-2'
                    : ''
                } ${getNodeColor(node.type)}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleDragStart(node.id, e);
                  setSelectedNodeId(node.id);
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-lg">{getNodeIcon(node.type)}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNode(node.id);
                    }}
                    className="text-red-500 hover:text-red-700"
                  >
                    🗑️
                  </button>
                </div>
                <h4 className="text-sm font-semibold">
                  {node.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </h4>
                {node.config.llm && (
                  <p className="text-xs mt-1 opacity-75">
                    {node.config.llm.provider}: {node.config.llm.model}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Config Panel */}
        <div className="w-80 bg-white border-l border-gray-200 p-4 overflow-y-auto">
          {selectedNode ? (
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Configure Node</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Node Type
                  </label>
                  <div className="px-3 py-2 bg-gray-100 rounded text-sm font-semibold">
                    {selectedNode.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </div>
                </div>

                {requiresLLM(selectedNode.type) && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        LLM Provider
                      </label>
                      <select
                        value={selectedNode.config.llm?.provider || ''}
                        onChange={(e) =>
                          updateNodeConfig(selectedNode.id, {
                            llm: {
                              ...selectedNode.config.llm,
                              provider: e.target.value as LLMProvider,
                              model: selectedNode.config.llm?.model || 'gpt-3.5-turbo',
                            },
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="">Select Provider</option>
                        {Object.values(LLMProvider).map((provider) => (
                          <option key={provider} value={provider}>
                            {provider.toUpperCase()}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Model
                      </label>
                      <input
                        type="text"
                        value={selectedNode.config.llm?.model || ''}
                        onChange={(e) =>
                          updateNodeConfig(selectedNode.id, {
                            llm: {
                              ...selectedNode.config.llm!,
                              model: e.target.value,
                            },
                          })
                        }
                        placeholder="gpt-3.5-turbo"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Temperature: {selectedNode.config.llm?.temperature || 0.7}
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="2"
                        step="0.1"
                        value={selectedNode.config.llm?.temperature || 0.7}
                        onChange={(e) =>
                          updateNodeConfig(selectedNode.id, {
                            llm: {
                              ...selectedNode.config.llm!,
                              temperature: parseFloat(e.target.value),
                            },
                          })
                        }
                        className="w-full"
                      />
                    </div>
                  </>
                )}

                {selectedNode.type === StepType.RETRIEVAL && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Retriever Type
                      </label>
                      <select
                        value={selectedNode.config.retriever?.type || ''}
                        onChange={(e) =>
                          updateNodeConfig(selectedNode.id, {
                            retriever: {
                              type: e.target.value as RetrieverType,
                              config: { indexName: 'default', topK: 5 },
                            },
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="">Select Retriever</option>
                        {Object.values(RetrieverType).map((type) => (
                          <option key={type} value={type}>
                            {type.toUpperCase()}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Top K Results
                      </label>
                      <input
                        type="number"
                        value={selectedNode.config.retriever?.config.topK || 5}
                        onChange={(e) =>
                          updateNodeConfig(selectedNode.id, {
                            retriever: {
                              ...selectedNode.config.retriever!,
                              config: {
                                ...selectedNode.config.retriever?.config,
                                topK: parseInt(e.target.value),
                              },
                            },
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500 py-12">
              <div className="text-4xl mb-4">👈</div>
              <p>Select a node to configure</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper functions
function getDefaultConfig(type: StepType) {
  if (requiresLLM(type)) {
    return {
      llm: {
        provider: LLMProvider.OPENAI,
        model: 'gpt-3.5-turbo',
        temperature: 0.7,
        maxTokens: 1000,
      },
    };
  }
  if (type === StepType.RETRIEVAL) {
    return {
      retriever: {
        type: RetrieverType.PINECONE,
        config: { indexName: 'default', topK: 5 },
      },
    };
  }
  return {};
}

function requiresLLM(type: StepType) {
  return [StepType.QUERY_REWRITE, StepType.RERANK, StepType.ANSWER_GENERATION].includes(type);
}

function getNodeColor(type: StepType) {
  const colors = {
    [StepType.QUERY_REWRITE]: 'bg-blue-100 border-blue-300 text-blue-900',
    [StepType.RETRIEVAL]: 'bg-green-100 border-green-300 text-green-900',
    [StepType.RERANK]: 'bg-yellow-100 border-yellow-300 text-yellow-900',
    [StepType.ANSWER_GENERATION]: 'bg-purple-100 border-purple-300 text-purple-900',
    [StepType.POST_PROCESS]: 'bg-gray-100 border-gray-300 text-gray-900',
  };
  return colors[type];
}

function getNodeIcon(type: StepType) {
  const icons = {
    [StepType.QUERY_REWRITE]: '📝',
    [StepType.RETRIEVAL]: '🔍',
    [StepType.RERANK]: '📊',
    [StepType.ANSWER_GENERATION]: '💬',
    [StepType.POST_PROCESS]: '⚙️',
  };
  return icons[type];
}

function getNodeDescription(type: StepType) {
  const descriptions = {
    [StepType.QUERY_REWRITE]: 'Rewrite queries',
    [StepType.RETRIEVAL]: 'Retrieve documents',
    [StepType.RERANK]: 'Rerank results',
    [StepType.ANSWER_GENERATION]: 'Generate answer',
    [StepType.POST_PROCESS]: 'Post-process',
  };
  return descriptions[type];
}