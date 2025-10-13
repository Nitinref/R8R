'use client';

import { useAuth } from '@/app/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef, useCallback } from 'react';
import { workflowsApi } from '@/app/lib/api/workflow';
import { WorkflowNode as WorkflowNodeType, StepType, LLMProvider, RetrieverType } from '@/app/lib/types/workflow.types';
import toast from 'react-hot-toast';
import { ApiKey } from '@/backend/generated/prisma';
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

// Custom Node Component
const WorkflowNode = ({ data, id }: { data: any; id: string }) => {
  const [isEditing, setIsEditing] = useState(false);

  const nodeBase = "rounded-lg shadow-lg p-4 min-w-[220px] border-2 border-red-500/30 bg-gradient-to-br from-red-600 to-red-700";

  return (
    <div className={nodeBase}>
      <Handle type="target" position={Position.Top} className="w-3 h-3 !bg-red-500" />
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

        {isEditing && (
          <div className="space-y-2 rounded bg-white/10 p-3 text-xs">
            <div>
              <label className="block text-xs opacity-80 mb-1">LLM Provider:</label>
              <select className="w-full rounded bg-white/20 px-2 py-1 text-white border border-white/20">
                <option>OpenAI</option>
                <option>Anthropic</option>
                <option>Google</option>
                <option>Mistral</option>
              </select>
            </div>
            <div>
              <label className="block text-xs opacity-80 mb-1">Model:</label>
              <input
                type="text"
                placeholder="gpt-4"
                className="w-full rounded bg-white/20 px-2 py-1 text-white border border-white/20 placeholder-white/50"
              />
            </div>
            <div>
              <label className="block text-xs opacity-80 mb-1">Temperature:</label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                className="w-full accent-white"
              />
            </div>
          </div>
        )}

        {!isEditing && (
          <div className="text-xs opacity-90 space-y-1">
            {data.llm && (
              <div className="flex items-center gap-1">
                <span>🤖</span>
                <span>{data.llm}</span>
              </div>
            )}
            {data.retriever && (
              <div className="flex items-center gap-1">
                <span>🔍</span>
                <span>{data.retriever}</span>
              </div>
            )}
            {data.temperature && (
              <div className="flex items-center gap-1">
                <span>🌡️</span>
                <span>Temp: {data.temperature}</span>
              </div>
            )}
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 !bg-red-500" />
    </div>
  );
};

const nodeTypes = {
  workflowNode: WorkflowNode,
};

// API Keys Component
const ApiKeysSection = () => {
  const [apiKeys, setApiKeys] = useState([
    { id: '1', name: 'Production Key', key: 'sk_prod_1234567890abcdef', lastUsed: '2 hours ago', status: 'active' },
    { id: '2', name: 'Development Key', key: 'sk_dev_abcdef1234567890', lastUsed: '1 day ago', status: 'active' },
  ]);
  const [newKeyName, setNewKeyName] = useState('');

  const createApiKey = () => {
    if (!newKeyName.trim()) {
      toast.error('Please enter a key name');
      return;
    }

    const newKey = {
      id: `${apiKeys.length + 1}`,
      name: newKeyName,
      key: `sk_${Math.random().toString(36).substr(2, 24)}`,
      lastUsed: 'Never',
      status: 'active'
    };

    setApiKeys([...apiKeys, newKey]);
    setNewKeyName('');
    toast.success('API key created successfully!');
  };

  const revokeApiKey = (id: string) => {
    setApiKeys(apiKeys.map(key => 
      key.id === id ? { ...key, status: 'revoked' } : key
    ));
    toast.success('API key revoked');
  };

  return (
    <div className="space-y-6">
      <div className="bg-black/40 backdrop-blur-sm rounded-lg p-6 border border-white/10">
        <h3 className="text-lg font-semibold mb-4">Create New API Key</h3>
        <div className="flex gap-3">
          <input
            type="text"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            placeholder="Enter key name..."
            className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-white placeholder-gray-400"
          />
          <button
            onClick={createApiKey}
            className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            Create Key
          </button>
        </div>
      </div>

      <div className="bg-black/40 backdrop-blur-sm rounded-lg border border-white/10 overflow-hidden">
        <div className="p-6 border-b border-white/10">
          <h3 className="text-lg font-semibold">Your API Keys</h3>
        </div>
        <div className="divide-y divide-white/10">
          {apiKeys.map((apiKey) => (
            <div key={apiKey.id} className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="font-semibold">{apiKey.name}</h4>
                  <code className="text-sm text-gray-300 bg-gray-800 px-2 py-1 rounded">
                    {apiKey.key}
                  </code>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-1 rounded text-xs ${
                    apiKey.status === 'active' 
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                      : 'bg-red-500/20 text-red-400 border border-red-500/30'
                  }`}>
                    {apiKey.status}
                  </span>
                  <button
                    onClick={() => revokeApiKey(apiKey.id)}
                    className="text-red-400 hover:text-red-300 text-sm"
                  >
                    Revoke
                  </button>
                </div>
              </div>
              <div className="text-sm text-gray-400">
                Last used: {apiKey.lastUsed}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Code Block Component
const CodeBlock = ({ title, code, language }: { title: string; code: string; language: string }) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Code copied to clipboard!');
  };

  return (
    <div className="bg-black/40 backdrop-blur-sm rounded-lg border border-white/10 overflow-hidden">
      <div className="flex justify-between items-center px-6 py-3 bg-gray-800 border-b border-white/10">
        <span className="font-medium text-white">{title}</span>
        <button
          onClick={copyToClipboard}
          className="flex items-center gap-2 px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded transition-colors text-sm"
        >
          {copied ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          )}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre className="p-6 overflow-x-auto">
        <code className="text-sm text-gray-300">{code}</code>
      </pre>
    </div>
  );
};

// API Examples Component
const ApiExamplesSection = () => {
  const curlExample = `curl -X POST http://localhost:3001/api/query \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "workflowId": "your-workflow-id",
    "query": "What is the capital of France?"
  }'`;

  const pythonExample = `import requests

url = "http://localhost:3001/api/query"
headers = {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
}
data = {
    "workflowId": "your-workflow-id",
    "query": "What is the capital of France?"
}

response = requests.post(url, headers=headers, json=data)
result = response.json()

print("Answer:", result["answer"])
print("Latency:", result["latency"], "ms")`;

  const javascriptExample = `const response = await fetch('http://localhost:3001/api/query', {
  method: 'POST',
  headers: {
    'x-api-key': 'YOUR_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    workflowId: 'your-workflow-id',
    query: 'What is the capital of France?'
  })
});

const result = await response.json();
console.log('Answer:', result.answer);
console.log('Latency:', result.latency, 'ms');`;

  return (
    <div className="space-y-6">
      <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          API Endpoint
        </h3>
        <code className="text-sm bg-black/30 px-3 py-2 rounded border border-white/10">
          http://localhost:3001/api/query
        </code>
        <div className="mt-4 space-y-2 text-sm text-gray-300">
          <p><strong>Authentication:</strong> Include your API key in the <code className="bg-black/30 px-1 py-0.5 rounded">x-api-key</code> header</p>
          <p><strong>Rate Limits:</strong> 100 requests per minute per API key</p>
          <p><strong>Response Format:</strong> JSON with answer, sources, and metadata</p>
        </div>
      </div>

      <div className="space-y-4">
        <CodeBlock title="cURL" code={curlExample} language="bash" />
        <CodeBlock title="Python" code={pythonExample} language="python" />
        <CodeBlock title="JavaScript" code={javascriptExample} language="javascript" />
      </div>
    </div>
  );
};

export default function NewWorkflowPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'editor' | 'api'>('editor');
  
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  // React Flow state
  const initialNodes: Node[] = [
    {
      id: "1",
      type: "workflowNode",
      position: { x: 250, y: 50 },
      data: { 
        label: "Query Rewrite", 
        type: "query_rewrite", 
        llm: "GPT-4",
        temperature: 0.7 
      },
    },
    {
      id: "2",
      type: "workflowNode",
      position: { x: 100, y: 200 },
      data: { 
        label: "Vector Search", 
        type: "retrieval", 
        retriever: "Pinecone" 
      },
    },
    {
      id: "3",
      type: "workflowNode",
      position: { x: 400, y: 200 },
      data: { 
        label: "Keyword Search", 
        type: "retrieval", 
        retriever: "Elastic" 
      },
    },
    {
      id: "4",
      type: "workflowNode",
      position: { x: 250, y: 350 },
      data: { 
        label: "Rerank Results", 
        type: "rerank", 
        llm: "Claude-3",
        temperature: 0.8 
      },
    },
    {
      id: "5",
      type: "workflowNode",
      position: { x: 250, y: 500 },
      data: { 
        label: "Generate Answer", 
        type: "answer_generation", 
        llm: "Gemini-1.5",
        temperature: 0.7 
      },
    },
  ];

  const initialEdges: Edge[] = [
    { 
      id: "e1-2", 
      source: "1", 
      target: "2", 
      animated: true,
      style: { stroke: '#dc2626', strokeWidth: 2 }
    },
    { 
      id: "e1-3", 
      source: "1", 
      target: "3", 
      animated: true,
      style: { stroke: '#dc2626', strokeWidth: 2 }
    },
    { 
      id: "e2-4", 
      source: "2", 
      target: "4",
      style: { stroke: '#dc2626', strokeWidth: 2 }
    },
    { 
      id: "e3-4", 
      source: "3", 
      target: "4",
      style: { stroke: '#dc2626', strokeWidth: 2 }
    },
    { 
      id: "e4-5", 
      source: "4", 
      target: "5",
      style: { stroke: '#dc2626', strokeWidth: 2 }
    },
  ];

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback((params: any) => setEdges((eds) => addEdge({
    ...params,
    style: { stroke: '#dc2626', strokeWidth: 2 },
    animated: true
  }, eds)), [setEdges]);

  const editorWrapRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

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
      id: `${nodes.length + 1}`,
      type: "workflowNode",
      position: { x: Math.random() * 400 + 100, y: Math.random() * 400 + 100 },
      data: {
        label: getNodeLabel(type),
        type,
        llm: "GPT-4",
        temperature: 0.7,
        ...(type === StepType.RETRIEVAL && { retriever: "Pinecone" })
      },
    };
    setNodes((nds) => nds.concat(newNode));
    toast.success(`${getNodeLabel(type)} node added`);
  };

  // Delete selected nodes
  const deleteSelectedNodes = () => {
    if (nodes.length > 0) {
      const lastNode = nodes[nodes.length - 1];
      setNodes(nodes.slice(0, -1));
      setEdges(edges.filter(edge => edge.source !== lastNode.id && edge.target !== lastNode.id));
      toast.success('Node deleted');
    }
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
      
      const workflowNodes: WorkflowNodeType[] = nodes.map(node => ({
        id: node.id,
        type: node.data.type as StepType,
        name: node.data.label,
        position: node.position,
        // @ts-ignore
        config: getDefaultConfig(node.data.type),
        status: 'active',
      }));

      const configuration = {
        id: `workflow-${Date.now()}`,
        name,
        description,
        steps: workflowNodes,
        edges: edges,
        cacheEnabled: true,
        cacheTTL: 3600,
      };

      await workflowsApi.create({
        name,
        description,
        configuration,
        // @ts-ignore
        status: 'active',
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
                Create New Workflow
              </h1>
              <p className="text-sm opacity-70">Design your multi-LLM RAG pipeline</p>
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
                className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-red-600 to-red-700 px-6 py-2 text-white transition hover:from-red-700 hover:to-red-800 disabled:opacity-50"
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

      {/* Tabs */}
      <div className="mx-auto mt-6 max-w-7xl px-6">
        <div className="flex gap-2 border-b border-white/10">
          {(['editor', 'api'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 capitalize font-medium transition ${
                activeTab === tab
                  ? "border-b-2 border-red-500 text-white"
                  : "opacity-70 hover:opacity-100"
              }`}
            >
              {tab === 'editor' ? 'Workflow Editor' : 'API & Integration'}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-6 py-6">
        {activeTab === 'editor' ? (
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
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-white placeholder-gray-400"
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
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-white placeholder-gray-400"
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
                <div className="mb-4 flex gap-2 flex-wrap">
                  <button
                    onClick={() => addNewNode(StepType.QUERY_REWRITE)}
                    className="rounded bg-red-600 px-4 py-2 text-white transition hover:bg-red-700 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Query Rewrite
                  </button>
                  <button
                    onClick={() => addNewNode(StepType.RETRIEVAL)}
                    className="rounded border border-white/10 px-4 py-2 transition hover:bg-white/5 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Retrieval
                  </button>
                  <button
                    onClick={() => addNewNode(StepType.RERANK)}
                    className="rounded border border-white/10 px-4 py-2 transition hover:bg-white/5 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Rerank
                  </button>
                  <button
                    onClick={() => addNewNode(StepType.ANSWER_GENERATION)}
                    className="rounded border border-white/10 px-4 py-2 transition hover:bg-white/5 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Answer Generation
                  </button>
                  <button
                    onClick={() => addNewNode(StepType.POST_PROCESS)}
                    className="rounded border border-white/10 px-4 py-2 transition hover:bg-white/5 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Post Process
                  </button>
                  <button
                    onClick={deleteSelectedNodes}
                    className="rounded border border-red-500/30 px-4 py-2 text-red-400 transition hover:bg-red-500/10 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete Node
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
                      style: { strokeWidth: 2, stroke: '#dc2626' },
                    }}
                    proOptions={{ hideAttribution: true }}
                    className="[--xy-edge-stroke:#dc2626]"
                  >
                    <Controls className="!bg-gray-800 !border-gray-700" />
                    <MiniMap 
                      className="!bg-gray-800 !border-gray-700"
                      nodeColor="#dc2626"
                      maskColor="rgba(0, 0, 0, 0.6)"
                    />
                    <Background
                      className="opacity-30"
                      variant={BackgroundVariant.Dots}
                      gap={12}
                      size={1}
                      color="#dc2626"
                    />
                  </ReactFlow>
                </div>

                {/* Stats Bar */}
                <div className="mt-4 flex justify-between items-center text-sm text-gray-400">
                  <div className="flex gap-4">
                    <span>Nodes: {nodes.length}</span>
                    <span>Connections: {edges.length}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      Drag to connect nodes
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h2 className="text-xl font-semibold mb-4">API Keys</h2>
                <ApiKeysSection />
              </div>
              <div>
                <h2 className="text-xl font-semibold mb-4">API Examples</h2>
                <ApiExamplesSection />
              </div>
            </div>
          </div>
        )}
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

function getNodeLabel(type: StepType) {
  const labels = {
    [StepType.QUERY_REWRITE]: 'Query Rewrite',
    [StepType.RETRIEVAL]: 'Retrieval',
    [StepType.RERANK]: 'Rerank',
    [StepType.ANSWER_GENERATION]: 'Answer Generation',
    [StepType.POST_PROCESS]: 'Post Process',
  };
  return labels[type];
}