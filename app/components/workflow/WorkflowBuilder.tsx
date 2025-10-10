'use client';

import React, { useState } from 'react';
import { WorkflowNode as WorkflowNodeType, StepType, LLMProvider } from '@/app/lib/types/workflow.types';
import { NodePalette } from './NodePalette';
import { WorkflowCanvas } from './WorkflowCanvas';
import { ConfigPanel } from './ConfigPanel';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Save, Play } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface WorkflowBuilderProps {
  initialNodes?: WorkflowNodeType[];
  initialName?: string;
  initialDescription?: string;
  onSave: (name: string, description: string, nodes: WorkflowNodeType[]) => void;
}

export function WorkflowBuilder({
  initialNodes = [],
  initialName = '',
  initialDescription = '',
  onSave,
}: WorkflowBuilderProps) {
  const [nodes, setNodes] = useState<WorkflowNodeType[]>(initialNodes);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [workflowName, setWorkflowName] = useState(initialName);
  const [workflowDescription, setWorkflowDescription] = useState(initialDescription);

  const selectedNode = nodes.find(n => n.id === selectedNodeId) || null;

  const addNode = (type: StepType) => {
    const newNode: WorkflowNodeType = {
      id: uuidv4(),
      type,
      position: { x: 100, y: 100 + nodes.length * 50 },
      config: getDefaultConfig(type),
    };

    setNodes([...nodes, newNode]);
    setSelectedNodeId(newNode.id);
  };

  const deleteNode = (id: string) => {
    setNodes(nodes.filter(n => n.id !== id));
    if (selectedNodeId === id) {
      setSelectedNodeId(null);
    }
  };

  const moveNode = (id: string, x: number, y: number) => {
    setNodes(nodes.map(n =>
      n.id === id ? { ...n, position: { x, y } } : n
    ));
  };

  const updateNodeConfig = (config: Partial<WorkflowNodeType['config']>) => {
    if (!selectedNodeId) return;

    setNodes(nodes.map(n =>
      n.id === selectedNodeId
        ? { ...n, config: { ...n.config, ...config } }
        : n
    ));
  };

  const handleSave = () => {
    if (!workflowName.trim()) {
      alert('Please enter a workflow name');
      return;
    }

    onSave(workflowName, workflowDescription, nodes);
  };

  return (
    <div className="space-y-6">
      {/* Workflow Info */}
      <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Workflow Name"
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            placeholder="My RAG Workflow"
          />
          <Textarea
            label="Description (Optional)"
            value={workflowDescription}
            onChange={(e) => setWorkflowDescription(e.target.value)}
            placeholder="Describe your workflow..."
            rows={1}
          />
        </div>
        <div className="mt-4 flex space-x-3">
          <Button onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" />
            Save Workflow
          </Button>
        </div>
      </div>

      {/* Builder Area */}
      <div className="flex space-x-6">
        <NodePalette onAddNode={addNode} />
        
        <div className="flex-1">
          <WorkflowCanvas
            nodes={nodes}
            selectedNodeId={selectedNodeId}
            onNodeSelect={setSelectedNodeId}
            onNodeDelete={deleteNode}
            onNodeMove={moveNode}
          />
        </div>

        <ConfigPanel node={selectedNode} onUpdate={updateNodeConfig} />
      </div>
    </div>
  );
}

function getDefaultConfig(type: StepType): WorkflowNodeType['config'] {
  switch (type) {
    case StepType.QUERY_REWRITE:
      return {
        llm: {
          provider: LLMProvider.OPENAI,
          model: 'gpt-3.5-turbo',
          temperature: 0.7,
          maxTokens: 500,
        },
      };
    case StepType.RETRIEVAL:
      return {
        retriever: {
          type: 'pinecone' as any,
          config: {
            indexName: 'default',
            topK: 5,
          },
        },
      };
    case StepType.RERANK:
      return {
        llm: {
          provider: LLMProvider.OPENAI,
          model: 'gpt-3.5-turbo',
          temperature: 0.1,
          maxTokens: 200,
        },
      };
    case StepType.ANSWER_GENERATION:
      return {
        llm: {
          provider: LLMProvider.OPENAI,
          model: 'gpt-3.5-turbo',
          temperature: 0.7,
          maxTokens: 1000,
        },
      };
    case StepType.POST_PROCESS:
      return {};
    default:
      return {};
  }
}