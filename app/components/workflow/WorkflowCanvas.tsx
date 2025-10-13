'use client';

import React from 'react';
import { WorkflowNode as WorkflowNodeType } from '@/app/lib/types/workflow.types';

interface WorkflowNodeProps {
  node: WorkflowNodeType;
  isSelected: boolean;
  isDragging: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onMouseDown: (e: React.MouseEvent) => void;
}

export function WorkflowNode({
  node,
  isSelected,
  isDragging,
  onSelect,
  onDelete,
  onMouseDown,
}: WorkflowNodeProps) {
  const getNodeColor = (type: string) => {
    const colors = {
      query_rewrite: 'bg-blue-500',
      retrieval: 'bg-green-500',
      rerank: 'bg-yellow-500',
      answer_generation: 'bg-purple-500',
      post_process: 'bg-pink-500',
    };
    return colors[type as keyof typeof colors] || 'bg-gray-500';
  };

  const getNodeIcon = (type: string) => {
    const icons = {
      query_rewrite: '🔄',
      retrieval: '🔍',
      rerank: '⚡',
      answer_generation: '💬',
      post_process: '🔧',
    };
    return icons[type as keyof typeof icons] || '📦';
  };

  return (
    <div
      className={`absolute cursor-move transition-all duration-200 ${
        isSelected 
          ? 'ring-2 ring-blue-500 ring-opacity-60 shadow-lg scale-105' 
          : 'ring-1 ring-gray-300 shadow-md hover:shadow-lg hover:scale-102'
      } ${isDragging ? 'shadow-xl scale-105 opacity-90' : ''}`}
      style={{
        left: `${node.position.x}px`,
        top: `${node.position.y}px`,
        width: '180px',
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onMouseDown={onMouseDown}
    >
      <div className={`${getNodeColor(node.type)} rounded-t-lg p-3 text-white`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-lg">{getNodeIcon(node.type)}</span>
            {/* @ts-ignore */}
            <span className="font-semibold text-sm truncate">{node.name}</span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="w-5 h-5 bg-white bg-opacity-20 hover:bg-opacity-30 rounded flex items-center justify-center transition-colors"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
      
      <div className="bg-white rounded-b-lg p-3 border border-t-0 border-gray-200">
        <div className="text-xs text-gray-600 mb-2">
          <div className="flex justify-between items-center">
            <span className="font-medium capitalize">{node.type.replace('_', ' ')}</span>
            {node.config?.llm && (
              <span className="bg-gray-100 px-2 py-1 rounded text-xs">
                {node.config.llm.model}
              </span>
            )}
          </div>
        </div>
        
        {/* Status indicators */}
        <div className="flex justify-between items-center text-xs">
          <div className="flex items-center space-x-1">
            <div className={`w-2 h-2 rounded-full ${
              // @ts-ignore
              node.status === 'active' ? 'bg-green-500' : 'bg-gray-400'
            }`}></div>
            {/* @ts-ignore */}
            <span className="text-gray-500">{node.status}</span>
          </div>
          
          {node.nextSteps && node.nextSteps.length > 0 && (
            <div className="flex items-center space-x-1 text-gray-500">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
              <span>{node.nextSteps.length}</span>
            </div>
          )}
        </div>
      </div>

      {/* Connection handles */}
      <div className="absolute -right-2 top-1/2 transform -translate-y-1/2">
        <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-md"></div>
      </div>
      
      <div className="absolute -left-2 top-1/2 transform -translate-y-1/2">
        <div className="w-4 h-4 bg-green-500 rounded-full border-2 border-white shadow-md"></div>
      </div>
    </div>
  );
}