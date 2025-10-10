'use client';

import React, { useState, useRef, useEffect } from 'react';
import { WorkflowNode as WorkflowNodeType } from '@/app/lib/types/workflow.types';
import { WorkflowNode } from './WorkflowNode';

interface WorkflowCanvasProps {
  nodes: WorkflowNodeType[];
  selectedNodeId: string | null;
  onNodeSelect: (id: string) => void;
  onNodeDelete: (id: string) => void;
  onNodeMove: (id: string, x: number, y: number) => void;
}

export function WorkflowCanvas({
  nodes,
  selectedNodeId,
  onNodeSelect,
  onNodeDelete,
  onNodeMove,
}: WorkflowCanvasProps) {
  const [draggingNode, setDraggingNode] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  const handleDragStart = (nodeId: string, e: React.DragEvent) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    setDraggingNode(nodeId);
    setDragOffset({
      x: e.clientX - node.position.x,
      y: e.clientY - node.position.y,
    });
  };

  const handleDrag = (nodeId: string, e: React.DragEvent) => {
    if (e.clientX === 0 && e.clientY === 0) return; // Ignore final drag event
    
    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left - dragOffset.x;
      const y = e.clientY - rect.top - dragOffset.y;
      
      onNodeMove(nodeId, Math.max(0, x), Math.max(0, y));
    }
  };

  const handleDragEnd = () => {
    setDraggingNode(null);
  };

  return (
    <div
      ref={canvasRef}
      className="relative bg-gray-50 border-2 border-gray-300 rounded-lg overflow-hidden"
      style={{ minHeight: '600px', width: '100%' }}
    >
      {/* Grid Background */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(to right, #e5e7eb 1px, transparent 1px),
            linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px',
        }}
      />

      {/* Connection Lines */}
      <svg
        className="absolute inset-0 pointer-events-none"
        style={{ width: '100%', height: '100%' }}
      >
        {nodes.map((node) =>
          node.nextSteps?.map((nextStepId) => {
            const targetNode = nodes.find(n => n.id === nextStepId);
            if (!targetNode) return null;

            return (
              <line
                key={`${node.id}-${nextStepId}`}
                x1={node.position.x + 96}
                y1={node.position.y + 50}
                x2={targetNode.position.x + 96}
                y2={targetNode.position.y + 50}
                stroke="#3b82f6"
                strokeWidth="2"
                markerEnd="url(#arrowhead)"
              />
            );
          })
        )}
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="10"
            refX="9"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 10 3, 0 6" fill="#3b82f6" />
          </marker>
        </defs>
      </svg>

      {/* Nodes */}
      {nodes.map((node) => (
        <WorkflowNode
          key={node.id}
          node={node}
          isSelected={node.id === selectedNodeId}
          onSelect={() => onNodeSelect(node.id)}
          onDelete={() => onNodeDelete(node.id)}
          onDragStart={(e) => handleDragStart(node.id, e)}
          onDrag={(e) => handleDrag(node.id, e)}
          onDragEnd={handleDragEnd}
        />
      ))}

      {nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-gray-500 text-center">
            Add nodes from the palette to start building your workflow
          </p>
        </div>
      )}
    </div>
  );
}