'use client';

import React from 'react';
import { StepType } from '@/app/lib/types/workflow.types';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { 
  FileText, 
  Search, 
  BarChart, 
  MessageSquare, 
  Settings 
} from 'lucide-react';

interface NodePaletteProps {
  onAddNode: (type: StepType) => void;
}

const NODE_TYPES = [
  {
    type: StepType.QUERY_REWRITE,
    label: 'Query Rewrite',
    icon: FileText,
    description: 'Rewrite queries for better retrieval',
    color: 'bg-blue-100 hover:bg-blue-200 text-blue-700',
  },
  {
    type: StepType.RETRIEVAL,
    label: 'Retrieval',
    icon: Search,
    description: 'Retrieve documents from vector DB',
    color: 'bg-green-100 hover:bg-green-200 text-green-700',
  },
  {
    type: StepType.RERANK,
    label: 'Rerank',
    icon: BarChart,
    description: 'Rerank retrieved documents',
    color: 'bg-yellow-100 hover:bg-yellow-200 text-yellow-700',
  },
  {
    type: StepType.ANSWER_GENERATION,
    label: 'Answer Generation',
    icon: MessageSquare,
    description: 'Generate final answer',
    color: 'bg-purple-100 hover:bg-purple-200 text-purple-700',
  },
  {
    type: StepType.POST_PROCESS,
    label: 'Post Process',
    icon: Settings,
    description: 'Post-process the output',
    color: 'bg-gray-100 hover:bg-gray-200 text-gray-700',
  },
];

export function NodePalette({ onAddNode }: NodePaletteProps) {
  return (
    <Card className="w-64">
      <CardHeader>
        <CardTitle className="text-base">Node Palette</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {NODE_TYPES.map((nodeType) => {
            const Icon = nodeType.icon;
            return (
              <button
                key={nodeType.type}
                onClick={() => onAddNode(nodeType.type)}
                className={`w-full p-3 rounded-lg border-2 border-transparent transition-all text-left ${nodeType.color}`}
              >
                <div className="flex items-center space-x-2">
                  <Icon className="w-5 h-5" />
                  <div>
                    <h4 className="text-sm font-semibold">{nodeType.label}</h4>
                    <p className="text-xs opacity-75">{nodeType.description}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}