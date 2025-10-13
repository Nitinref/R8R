'use client';

import { useAuth } from '@/app/context/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { workflowsApi } from '@/app/lib/api/workflow';
import { Workflow, WorkflowNode, StepType, LLMProvider, RetrieverType } from '@/app/lib/types/workflow.types';
import toast from 'react-hot-toast';
import { ArrowLeft, Plus, Trash2, Play, Settings, Zap, Search, MessageSquare, Filter, Cpu } from 'lucide-react';

export default function EditWorkflowPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const workflowId = params.id as string;

  const [mounted, setMounted] = useState(false);
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [loading, setLoading] = useState(true);
  
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

  useEffect(() => {
    if (mounted && isAuthenticated && workflowId) {
      loadWorkflow();
    }
  }, [mounted, isAuthenticated, workflowId]);

  const loadWorkflow = async () => {
    try {
      setLoading(true);
      const response = await workflowsApi.get(workflowId);
      const workflowData = response.workflow || response;
      setWorkflow(workflowData);
      setName(workflowData.name);
      setDescription(workflowData.description || '');
      
      // Handle different response structures
      const configuration = workflowData.configuration || workflowData;
          // @ts-ignore
      const steps = configuration.steps || configuration.nodes || [];
      
      if (steps.length === 0) {
        // Add default answer generation step if empty
        const defaultSteps = [{
          id: 'answer-1',
          type: StepType.ANSWER_GENERATION,
          name: 'Generate Answer',
          position: { x: 300, y: 200 },
          config: getDefaultConfig(StepType.ANSWER_GENERATION),
          status: 'active',
        }];
        setNodes(defaultSteps);
      } else {
        // Ensure all nodes have required fields
        const formattedNodes = steps.map((step: any) => ({
          id: step.id || `node-${Date.now()}-${Math.random()}`,
          type: step.type,
          name: step.name || step.data?.label || getNodeLabel(step.type),
          position: step.position || { x: 100, y: 100 },
          config: step.config || step.data?.config || getDefaultConfig(step.type),
          status: step.status || 'active',
        }));
        setNodes(formattedNodes);
      }
    } catch (error: any) {
      console.error('Load workflow error:', error);
      toast.error('Failed to load workflow');
      router.push('/workflows');
    } finally {
      setLoading(false);
    }
  };

  const addNode = (type: StepType) => {
    const newNode: WorkflowNode = {
      id: `node-${Date.now()}`,
      type,
      // @ts-ignore
      name: getNodeLabel(type),
      position: { 
        x: 100 + (nodes.length % 3) * 200, 
        y: 100 + Math.floor(nodes.length / 3) * 120 
      },
      config: getDefaultConfig(type),
      status: 'active',
    };
    setNodes([...nodes, newNode]);
    setSelectedNodeId(newNode.id);
    toast.success(`${getNodeLabel(type)} step added`);
  };

  const deleteNode = (id: string) => {
    if (nodes.length <= 1) {
      toast.error('Workflow must have at least one step');
      return;
    }
    
    // Don't allow deletion if it's the only answer generation step
    const nodeToDelete = nodes.find(n => n.id === id);
    if (nodeToDelete?.type === StepType.ANSWER_GENERATION) {
      const answerSteps = nodes.filter(n => n.type === StepType.ANSWER_GENERATION);
      if (answerSteps.length <= 1) {
        toast.error('Workflow must have at least one answer generation step');
        return;
      }
    }
    
    setNodes(nodes.filter(n => n.id !== id));
    if (selectedNodeId === id) {
      setSelectedNodeId(nodes.length > 1 ? nodes[0].id : null);
    }
    toast.success('Step deleted');
  };

  const handleDragStart = (nodeId: string, e: React.MouseEvent) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    setDraggingNodeId(nodeId);
    setDragOffset({
      x: e.clientX - node.position.x,
      y: e.clientY - node.position.y,
    });
  };

  const handleDrag = (e: React.MouseEvent) => {
    if (!draggingNodeId || !e.buttons) return; // Check if mouse button is still pressed
    
    const canvas = document.getElementById('workflow-canvas');
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(20, Math.min(rect.width - 180, e.clientX - rect.left - dragOffset.x));
    const y = Math.max(20, Math.min(rect.height - 80, e.clientY - rect.top - dragOffset.y));
    
    setNodes(nodes.map(n =>
      n.id === draggingNodeId ? { ...n, position: { x, y } } : n
    ));
  };

  const handleDragEnd = () => {
    setDraggingNodeId(null);
  };

  const updateNodeConfig = (nodeId: string, config: any) => {
    setNodes(nodes.map(n =>
      n.id === nodeId ? { ...n, config: { ...n.config, ...config } } : n
    ));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Please enter a workflow name');
      return;
    }

    // Validate that we have an answer generation step
    const hasAnswerStep = nodes.some(node => node.type === StepType.ANSWER_GENERATION);
    if (!hasAnswerStep) {
      toast.error('Workflow must include an answer generation step');
      return;
    }

    try {
      setSaving(true);
      
      const configuration = {
        id: workflowId,
        name,
        description,
        steps: nodes,
        cacheEnabled: true,
        cacheTTL: 3600,
      };

      await workflowsApi.update(workflowId, {
        name,
        description,
        configuration,
        status: workflow?.status || 'active',
      });

      toast.success('Workflow updated successfully!');
      router.push(`/workflows/${workflowId}`);
    } catch (error: any) {
      console.error('Save error:', error);
      toast.error(error.message || error.response?.data?.error || 'Failed to update workflow');
    } finally {
      setSaving(false);
    }
  };

  if (!mounted || isLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-red-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!isAuthenticated || !workflow) return null;

  const selectedNode = nodes.find(n => n.id === selectedNodeId);
  const hasAnswerStep = nodes.some(node => node.type === StepType.ANSWER_GENERATION);

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
            <div className="flex items-center gap-4">
              <Link
                href={`/workflows/${workflowId}`}
                className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="bg-gradient-to-r from-red-500 to-red-600 bg-clip-text text-2xl font-bold text-transparent">
                  Edit Workflow
                </h1>
                <p className="text-gray-400">Modify your workflow configuration</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => router.push(`/workflows/${workflowId}`)}
                className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors border border-white/10"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 disabled:opacity-50 transition-all flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Sidebar - Step Palette */}
          <div className="lg:col-span-1">
            <div className="bg-black/40 backdrop-blur-sm rounded-lg border border-white/10 p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5 text-red-400" />
                Add Steps
              </h3>
              <div className="space-y-3">
                <button
                  onClick={() => addNode(StepType.QUERY_REWRITE)}
                  className="w-full px-4 py-3 bg-blue-500/20 border border-blue-500/30 text-blue-300 rounded-lg hover:bg-blue-500/30 transition-all text-left flex items-center gap-3"
                >
                  <MessageSquare className="w-5 h-5" />
                  <div>
                    <div className="font-medium">Query Rewrite</div>
                    <div className="text-sm opacity-75">Improve search queries</div>
                  </div>
                </button>
                
                <button
                  onClick={() => addNode(StepType.RETRIEVAL)}
                  className="w-full px-4 py-3 bg-green-500/20 border border-green-500/30 text-green-300 rounded-lg hover:bg-green-500/30 transition-all text-left flex items-center gap-3"
                >
                  <Search className="w-5 h-5" />
                  <div>
                    <div className="font-medium">Retrieval</div>
                    <div className="text-sm opacity-75">Search documents</div>
                  </div>
                </button>
                
                <button
                  onClick={() => addNode(StepType.RERANK)}
                  className="w-full px-4 py-3 bg-purple-500/20 border border-purple-500/30 text-purple-300 rounded-lg hover:bg-purple-500/30 transition-all text-left flex items-center gap-3"
                >
                  <Filter className="w-5 h-5" />
                  <div>
                    <div className="font-medium">Rerank</div>
                    <div className="text-sm opacity-75">Sort results by relevance</div>
                  </div>
                </button>
                
                <button
                  onClick={() => addNode(StepType.ANSWER_GENERATION)}
                  className="w-full px-4 py-3 bg-red-500/20 border border-red-500/30 text-red-300 rounded-lg hover:bg-red-500/30 transition-all text-left flex items-center gap-3"
                >
                  <Cpu className="w-5 h-5" />
                  <div>
                    <div className="font-medium">Answer Generation</div>
                    <div className="text-sm opacity-75">Generate final answer</div>
                  </div>
                </button>
              </div>

              {/* Workflow Info */}
              <div className="mt-6 pt-6 border-t border-white/10">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-red-400" />
                  Workflow Info
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Name
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-white placeholder-gray-400"
                      placeholder="Workflow name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Description
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none text-white placeholder-gray-400"
                      placeholder="Workflow description"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Center - Canvas */}
          <div className="lg:col-span-2">
            <div className="bg-black/40 backdrop-blur-sm rounded-lg border border-white/10 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Zap className="w-5 h-5 text-red-400" />
                  Workflow Canvas
                </h3>
                <div className="text-sm text-gray-400">
                  {nodes.length} step{nodes.length !== 1 ? 's' : ''}
                </div>
              </div>

              <div
                id="workflow-canvas"
                className="relative bg-black/20 border-2 border-dashed border-white/10 rounded-lg min-h-[500px] transition-all"
                onMouseMove={handleDrag}
                onMouseUp={handleDragEnd}
                onMouseLeave={handleDragEnd}
              >
                {nodes.length === 0 ? (
                  <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                    <div className="text-center">
                      <div className="text-6xl mb-4">🎯</div>
                      <p className="text-lg font-medium">Add your first step</p>
                      <p className="text-sm">Click on steps from the left to add them</p>
                    </div>
                  </div>
                ) : (
                  nodes.map((node) => {
                    const nodeStyle = getNodeStyle(node.type);
                    return (
                      <div
                        key={node.id}
                        className={`absolute cursor-move p-4 rounded-lg border-2 min-w-[200px] transition-all ${
                          selectedNodeId === node.id
                            ? 'border-red-500 bg-red-500/20 shadow-lg shadow-red-500/20'
                            : `${nodeStyle.background} ${nodeStyle.border} shadow-sm hover:shadow-md`
                        } ${
                          draggingNodeId === node.id ? 'shadow-xl z-10 scale-105' : ''
                        }`}
                        style={{
                          left: node.position.x,
                          top: node.position.y,
                        }}
                        onMouseDown={(e) => handleDragStart(node.id, e)}
                        onClick={() => setSelectedNodeId(node.id)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-white flex items-center gap-2">
                            {nodeStyle.icon}
                              {/* @ts-ignore */}
                            {node.name}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNode(node.id);
                            }}
                            className="text-red-400 hover:text-red-300 transition-colors p-1 hover:bg-red-500/20 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        
                        <div className="text-sm text-gray-300 space-y-1">
                          {node.config?.llm && (
                            <div className="flex items-center gap-1">
                              <Cpu className="w-3 h-3" />
                              {node.config.llm.provider}: {node.config.llm.model}
                            </div>
                          )}
                          {node.config?.retriever && (
                            <div className="flex items-center gap-1">
                              <Search className="w-3 h-3" />
                              {node.config.retriever.type}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Validation Message */}
              {!hasAnswerStep && (
                <div className="mt-4 bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-4">
                  <p className="text-sm text-yellow-400 flex items-center gap-2">
                    <span className="text-lg">⚠️</span>
                    <span><strong>Missing required step:</strong> Add an "Answer Generation" step to make this workflow functional.</span>
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar - Step Configuration */}
          <div className="lg:col-span-1">
            <div className="bg-black/40 backdrop-blur-sm rounded-lg border border-white/10 p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5 text-red-400" />
              {/* @ts-ignore */}
                {selectedNode ? `Configure ${selectedNode.name}` : 'Select a Step'}
              </h3>
              
              {selectedNode ? (
                <div className="space-y-4">
                  {/* LLM Configuration */}
                  {selectedNode.config?.llm && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        LLM Provider
                      </label>
                      <select
                        value={selectedNode.config.llm.provider || LLMProvider.OPENAI}
                        onChange={(e) => updateNodeConfig(selectedNode.id, {
                          llm: { ...selectedNode.config.llm, provider: e.target.value as LLMProvider }
                        })}
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-white"
                      >
                        <option value={LLMProvider.OPENAI}>OpenAI</option>
                        <option value={LLMProvider.ANTHROPIC}>Anthropic</option>
                        <option value={LLMProvider.GOOGLE}>Google</option>
                      </select>
                    </div>
                  )}

                  {/* Model Configuration */}
                  {selectedNode.config?.llm && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Model
                      </label>
                      <input
                        type="text"
                        value={selectedNode.config.llm.model || 'gpt-3.5-turbo'}
                        onChange={(e) => updateNodeConfig(selectedNode.id, {
                          llm: { ...selectedNode.config.llm, model: e.target.value }
                        })}
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-white placeholder-gray-400"
                        placeholder="Model name"
                      />
                    </div>
                  )}

                  {/* Temperature Configuration */}
                  {selectedNode.config?.llm && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Temperature: {selectedNode.config.llm.temperature || 0.7}
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="2"
                        step="0.1"
                        value={selectedNode.config.llm.temperature || 0.7}
                        onChange={(e) => updateNodeConfig(selectedNode.id, {
                          llm: { ...selectedNode.config.llm, temperature: parseFloat(e.target.value) }
                        })}
                        className="w-full accent-red-500"
                      />
                    </div>
                  )}

                  {/* Retriever Configuration */}
                  {selectedNode.config?.retriever && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Retriever Type
                      </label>
                      <select
                        value={selectedNode.config.retriever.type || RetrieverType.PINECONE}
                        onChange={(e) => updateNodeConfig(selectedNode.id, {
                          retriever: { ...selectedNode.config.retriever, type: e.target.value as RetrieverType }
                        })}
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-white"
                      >
                        <option value={RetrieverType.PINECONE}>Pinecone</option>
                        <option value={RetrieverType.KEYWORD}>Keyword</option>
                        <option value={RetrieverType.HYBRID}>Hybrid</option>
                      </select>
                    </div>
                  )}

                  <div className="pt-4 border-t border-white/10">
                    <button
                      onClick={() => deleteNode(selectedNode.id)}
                      className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete Step
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-400 py-8">
                  <Settings className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Select a step to configure it</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper functions
function getDefaultConfig(type: StepType) {
  const baseConfigs = {
    [StepType.QUERY_REWRITE]: {
      llm: {
        provider: LLMProvider.OPENAI,
        model: 'gpt-3.5-turbo',
        temperature: 0.7,
        maxTokens: 200,
      },
    },
    [StepType.RETRIEVAL]: {
      retriever: {
        type: RetrieverType.PINECONE,
        config: { indexName: 'default', topK: 10 },
      },
    },
    [StepType.RERANK]: {
      llm: {
        provider: LLMProvider.OPENAI,
        model: 'gpt-3.5-turbo',
        temperature: 0.3,
        maxTokens: 100,
      },
    },
    [StepType.ANSWER_GENERATION]: {
      llm: {
        provider: LLMProvider.OPENAI,
        model: 'gpt-3.5-turbo',
        temperature: 0.7,
        maxTokens: 1000,
      },
    },
  };
// @ts-ignore
  return baseConfigs[type] || {};
}

function getNodeLabel(type: StepType): string {
  const labels = {
    [StepType.QUERY_REWRITE]: 'Query Rewrite',
    [StepType.RETRIEVAL]: 'Retrieval',
    [StepType.RERANK]: 'Rerank',
    [StepType.ANSWER_GENERATION]: 'Answer Generation',
    [StepType.POST_PROCESS]: 'Post Process',
  };
  return labels[type] || 'Unknown Step';
}

function getNodeStyle(type: StepType) {
  const styles = {
    [StepType.QUERY_REWRITE]: {
      background: 'bg-blue-500/20',
      border: 'border-blue-500/50',
      icon: <MessageSquare className="w-4 h-4 text-blue-400" />
    },
    [StepType.RETRIEVAL]: {
      background: 'bg-green-500/20',
      border: 'border-green-500/50',
      icon: <Search className="w-4 h-4 text-green-400" />
    },
    [StepType.RERANK]: {
      background: 'bg-purple-500/20',
      border: 'border-purple-500/50',
      icon: <Filter className="w-4 h-4 text-purple-400" />
    },
    [StepType.ANSWER_GENERATION]: {
      background: 'bg-red-500/20',
      border: 'border-red-500/50',
      icon: <Cpu className="w-4 h-4 text-red-400" />
    },
    [StepType.POST_PROCESS]: {
      background: 'bg-yellow-500/20',
      border: 'border-yellow-500/50',
      icon: <Settings className="w-4 h-4 text-yellow-400" />
    },
  };

  return styles[type] || {
    background: 'bg-gray-500/20',
    border: 'border-gray-500/50',
    icon: <Settings className="w-4 h-4 text-gray-400" />
  };
}