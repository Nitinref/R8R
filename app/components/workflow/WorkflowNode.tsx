'use client';

import React from 'react';
import { WorkflowNode as WorkflowNodeType, StepType } from '@/app/lib/types/workflow.types';
import { cn } from '@/app/lib/utils/helpers';
import { 
  FileText, 
  Search, 
  BarChart, 
  MessageSquare, 
  Settings,
  Trash2 
} from 'lucide-react';

interface WorkflowNodeProps {
  node: WorkflowNodeType;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDrag: (e: React.DragEvent) => void;
  onDragEnd: (e: React.DragEvent) => void;
}

const NODE_ICONS = {
  [StepType.QUERY_REWRITE]: FileText,
  [StepType.RETRIEVAL]: Search,
  [StepType.RERANK]: BarChart,
  [StepType.ANSWER_GENERATION]: MessageSquare,
  [StepType.POST_PROCESS]: Settings,
};

const NODE_COLORS = {
  [StepType.QUERY_REWRITE]: 'bg-blue-100 border-blue-300 text-blue-700',
  [StepType.RETRIEVAL]: 'bg-green-100 border-green-300 text-green-700',
  [StepType.RERANK]: 'bg-yellow-100 border-yellow-300 text-yellow-700',
  [StepType.ANSWER_GENERATION]: 'bg-purple-100 border-purple-300 text-purple-700',
  [StepType.POST_PROCESS]: 'bg-gray-100 border-gray-300 text-gray-700',
};

export function WorkflowNode({
  node,
  isSelected,
  onSelect,
  onDelete,
  onDragStart,
  onDrag,
  onDragEnd,
}: WorkflowNodeProps) {
 // @ts-ignore
  const Icon = NODE_ICONS[node.type];
  // @ts-ignore
  const colorClass = NODE_COLORS[node.type];

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDrag={onDrag}
      onDragEnd={onDragEnd}
      onClick={onSelect}
      style={{
        position: 'absolute',
        left: node.position.x,
        top: node.position.y,
        cursor: 'move',
      }}
      className={cn(
        'w-48 rounded-lg border-2 p-4 shadow-md transition-all hover:shadow-lg',
        colorClass,
        isSelected && 'ring-2 ring-primary-500 ring-offset-2'
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <Icon className="w-5 h-5" />
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="text-red-500 hover:text-red-700"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      <h3 className="text-sm font-semibold">
        {node.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
      </h3>
      {node.config.llm && (
        <p className="text-xs mt-1 opacity-75">
          {node.config.llm.provider}: {node.config.llm.model}
        </p>
      )}
      {node.config.retriever && (
        <p className="text-xs mt-1 opacity-75">
          {node.config.retriever.type}
        </p>
      )}
    </div>
  );
}
