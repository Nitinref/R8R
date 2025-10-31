'use client';

import React from 'react';
import Link from 'next/link';
// Assuming these components exist and accept Tailwind classes
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Workflow } from '@/app/lib/types/workflow.types';
import { formatDate } from '@/app/lib/utils/helpers';
import { Plus, Zap, Code, ExternalLink } from 'lucide-react';

interface WorkflowListProps {
  workflows: Workflow[];
}

// Define the dark theme color palette
const CARD_BG = 'bg-gray-950'; // Very deep black card background
const TEXT_LIGHT = 'text-gray-50'; // Primary text color
const TEXT_MUTED = 'text-gray-400'; // Secondary/muted text color
const BORDER_DARK = 'border-gray-800'; // Subtle border color
const ACCENT_RED = 'text-red-500'; // Accent color for highlights
const HOVER_RED_BG = 'hover:bg-red-900/10'; // Subtle red background on hover
const HOVER_BORDER_RED = 'hover:border-red-500'; // Red border on hover

export function WorkflowList({ workflows }: WorkflowListProps) {
  // Utility function for conditional Badge styling
  const getBadgeClasses = (status: 'active' | 'draft' | 'archived' | string) => {
    switch (status) {
      case 'active':
        return 'bg-green-600/20 text-green-400 border border-green-700 font-bold'; // Green for Active
      case 'draft':
        return 'bg-yellow-600/20 text-yellow-400 border border-yellow-700 font-bold'; // Yellow/Amber for Draft
      case 'archived':
      default:
        return 'bg-gray-700/50 text-gray-300 border border-gray-600 font-bold'; // Gray for Archived/Default
    }
  };

  return (
    // Card uses the deepest black background and a red outline
    <Card className={`shadow-2xl border border-red-900/50 ${CARD_BG}`}>
      <CardHeader className={`flex flex-row items-center justify-between border-b ${BORDER_DARK} p-6`}>
        <CardTitle className={`text-2xl font-extrabold ${TEXT_LIGHT}`}>
          <Code className={`w-6 h-6 inline mr-2 ${ACCENT_RED}`} />
          Workflow Automation
        </CardTitle>
        <Link href="/workflows/new">
          {/* Primary Action Button in Red */}
          <Button 
            size="sm" 
            className="bg-red-600 hover:bg-red-700 text-white font-semibold transition-colors shadow-lg hover:shadow-red-500/30"
          >
            <Plus className="w-4 h-4 mr-1" />
            New Workflow
          </Button>
        </Link>
      </CardHeader>
      
      <CardContent className="p-6">
        {workflows.length === 0 ? (
          // Enhanced Empty State
          <div className="text-center py-12 rounded-xl border border-dashed border-red-900/50">
            <p className={`text-lg ${TEXT_MUTED} mb-4`}>
              No active workflows. Launch your first automation script!
            </p>
            <Link href="/workflows/new" >
              <Button className="bg-red-600 hover:bg-red-700 text-white">
                <Zap className="w-4 h-4 mr-2" />
                Create Workflow Now
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {workflows.map((workflow) => (
              <Link
                key={workflow.id}
                href={`/workflows/${workflow.id}`}
                className="block group"
                passHref
                legacyBehavior
              >
                {/* Individual Workflow Item */}
                <div className={`
                  ${BORDER_DARK} border 
                  rounded-xl p-5 
                  transition-all duration-300
                  ${HOVER_BORDER_RED} 
                  ${HOVER_RED_BG}
                  shadow-lg
                  transform group-hover:scale-[1.01]
                `}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0 pr-4">
                      {/* Name - Primary text, red on hover */}
                      <h3 className={`text-xl font-extrabold ${TEXT_LIGHT} group-hover:${ACCENT_RED} transition-colors`}>
                        {workflow.name}
                      </h3>
                      {/* Description - Muted text with truncation */}
                      {workflow.description && (
                        <p className={`text-sm ${TEXT_MUTED} mt-1 truncate`}>
                          {workflow.description}
                        </p>
                      )}
                    </div>
                    
                    {/* Status Badge */}
                    <Badge className={getBadgeClasses(workflow.status)}>
                      {workflow.status.toUpperCase()}
                    </Badge>
                  </div>
                  
                  {/* Footer (Metadata) */}
                  <div className={`flex items-center justify-between mt-4 text-xs font-mono ${TEXT_MUTED} border-t ${BORDER_DARK} pt-3`}>
                    {/* Timestamp */}
                    <span>
                      LAST UPDATE: {formatDate(workflow.updatedAt)}
                    </span>
                    
                    {/* Query Count - Highlighted metric */}
                    {workflow.analytics && (
                      <span className="flex items-center font-bold">
                        <span className={`mr-1 text-base ${ACCENT_RED}`}>
                          {workflow.analytics.totalQueries}
                        </span> 
                        QUERIES
                      </span>
                    )}
                    
                    {/* Navigation Arrow */}
                    <ExternalLink 
                        className={`w-4 h-4 text-gray-600 group-hover:${ACCENT_RED} transition-colors`} 
                    />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}