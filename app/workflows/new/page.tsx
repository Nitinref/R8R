'use client';

import { useAuth } from '@/app/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef, useCallback } from 'react';
import { workflowsApi } from '@/app/lib/api/workflow';
import { 
  WorkflowNode as WorkflowNodeType, 
  StepType, 
  LLMProvider, 
  RetrieverType, 
  WorkflowConfig, 
  WorkflowStep, 
} from '@/app/lib/types/workflow.types';
import toast from 'react-hot-toast';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  addEdge,
  type Node,
  type Edge,
  Handle,
  Position,
  ConnectionLineType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

// Enhanced Custom Node Component with Memory Support
const WorkflowNode = ({ data, id }: { data: any; id: string }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [config, setConfig] = useState(data.config || {});

  // Node styling based on type
  const getNodeStyle = (type: StepType) => {
    const base = "rounded-lg shadow-lg p-4 min-w-[220px] border-2";
    
    switch (type) {
      case StepType.MEMORY_RETRIEVE:
        return `${base} border-blue-400/30 bg-gradient-to-br from-blue-600 to-blue-700`;
      case StepType.MEMORY_UPDATE:
        return `${base} border-blue-500/30 bg-gradient-to-br from-blue-700 to-blue-800`;
      case StepType.MEMORY_SUMMARIZE:
        return `${base} border-blue-300/30 bg-gradient-to-br from-blue-500 to-blue-600`;
      default:
        return `${base} border-blue-600/30 bg-gradient-to-br from-blue-800 to-blue-900`;
    }
  };

  const handleColor = (type: StepType) => {
    switch (type) {
      case StepType.MEMORY_RETRIEVE: return '!bg-blue-400';
      case StepType.MEMORY_UPDATE: return '!bg-blue-500';
      case StepType.MEMORY_SUMMARIZE: return '!bg-blue-300';
      default: return '!bg-blue-600';
    }
  };

  const nodeBase = getNodeStyle(data.type);
  const handleClass = handleColor(data.type);

  const handleConfigChange = (newConfig: any) => {
    const updatedConfig = { ...config, ...newConfig };
    setConfig(updatedConfig);
    if (data.onConfigChange) {
      data.onConfigChange(id, updatedConfig);
    }
  };

  // LLM Configuration
  const renderLLMConfig = () => (
    <div className="space-y-2">
      <div>
        <label className="block text-xs opacity-80 mb-1">Provider:</label>
        <select 
          value={config.llm?.provider || LLMProvider.OPENAI}
          onChange={(e) => handleConfigChange({
            llm: { ...config.llm, provider: e.target.value as LLMProvider }
          })}
          className="w-full rounded bg-white/10 px-2 py-1 text-white border border-white/20 text-xs"
        >
          {Object.values(LLMProvider).map(provider => (
            <option key={provider} value={provider}>
              {provider.charAt(0).toUpperCase() + provider.slice(1)}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs opacity-80 mb-1">Model:</label>
        <input
          type="text"
          value={config.llm?.model || ''}
          onChange={(e) => handleConfigChange({
            llm: { ...config.llm, model: e.target.value }
          })}
          placeholder="gpt-4"
          className="w-full rounded bg-white/10 px-2 py-1 text-white border border-white/20 placeholder-white/50 text-xs"
        />
      </div>
      <div>
        <label className="block text-xs opacity-80 mb-1">
          Temperature: {config.llm?.temperature || 0.7}
        </label>
        <input
          type="range"
          min="0"
          max="2"
          step="0.1"
          value={config.llm?.temperature || 0.7}
          onChange={(e) => handleConfigChange({
            llm: { ...config.llm, temperature: parseFloat(e.target.value) }
          })}
          className="w-full accent-blue-400"
        />
      </div>
      <div>
        <label className="block text-xs opacity-80 mb-1">Max Tokens:</label>
        <input
          type="number"
          value={config.llm?.maxTokens || 1000}
          onChange={(e) => handleConfigChange({
            llm: { ...config.llm, maxTokens: parseInt(e.target.value) }
          })}
          className="w-full rounded bg-white/10 px-2 py-1 text-white border border-white/20 text-xs"
        />
      </div>
    </div>
  );

  // Retriever Configuration
  const renderRetrieverConfig = () => (
    <div className="space-y-2">
      <div>
        <label className="block text-xs opacity-80 mb-1">Retriever Type:</label>
        <select
          value={config.retriever?.type || RetrieverType.PINECONE}
          onChange={(e) => handleConfigChange({
            retriever: { 
              ...config.retriever, 
              type: e.target.value as RetrieverType,
              config: config.retriever?.config || { indexName: 'default', topK: 10 }
            }
          })}
          className="w-full rounded bg-white/10 px-2 py-1 text-white border border-white/20 text-xs"
        >
          {Object.values(RetrieverType).map(type => (
            <option key={type} value={type}>
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs opacity-80 mb-1">Index Name:</label>
        <input
          type="text"
          value={config.retriever?.config?.indexName || ''}
          onChange={(e) => handleConfigChange({
            retriever: {
              ...config.retriever,
              config: { ...config.retriever?.config, indexName: e.target.value }
            }
          })}
          placeholder="my-index"
          className="w-full rounded bg-white/10 px-2 py-1 text-white border border-white/20 placeholder-white/50 text-xs"
        />
      </div>
      <div>
        <label className="block text-xs opacity-80 mb-1">Top K:</label>
        <input
          type="number"
          value={config.retriever?.config?.topK || 10}
          onChange={(e) => handleConfigChange({
            retriever: {
              ...config.retriever,
              config: { ...config.retriever?.config, topK: parseInt(e.target.value) }
            }
          })}
          className="w-full rounded bg-white/10 px-2 py-1 text-white border border-white/20 text-xs"
        />
      </div>
    </div>
  );

  // Memory Retrieve Configuration
  const renderMemoryRetrieveConfig = () => (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-2">
        <input
          type="checkbox"
          checked={config.memoryRetrieve?.enabled ?? true}
          onChange={(e) => handleConfigChange({
            memoryRetrieve: { ...config.memoryRetrieve, enabled: e.target.checked }
          })}
          className="rounded"
        />
        <label className="text-xs opacity-80">Enable Memory Retrieval</label>
      </div>
      
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs opacity-80 mb-1">Top K:</label>
          <input
            type="number"
            value={config.memoryRetrieve?.topK || 5}
            onChange={(e) => handleConfigChange({
              memoryRetrieve: { ...config.memoryRetrieve, topK: parseInt(e.target.value) }
            })}
            className="w-full rounded bg-white/10 px-2 py-1 text-white border border-white/20 text-xs"
          />
        </div>
        <div>
          <label className="block text-xs opacity-80 mb-1">Min Score:</label>
          <input
            type="number"
            step="0.1"
            min="0"
            max="1"
            value={config.memoryRetrieve?.minScore || 0.7}
            onChange={(e) => handleConfigChange({
              memoryRetrieve: { ...config.memoryRetrieve, minScore: parseFloat(e.target.value) }
            })}
            className="w-full rounded bg-white/10 px-2 py-1 text-white border border-white/20 text-xs"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={config.memoryRetrieve?.useReranking ?? false}
          onChange={(e) => handleConfigChange({
            memoryRetrieve: { ...config.memoryRetrieve, useReranking: e.target.checked }
          })}
          className="rounded"
        />
        <label className="text-xs opacity-80">Use Reranking</label>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={config.memoryRetrieve?.useHybridSearch ?? false}
          onChange={(e) => handleConfigChange({
            memoryRetrieve: { ...config.memoryRetrieve, useHybridSearch: e.target.checked }
          })}
          className="rounded"
        />
        <label className="text-xs opacity-80">Hybrid Search</label>
      </div>

      <div>
        <label className="block text-xs opacity-80 mb-1">Keyword Weight:</label>
        <input
          type="number"
          step="0.1"
          min="0"
          max="1"
          value={config.memoryRetrieve?.keywordWeight || 0.3}
          onChange={(e) => handleConfigChange({
            memoryRetrieve: { ...config.memoryRetrieve, keywordWeight: parseFloat(e.target.value) }
          })}
          className="w-full rounded bg-white/10 px-2 py-1 text-white border border-white/20 text-xs"
        />
      </div>
    </div>
  );

  // Memory Update Configuration
  const renderMemoryUpdateConfig = () => (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-2">
        <input
          type="checkbox"
          checked={config.memoryUpdate?.enabled ?? true}
          onChange={(e) => handleConfigChange({
            memoryUpdate: { ...config.memoryUpdate, enabled: e.target.checked }
          })}
          className="rounded"
        />
        <label className="text-xs opacity-80">Enable Memory Storage</label>
      </div>

      <div>
        <label className="block text-xs opacity-80 mb-1">Importance Strategy:</label>
        <select 
          value={config.memoryUpdate?.importance?.auto ? 'auto' : 'manual'}
          onChange={(e) => handleConfigChange({
            memoryUpdate: { 
              ...config.memoryUpdate, 
              importance: { auto: e.target.value === 'auto' }
            }
          })}
          className="w-full rounded bg-white/10 px-2 py-1 text-white border border-white/20 text-xs"
        >
          <option value="auto">Auto-calculate</option>
          <option value="manual">Manual score</option>
        </select>
      </div>

      {config.memoryUpdate?.importance?.auto === false && (
        <div>
          <label className="block text-xs opacity-80 mb-1">Base Importance:</label>
          <input
            type="number"
            step="0.1"
            min="0"
            max="1"
            value={config.memoryUpdate?.importance?.baseScore || 0.5}
            onChange={(e) => handleConfigChange({
              memoryUpdate: { 
                ...config.memoryUpdate, 
                importance: { ...config.memoryUpdate?.importance, baseScore: parseFloat(e.target.value) }
              }
            })}
            className="w-full rounded bg-white/10 px-2 py-1 text-white border border-white/20 text-xs"
          />
        </div>
      )}

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={config.memoryUpdate?.deduplication?.enabled ?? true}
          onChange={(e) => handleConfigChange({
            memoryUpdate: { 
              ...config.memoryUpdate, 
              deduplication: { ...config.memoryUpdate?.deduplication, enabled: e.target.checked }
            }
          })}
          className="rounded"
        />
        <label className="text-xs opacity-80">Deduplication</label>
      </div>

      {config.memoryUpdate?.deduplication?.enabled && (
        <div>
          <label className="block text-xs opacity-80 mb-1">Similarity Threshold:</label>
          <input
            type="number"
            step="0.1"
            min="0"
            max="1"
            value={config.memoryUpdate?.deduplication?.similarityThreshold || 0.8}
            onChange={(e) => handleConfigChange({
              memoryUpdate: { 
                ...config.memoryUpdate, 
                deduplication: { ...config.memoryUpdate?.deduplication, similarityThreshold: parseFloat(e.target.value) }
              }
            })}
            className="w-full rounded bg-white/10 px-2 py-1 text-white border border-white/20 text-xs"
          />
        </div>
      )}

      <div>
        <label className="block text-xs opacity-80 mb-1">Max Memories:</label>
        <input
          type="number"
          value={config.memoryUpdate?.retention?.maxMemories || 1000}
          onChange={(e) => handleConfigChange({
            memoryUpdate: { 
              ...config.memoryUpdate, 
              retention: { ...config.memoryUpdate?.retention, maxMemories: parseInt(e.target.value) }
            }
          })}
          className="w-full rounded bg-white/10 px-2 py-1 text-white border border-white/20 text-xs"
        />
      </div>
    </div>
  );

  // Memory Summarize Configuration
  const renderMemorySummarizeConfig = () => (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-2">
        <input
          type="checkbox"
          checked={config.memorySummarize?.enabled ?? true}
          onChange={(e) => handleConfigChange({
            memorySummarize: { ...config.memorySummarize, enabled: e.target.checked }
          })}
          className="rounded"
        />
        <label className="text-xs opacity-80">Enable Memory Summarization</label>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs opacity-80 mb-1">Min Memories:</label>
          <input
            type="number"
            value={config.memorySummarize?.triggers?.minMemories || 3}
            onChange={(e) => handleConfigChange({
              memorySummarize: { 
                ...config.memorySummarize, 
                triggers: { ...config.memorySummarize?.triggers, minMemories: parseInt(e.target.value) }
              }
            })}
            className="w-full rounded bg-white/10 px-2 py-1 text-white border border-white/20 text-xs"
          />
        </div>
        <div>
          <label className="block text-xs opacity-80 mb-1">Max Similarity:</label>
          <input
            type="number"
            step="0.1"
            min="0"
            max="1"
            value={config.memorySummarize?.triggers?.maxSimilarity || 0.8}
            onChange={(e) => handleConfigChange({
              memorySummarize: { 
                ...config.memorySummarize, 
                triggers: { ...config.memorySummarize?.triggers, maxSimilarity: parseFloat(e.target.value) }
              }
            })}
            className="w-full rounded bg-white/10 px-2 py-1 text-white border border-white/20 text-xs"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={config.memorySummarize?.strategy?.preserveDetails ?? false}
          onChange={(e) => handleConfigChange({
            memorySummarize: { 
              ...config.memorySummarize, 
              strategy: { preserveDetails: e.target.checked }
            }
          })}
          className="rounded"
        />
        <label className="text-xs opacity-80">Preserve Details</label>
      </div>
    </div>
  );

  const renderConfigForm = () => {
    switch (data.type) {
      case StepType.QUERY_REWRITE:
      case StepType.RERANK:
      case StepType.ANSWER_GENERATION:
        return renderLLMConfig();
      case StepType.RETRIEVAL:
        return renderRetrieverConfig();
      case StepType.POST_PROCESS:
        return (
          <div className="space-y-2">
            <div>
              <label className="block text-xs opacity-80 mb-1">Custom Prompt:</label>
              <textarea
                value={config.prompt || ''}
                onChange={(e) => handleConfigChange({ prompt: e.target.value })}
                placeholder="Enter custom processing instructions..."
                className="w-full rounded bg-white/10 px-2 py-1 text-white border border-white/20 placeholder-white/50 text-xs h-20"
              />
            </div>
          </div>
        );
      case StepType.MEMORY_RETRIEVE:
        return renderMemoryRetrieveConfig();
      case StepType.MEMORY_UPDATE:
        return renderMemoryUpdateConfig();
      case StepType.MEMORY_SUMMARIZE:
        return renderMemorySummarizeConfig();
      default:
        return null;
    }
  };

  const renderConfigPreview = () => {
    const items = [];
    
    if (config.llm) {
      items.push(
        <div key="llm" className="flex items-center gap-1">
          <span>🤖</span>
          <span>{config.llm.provider}: {config.llm.model}</span>
        </div>
      );
      if (config.llm.temperature) {
        items.push(
          <div key="temp" className="flex items-center gap-1">
            <span>🌡️</span>
            <span>Temp: {config.llm.temperature}</span>
          </div>
        );
      }
    }
    
    if (config.retriever) {
      items.push(
        <div key="retriever" className="flex items-center gap-1">
          <span>🔍</span>
          <span>{config.retriever.type}</span>
        </div>
      );
      if (config.retriever.config?.topK) {
        items.push(
          <div key="topk" className="flex items-center gap-1">
            <span>📊</span>
            <span>Top K: {config.retriever.config.topK}</span>
          </div>
        );
      }
    }

    if (config.memoryRetrieve) {
      items.push(
        <div key="memory-retrieve" className="flex items-center gap-1">
          <span>🧠</span>
          <span>Retrieve: {config.memoryRetrieve.topK || 5} memories</span>
        </div>
      );
      if (config.memoryRetrieve.minScore) {
        items.push(
          <div key="memory-score" className="flex items-center gap-1">
            <span>🎯</span>
            <span>Min score: {config.memoryRetrieve.minScore}</span>
          </div>
        );
      }
    }

    if (config.memoryUpdate) {
      items.push(
        <div key="memory-update" className="flex items-center gap-1">
          <span>💾</span>
          <span>Store memories</span>
        </div>
      );
      if (config.memoryUpdate.retention?.maxMemories) {
        items.push(
          <div key="memory-limit" className="flex items-center gap-1">
            <span>📈</span>
            <span>Max: {config.memoryUpdate.retention.maxMemories}</span>
          </div>
        );
      }
    }

    if (config.memorySummarize) {
      items.push(
        <div key="memory-summarize" className="flex items-center gap-1">
          <span>📝</span>
          <span>Summarize memories</span>
        </div>
      );
      if (config.memorySummarize.triggers?.minMemories) {
        items.push(
          <div key="memory-trigger" className="flex items-center gap-1">
            <span>⚡</span>
            <span>Trigger: {config.memorySummarize.triggers.minMemories}+</span>
          </div>
        );
      }
    }

    return items.length > 0 ? (
      <div className="text-xs opacity-90 space-y-1">
        {items}
      </div>
    ) : (
      <div className="text-xs opacity-70 italic">Click edit to configure</div>
    );
  };

  return (
    <div className={nodeBase}>
      <Handle type="target" position={Position.Top} className={`w-3 h-3 ${handleClass}`} />
      <div className="text-white">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-bold">{data.label}</span>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="rounded p-1 hover:bg-white/10 transition"
            aria-label="Edit node"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>

        {isEditing ? (
          <div className="space-y-2 rounded bg-white/10 p-3 text-xs">
            {renderConfigForm()}
            <button
              onClick={() => setIsEditing(false)}
              className="w-full mt-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded transition-colors text-white text-xs"
            >
              Save
            </button>
          </div>
        ) : (
          renderConfigPreview()
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className={`w-3 h-3 ${handleClass}`} />
    </div>
  );
};

const nodeTypes = {
  workflowNode: WorkflowNode,
};

// Node Palette Component
const NodePalette = ({ onAddNode }: { onAddNode: (type: StepType) => void }) => {
  const nodeTypes = [
    { type: StepType.QUERY_REWRITE, label: 'Query Rewrite', color: 'blue' },
    { type: StepType.RETRIEVAL, label: 'Retrieval', color: 'blue' },
    { type: StepType.RERANK, label: 'Rerank', color: 'blue' },
    { type: StepType.ANSWER_GENERATION, label: 'Answer Generation', color: 'blue' },
    { type: StepType.POST_PROCESS, label: 'Post Process', color: 'blue' },
    { type: StepType.MEMORY_RETRIEVE, label: 'Memory Retrieve', color: 'light-blue' },
    { type: StepType.MEMORY_UPDATE, label: 'Memory Update', color: 'blue' },
    { type: StepType.MEMORY_SUMMARIZE, label: 'Memory Summarize', color: 'cyan' },
  ];

  const getButtonClass = (color: string) => {
    const base = "rounded px-4 py-2 text-white transition flex items-center gap-2";
    switch (color) {
      case 'light-blue': return `${base} bg-blue-500 hover:bg-blue-600`;
      case 'cyan': return `${base} bg-blue-400 hover:bg-blue-500`;
      default: return `${base} bg-blue-600 hover:bg-blue-700`;
    }
  };

  return (
    <div className="mb-4 flex gap-2 flex-wrap">
      {nodeTypes.map(({ type, label, color }) => (
        <button
          key={type}
          onClick={() => onAddNode(type)}
          className={getButtonClass(color)}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          {label}
        </button>
      ))}
    </div>
  );
};

export default function NewWorkflowPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  // React Flow state
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  // @ts-ignore
  const onConnect = useCallback((params: any) => setEdges((eds) => addEdge({
    ...params,
    style: { stroke: '#2563eb', strokeWidth: 2 },
    animated: true
  }, eds)), [setEdges]);

  const editorWrapRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Handle node configuration changes
  const handleNodeConfigChange = useCallback((nodeId: string, config: any) => {
    // @ts-ignore
    setNodes((nds) =>
      nds.map((node) =>
        // @ts-ignore
        node.id === nodeId
        // @ts-ignore
          ? { ...node, data: { ...node.data, config } }
          : node
      )
    );
  }, [setNodes]);

  // Helper functions
const getDefaultConfig = (type: StepType) => {
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
        provider: LLMProvider.ANTHROPIC,
        model: 'claude-3-sonnet',
        temperature: 0.3,
        maxTokens: 100,
      },
    },
    [StepType.ANSWER_GENERATION]: {
      llm: {
        provider: LLMProvider.OPENAI,
        model: 'gpt-4',
        temperature: 0.7,
        maxTokens: 1000,
      },
    },
    [StepType.POST_PROCESS]: {
      prompt: 'Format the answer appropriately and add source attribution if needed.',
    },
    [StepType.MEMORY_RETRIEVE]: {
      memoryRetrieve: {
        enabled: true,
        topK: 5,
        minScore: 0.7,
        includeMetadata: true,
        useReranking: false,
        useHybridSearch: false,
        keywordWeight: 0.3,
      },
    },
    [StepType.MEMORY_UPDATE]: {
      memoryUpdate: {
        enabled: true,
        importance: {
          auto: true,
        },
        deduplication: {
          enabled: true,
          similarityThreshold: 0.8,
          mergeStrategy: 'summarize' as const,
        },
        retention: {
          maxMemories: 1000,
          enableExpiration: true,
          expirationDays: 90,
        },
      },
    },
    [StepType.MEMORY_SUMMARIZE]: {
      memorySummarize: {
        enabled: true,
        triggers: {
          minMemories: 3,
          maxSimilarity: 0.8,
          minGroupSize: 2,
        },
        strategy: {
          preserveDetails: false,
        },
      },
    },
  };

  return baseConfigs[type] || {};
};
  const getNodeLabel = (type: StepType) => {
    const labels = {
      [StepType.QUERY_REWRITE]: 'Query Rewrite',
      [StepType.RETRIEVAL]: 'Retrieval',
      [StepType.RERANK]: 'Rerank',
      [StepType.ANSWER_GENERATION]: 'Answer Generation',
      [StepType.POST_PROCESS]: 'Post Process',
      [StepType.MEMORY_RETRIEVE]: 'Memory Retrieve',
      [StepType.MEMORY_UPDATE]: 'Memory Update',
      [StepType.MEMORY_SUMMARIZE]: 'Memory Summarize',
    };
    return labels[type];
  };

  // Initialize with sample workflow including memory nodes
useEffect(() => {
  const initialNodes: Node[] = [
    {
      id: "1",
      type: "workflowNode",
      position: { x: 250, y: 50 },
      data: { 
        label: "Query Rewrite", 
        type: StepType.QUERY_REWRITE,
        config: getDefaultConfig(StepType.QUERY_REWRITE),
        onConfigChange: handleNodeConfigChange
      },
    },
    {
      id: "2",
      type: "workflowNode",
      position: { x: 100, y: 200 },
      data: { 
        label: "Memory Retrieve",
        type: StepType.MEMORY_RETRIEVE,
        config: getDefaultConfig(StepType.MEMORY_RETRIEVE),
        onConfigChange: handleNodeConfigChange
      },
    },
    {
      id: "3",
      type: "workflowNode",
      position: { x: 400, y: 200 },
      data: { 
        label: "Vector Search", 
        type: StepType.RETRIEVAL,
        config: getDefaultConfig(StepType.RETRIEVAL),
        onConfigChange: handleNodeConfigChange
      },
    },
    {
      id: "4",
      type: "workflowNode",
      position: { x: 250, y: 350 },
      data: { 
        label: "Rerank Results", 
        type: StepType.RERANK,
        config: getDefaultConfig(StepType.RERANK),
        onConfigChange: handleNodeConfigChange
      },
    },
    {
      id: "5",
      type: "workflowNode",
      position: { x: 250, y: 500 },
      data: { 
        label: "Generate Answer", 
        type: StepType.ANSWER_GENERATION,
        config: getDefaultConfig(StepType.ANSWER_GENERATION),
        onConfigChange: handleNodeConfigChange
      },
    },
    {
      id: "6",
      type: "workflowNode",
      position: { x: 250, y: 650 },
      data: { 
        label: "Memory Update", 
        type: StepType.MEMORY_UPDATE,
        config: getDefaultConfig(StepType.MEMORY_UPDATE),
        onConfigChange: handleNodeConfigChange
      },
    },
  ];
    const initialEdges: Edge[] = [
      { 
        id: "e1-2", 
        source: "1", 
        target: "2", 
        animated: true,
        style: { stroke: '#2563eb', strokeWidth: 2 }
      },
      { 
        id: "e1-3", 
        source: "1", 
        target: "3", 
        animated: true,
        style: { stroke: '#2563eb', strokeWidth: 2 }
      },
      { 
        id: "e2-4", 
        source: "2", 
        target: "4",
        style: { stroke: '#2563eb', strokeWidth: 2 }
      },
      { 
        id: "e3-4", 
        source: "3", 
        target: "4",
        style: { stroke: '#2563eb', strokeWidth: 2 }
      },
      { 
        id: "e4-5", 
        source: "4", 
        target: "5",
        style: { stroke: '#2563eb', strokeWidth: 2 }
      },
      { 
        id: "e5-6", 
        source: "5", 
        target: "6",
        style: { stroke: '#2563eb', strokeWidth: 2 }
      },
    ];
    // @ts-ignore
    setNodes(initialNodes);
    // @ts-ignore
    setEdges(initialEdges);
  }, [handleNodeConfigChange]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router, mounted]);

  // Add new node
  const addNewNode = (type: StepType) => {
    const newNode: Node = {
      id: `${Date.now()}`,
      type: "workflowNode",
      position: { x: Math.random() * 400 + 100, y: Math.random() * 400 + 100 },
      data: {
        label: getNodeLabel(type),
        type,
        config: getDefaultConfig(type),
        onConfigChange: handleNodeConfigChange
      },
    };
    // @ts-ignore
    setNodes((nds) => nds.concat(newNode));
    toast.success(`${getNodeLabel(type)} node added`);
  };

  // Delete selected nodes
  const deleteSelectedNodes = () => {
    if (nodes.length > 0) {
      const lastNode = nodes[nodes.length - 1];
      setNodes(nodes.slice(0, -1));
      // @ts-ignore
      setEdges(edges.filter(edge => edge.source !== lastNode.id && edge.target !== lastNode.id));
      toast.success('Node deleted');
    }
  };

  // Convert React Flow nodes/edges to backend format
  const buildWorkflowSteps = (): WorkflowStep[] => {
    const steps: WorkflowStep[] = nodes.map(node => {
      const step: WorkflowStep = {
        // @ts-ignore
        id: node.id,
        // @ts-ignore
        type: node.data.type,
        // @ts-ignore
        config: node.data.config || {}
      };

      // Find next steps from edges
      const nextSteps = edges
      // @ts-ignore
        .filter(edge => edge.source === node.id)
        // @ts-ignore
        .map(edge => edge.target);

      if (nextSteps.length > 0) {
        step.nextSteps = nextSteps;
      }

      return step;
    });

    return steps;
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
      
      const workflowSteps = buildWorkflowSteps();
      // @ts-ignore
      const entryPoint = nodes[0]?.id;

      const configuration: WorkflowConfig = {
        id: `workflow-${Date.now()}`,
        name,
        description,
          // @ts-ignore
        nodes: nodes.map(node => ({
          // @ts-ignore
          id: node.id,
          // @ts-ignore
          type: node.data.type,
          // @ts-ignore
          position: node.position,
          data: {
            // @ts-ignore
            label: node.data.label,
            // @ts-ignore
            config: node.data.config
          }
        })),
          // @ts-ignore
        edges: edges.map(edge => ({
          // @ts-ignore
          id: edge.id,
          // @ts-ignore
          source: edge.source,
          // @ts-ignore
          target: edge.target,
           // @ts-ignore
          type: edge.type
        })),
         // @ts-ignore
        steps: workflowSteps,
        entryPoint,
        cacheEnabled: true,
        cacheTTL: 3600,
      };

      await workflowsApi.create({
        name,
        description,
        configuration,  // @ts-ignore
        status: 'active',
      });

      toast.success('Workflow created successfully!');
      router.push('/workflows');
    } catch (error: any) {
      console.error('Save error:', error);
      toast.error(error.message || 'Failed to save workflow');
    } finally {
      setSaving(false);
    }
  };

  // Fullscreen handling
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
        setIsFullscreen(false);
      }
    };
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("fullscreenchange", onFsChange);
    };
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement && editorWrapRef.current) {
        await editorWrapRef.current.requestFullscreen();
      } else if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch (e) {
      console.log("Fullscreen toggle error:", (e as Error).message);
      setIsFullscreen((v) => !v);
    }
  };

  const editorShellClass = isFullscreen
    ? "fixed inset-0 z-50 bg-gray-900/95 p-4"
    : "bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 border border-gray-700";

  if (!mounted || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
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
          background: "radial-gradient(circle at center, #2563eb, rgba(0,0,0,0) 60%)",
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-600/10 via-transparent to-blue-700/10 -z-10"
        aria-hidden
      />

      {/* Header */}
      <div className="border-b border-white/10 bg-black/30 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="bg-gradient-to-r from-blue-500 to-blue-600 bg-clip-text text-2xl font-bold text-transparent">
                Create New Workflow
              </h1>
              <p className="text-sm opacity-70">Design your multi-LLM RAG pipeline with Memory</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => router.back()}
                className="flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 transition hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-2 text-white transition hover:from-blue-700 hover:to-blue-800 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Save Workflow
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-6 py-6">
        <div className="space-y-4">
          {/* Workflow Info */}
          <div className="bg-black/40 backdrop-blur-sm rounded-lg p-6 border border-white/10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Workflow Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter workflow name..."
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of your workflow..."
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-400"
                />
              </div>
            </div>
          </div>

          {/* Editor Section */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Visual Workflow Editor</h2>
              <div className="flex gap-2">
                <button className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm transition hover:bg-white/5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Export
                </button>
                <button
                  onClick={toggleFullscreen}
                  className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm transition hover:bg-white/5"
                  aria-label={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                >
                  {isFullscreen ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    </svg>
                  )}
                  {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                </button>
              </div>
            </div>

            <div ref={editorWrapRef} className={editorShellClass}>
              {/* Node Palette */}
              <NodePalette onAddNode={addNewNode} />

              {/* Delete Node Button */}
              <div className="mb-4">
                <button
                  onClick={deleteSelectedNodes}
                  className="rounded border border-blue-500/30 px-4 py-2 text-blue-400 transition hover:bg-blue-500/10 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete Last Node
                </button>
              </div>

              {/* React Flow Canvas */}
              <div
                style={{ height: isFullscreen ? "calc(100vh - 120px)" : "600px" }}
                className="rounded-lg border border-white/10 bg-black/50"
              >
                <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  onConnect={onConnect}
                  nodeTypes={nodeTypes}
                  fitView
                  panOnDrag
                  panOnScroll
                  zoomOnScroll
                  zoomOnPinch
                  selectionOnDrag
                  minZoom={0.25}
                  maxZoom={2}
                  defaultViewport={{ x: 0, y: 0, zoom: 0.9 }}
                  snapToGrid
                  snapGrid={[16, 16]}
                  connectionLineType={ConnectionLineType.SmoothStep}
                  defaultEdgeOptions={{
                    animated: true,
                    style: { strokeWidth: 2, stroke: '#2563eb' },
                  }}
                  proOptions={{ hideAttribution: true }}
                  className="[--xy-edge-stroke:#2563eb]"
                >
                  <Controls className="!bg-gray-800 !border-gray-700" />
                  <MiniMap 
                    className="!bg-gray-800 !border-gray-700"
                    nodeColor="#2563eb"
                    maskColor="rgba(0, 0, 0, 0.6)"
                  />
                  <Background
                    className="opacity-30"
                    variant={BackgroundVariant.Dots}
                    gap={12}
                    size={1}
                    color="#2563eb"
                  />
                </ReactFlow>
              </div>

              {/* Stats Bar */}
              <div className="mt-4 flex justify-between items-center text-sm text-gray-400">
                <div className="flex gap-4">
                  <span>Nodes: {nodes.length}</span>
                  <span>Connections: {edges.length}</span>
                  <span>Memory Nodes: {nodes.filter((n: any) => String(n?.data?.type ?? '').includes('MEMORY')).length}</span>
                </div>
                <div className="flex gap-2">
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    Drag to connect nodes
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}