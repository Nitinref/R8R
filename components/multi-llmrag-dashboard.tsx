"use client"
import { useState, useCallback, useEffect, useRef } from "react"
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
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { Settings, Play, Save, Download, Upload, Plus, Eye, Key, Maximize2, Minimize2 } from "lucide-react"

// Custom Node Component
const WorkflowNode = ({ data, id }: { data: any; id: string }) => {
  const [isEditing, setIsEditing] = useState(false)

  // use a consistent red gradient for all node types to match the brand
  const nodeBase =
    "rounded-lg shadow-lg p-4 min-w-[220px] border-2 border-[color:var(--brand-red-1)]/30 bg-gradient-to-br from-(--brand-red-2) to-(--brand-red-1)"

  return (
    <div className={nodeBase}>
      <Handle type="target" position={Position.Top} className="w-3 h-3 !bg-(--brand-red-1)" />
      <div className="text-(--brand-contrast)">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-bold">{data.label}</span>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="rounded p-1 hover:bg-white/10 transition"
            aria-label="Edit node"
          >
            <Settings size={14} />
          </button>
        </div>

        {isEditing && (
          <div className="space-y-1 rounded bg-white/5 p-2 text-xs">
            <div>
              <label className="block text-xs opacity-80">LLM:</label>
              <select className="w-full rounded bg-white/10 px-2 py-1 text-(--brand-contrast)">
                <option>GPT-4</option>
                <option>Claude-3</option>
                <option>Gemini-1.5</option>
                <option>Mistral</option>
              </select>
            </div>
            <div>
              <label className="block text-xs opacity-80">Config:</label>
              <input
                type="text"
                placeholder="temperature=0.7"
                className="w-full rounded bg-white/10 px-2 py-1 text-(--brand-contrast) placeholder-white/50"
              />
            </div>
          </div>
        )}

        {!isEditing && (
          <div className="text-xs opacity-90">
            {data.llm && (
              <div>
                {"🤖 "}
                {data.llm}
              </div>
            )}
            {data.retriever && (
              <div>
                {"🔍 "}
                {data.retriever}
              </div>
            )}
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 !bg-(--brand-red-1)" />
    </div>
  )
}

const nodeTypes = {
  workflowNode: WorkflowNode,
}

// Main Component
export default function MultiLLMRAGDashboard() {
  const [activeTab, setActiveTab] = useState<"workflows" | "editor" | "analytics" | "logs">("workflows")
  const [workflows, setWorkflows] = useState([
    { id: "wf1", name: "Research Assistant", status: "active", queries: 1247 },
    { id: "wf2", name: "Customer Support", status: "active", queries: 3421 },
    { id: "wf3", name: "Document Analyzer", status: "draft", queries: 0 },
  ])
  const [selectedWorkflow, setSelectedWorkflow] = useState<any>(null)

  const initialNodes: Node[] = [
    {
      id: "1",
      type: "workflowNode",
      position: { x: 250, y: 50 },
      data: { label: "Query Rewrite", type: "query_rewrite", llm: "GPT-4" },
    },
    {
      id: "2",
      type: "workflowNode",
      position: { x: 100, y: 200 },
      data: { label: "Vector Search", type: "retrieval", retriever: "Pinecone" },
    },
    {
      id: "3",
      type: "workflowNode",
      position: { x: 400, y: 200 },
      data: { label: "Keyword Search", type: "retrieval", retriever: "Elastic" },
    },
    {
      id: "4",
      type: "workflowNode",
      position: { x: 250, y: 350 },
      data: { label: "Rerank Results", type: "rerank", llm: "Claude-3" },
    },
    {
      id: "5",
      type: "workflowNode",
      position: { x: 250, y: 500 },
      data: { label: "Generate Answer", type: "answer", llm: "Gemini-1.5" },
    },
  ]

  const initialEdges: Edge[] = [
    { id: "e1-2", source: "1", target: "2", animated: true },
    { id: "e1-3", source: "1", target: "3", animated: true },
    { id: "e2-4", source: "2", target: "4" },
    { id: "e3-4", source: "3", target: "4" },
    { id: "e4-5", source: "4", target: "5" },
  ]

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  const onConnect = useCallback((params: any) => setEdges((eds) => addEdge(params, eds)), [setEdges])

  const addNewNode = (type: string) => {
    const newNode: Node = {
      id: `${nodes.length + 1}`,
      type: "workflowNode",
      position: { x: Math.random() * 400 + 100, y: Math.random() * 400 + 100 },
      data: {
        label:
          type === "query_rewrite"
            ? "Query Rewrite"
            : type === "retrieval"
              ? "Retrieval"
              : type === "rerank"
                ? "Rerank"
                : type === "answer"
                  ? "Answer Gen"
                  : "Processing",
        type,
        llm: "GPT-4",
      },
    }
    setNodes((nds) => nds.concat(newNode))
  }

  const editorWrapRef = useRef<HTMLDivElement>(null)

  const [isFullscreen, setIsFullscreen] = useState(false)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {})
        }
        setIsFullscreen(false)
      }
    }
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement))
    }
    window.addEventListener("keydown", onKey)
    document.addEventListener("fullscreenchange", onFsChange)
    return () => {
      window.removeEventListener("keydown", onKey)
      document.removeEventListener("fullscreenchange", onFsChange)
    }
  }, [])

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement && editorWrapRef.current) {
        await editorWrapRef.current.requestFullscreen()
      } else if (document.fullscreenElement) {
        await document.exitFullscreen()
      }
    } catch (e) {
      console.log("[v0] Fullscreen toggle error:", (e as Error).message)
      setIsFullscreen((v) => !v) // fallback to CSS only if API fails
    }
  }

  const editorShellClass = isFullscreen
    ? "fixed inset-0 z-50 bg-slate-900/95 p-4"
    : "bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 border border-slate-700"

  return (
    <div className="relative min-h-screen text-(--brand-contrast)">
      {/* base near-black background */}
      <div className="absolute inset-0 bg-(--brand-bg)" aria-hidden />
      {/* centered circular red gradient glow */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[80vmin] w-[80vmin] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-50 blur-2xl"
        style={{
          background: "radial-gradient(circle at center, var(--brand-red-1), rgba(0,0,0,0) 60%)",
        }}
        aria-hidden
      />
      {/* soft red diagonal wash */}
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-(--brand-red-1)/10 via-transparent to-(--brand-red-2)/10 -z-10"
        aria-hidden
      />
      {/* Header */}
      <div className="border-b border-white/10 bg-black/30 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="bg-gradient-to-r from-(--brand-red-1) to-(--brand-red-2) bg-clip-text text-2xl font-bold text-transparent">
                Multi-LLM RAG Workflow
              </h1>
              <p className="text-sm opacity-70">Production-Ready AI Pipeline Orchestration</p>
            </div>
            <div className="flex gap-3">
              <button className="flex items-center gap-2 rounded-lg bg-(--brand-red-1) px-4 py-2 text-(--brand-contrast) transition hover:bg-(--brand-red-2)">
                <Plus size={16} />
                New Workflow
              </button>
              <button className="flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 transition hover:bg-white/5">
                <Key size={16} />
                API Keys
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mx-auto mt-6 max-w-7xl px-6">
        <div className="flex gap-2 border-b border-white/10">
          {(["workflows", "editor", "analytics", "logs"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 capitalize font-medium transition ${
                activeTab === tab
                  ? "border-b-2 border-(--brand-red-1) text-(--brand-contrast)"
                  : "opacity-70 hover:opacity-100"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-7xl px-6 py-6">
        {activeTab === "workflows" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Your Workflows</h2>
              <div className="flex gap-2">
                <button className="px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm flex items-center gap-2">
                  <Upload size={16} />
                  Import
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {workflows.map((wf) => (
                <div
                  key={wf.id}
                  className="bg-black/40 backdrop-blur-sm rounded-lg p-6 border border-white/10 hover:border-(--brand-red-1) transition-all"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-semibold text-lg">{wf.name}</h3>
                      <span
                        className={`text-xs px-2 py-1 rounded border ${
                          wf.status === "active"
                            ? "border-(--brand-red-1)/40 text-(--brand-contrast) bg-(--brand-red-1)/15"
                            : "border-white/10 text-(--brand-contrast)/80 bg-white/5"
                        }`}
                      >
                        {wf.status}
                      </span>
                    </div>
                    <button className="opacity-80 hover:opacity-100">
                      <Settings size={18} />
                    </button>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Total Queries:</span>
                      <span className="font-semibold">{wf.queries.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Avg Latency:</span>
                      <span className="font-semibold">1.2s</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Accuracy:</span>
                      <span className="font-semibold text-green-400">94.2%</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setSelectedWorkflow(wf)
                        setActiveTab("editor")
                      }}
                      className="flex-1 px-3 py-2 rounded text-sm flex items-center justify-center gap-2 bg-(--brand-red-1) hover:bg-(--brand-red-2) text-(--brand-contrast)"
                    >
                      <Eye size={14} />
                      Edit
                    </button>
                    <button className="flex-1 px-3 py-2 rounded text-sm flex items-center justify-center gap-2 border border-white/10 hover:bg-white/5">
                      <Play size={14} />
                      Test
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "editor" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Visual Workflow Editor</h2>
              <div className="flex gap-2">
                <button className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm transition hover:bg-white/5">
                  <Download size={16} /> Export
                </button>
                <button className="flex items-center gap-2 rounded-lg bg-(--brand-red-1) px-3 py-2 text-sm text-(--brand-contrast) transition hover:bg-(--brand-red-2)">
                  <Save size={16} /> Save
                </button>
                <button className="flex items-center gap-2 rounded-lg bg-(--brand-red-2) px-3 py-2 text-sm text-(--brand-contrast) transition hover:bg-(--brand-red-1)">
                  <Play size={16} /> Run Test
                </button>
                <button
                  onClick={toggleFullscreen}
                  className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm transition hover:bg-white/5"
                  aria-label={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                >
                  {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                  {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                </button>
              </div>
            </div>

            <div ref={editorWrapRef} className={editorShellClass}>
              <div className="mb-4 flex gap-2">
                <button
                  onClick={() => addNewNode("query_rewrite")}
                  className="rounded bg-(--brand-red-1) px-3 py-2 text-(--brand-contrast) transition hover:bg-(--brand-red-2)"
                >
                  + Query Rewrite
                </button>
                <button
                  onClick={() => addNewNode("retrieval")}
                  className="rounded border border-white/10 px-3 py-2 transition hover:bg-white/5"
                >
                  + Retrieval
                </button>
                <button
                  onClick={() => addNewNode("rerank")}
                  className="rounded border border-white/10 px-3 py-2 transition hover:bg-white/5"
                >
                  + Rerank
                </button>
                <button
                  onClick={() => addNewNode("answer")}
                  className="rounded border border-white/10 px-3 py-2 transition hover:bg-white/5"
                >
                  + Answer Gen
                </button>
              </div>

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
                    style: { strokeWidth: 2, stroke: "var(--brand-red-1)" },
                  }}
                  proOptions={{ hideAttribution: true }}
                  className="[--xy-edge-stroke:var(--brand-red-1)]"
                >
                  <Controls />
                  <MiniMap className="[&>svg>rect]:fill-white/5 [&>svg>path]:stroke-(--brand-red-1)" />
                  <Background
                    className="opacity-30"
                    variant={BackgroundVariant.Dots}
                    gap={12}
                    size={1}
                    color="var(--brand-red-2)"
                  />
                </ReactFlow>
              </div>
            </div>
          </div>
        )}

        {activeTab === "analytics" && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold mb-4">Analytics Dashboard</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  label: "Total Queries",
                  value: "12,847",
                  change: "+12.5%",
                  color: "blue",
                },
                {
                  label: "Avg Latency",
                  value: "1.2s",
                  change: "-8.3%",
                  color: "green",
                },
                {
                  label: "Accuracy Score",
                  value: "94.2%",
                  change: "+2.1%",
                  color: "purple",
                },
                {
                  label: "Active Workflows",
                  value: "8",
                  change: "+2",
                  color: "orange",
                },
              ].map((stat, i) => (
                <div key={i} className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-6 border border-slate-700">
                  <div className="text-sm text-slate-400 mb-1">{stat.label}</div>
                  <div className="text-2xl font-bold mb-2">{stat.value}</div>
                  <div
                    className={`text-sm ${
                      stat.change.startsWith("+") ? "text-(--brand-contrast)/80" : "text-(--brand-red-1)"
                    }`}
                  >
                    {stat.change} vs last month
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-black/40 backdrop-blur-sm rounded-lg border border-white/10 overflow-hidden">
              <h3 className="font-semibold mb-4">Query Volume (Last 7 Days)</h3>
              <div className="h-64 flex items-end justify-around gap-2">
                {[45, 62, 58, 71, 68, 79, 85].map((height, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center">
                    <div
                      className="w-full rounded-t bg-gradient-to-t from-(--brand-red-2) to-(--brand-red-1) hover:from-(--brand-red-2)/90 hover:to-(--brand-red-1)/90 transition-all cursor-pointer"
                      style={{ height: `${height}%` }}
                    />
                    <div className="text-xs opacity-70 mt-2">Day {i + 1}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "logs" && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold mb-4">Query Logs</h2>

            <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-white/10 overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-700/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Timestamp</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Workflow</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Query</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Latency</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {[
                    {
                      time: "2 min ago",
                      workflow: "Research Assistant",
                      query: "Explain CRISPR gene editing",
                      latency: "1.3s",
                      status: "success",
                    },
                    {
                      time: "5 min ago",
                      workflow: "Customer Support",
                      query: "How to reset password?",
                      latency: "0.8s",
                      status: "success",
                    },
                    {
                      time: "12 min ago",
                      workflow: "Research Assistant",
                      query: "Latest AI breakthroughs 2025",
                      latency: "2.1s",
                      status: "success",
                    },
                    {
                      time: "18 min ago",
                      workflow: "Document Analyzer",
                      query: "Summarize quarterly report",
                      latency: "3.2s",
                      status: "success",
                    },
                  ].map((log, i) => (
                    <tr key={i} className="hover:bg-slate-700/30">
                      <td className="px-4 py-3 text-sm text-slate-300">{log.time}</td>
                      <td className="px-4 py-3 text-sm">{log.workflow}</td>
                      <td className="px-4 py-3 text-sm text-slate-300">{log.query}</td>
                      <td className="px-4 py-3 text-sm">{log.latency}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 rounded text-xs border border-(--brand-red-1)/30 bg-(--brand-red-1)/10 text-(--brand-contrast)">
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
