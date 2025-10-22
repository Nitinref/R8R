'use client';

import React from 'react';
// Assuming these components exist and accept Tailwind classes
import { Card, CardHeader, CardTitle, CardContent } from '@/app/components/ui/Card';
import { Badge } from '@/app/components/ui/Badge';
import { formatDateTime, truncateText } from '@/app/lib/utils/helpers';
import { QueryLog } from '@/backend/generated/prisma';
import { Clock, CheckCircle, XCircle, Zap } from 'lucide-react';

interface RecentQueriesProps {
  queries: QueryLog[];
}

// Define the dark theme color palette
const CARD_BG = 'bg-gray-950'; // 🔥🔥🔥 Deepest Black background for high contrast
const TEXT_LIGHT = 'text-gray-50'; // Primary text color
const TEXT_MUTED = 'text-gray-400'; // Secondary/muted text color
const BORDER_DARK = 'border-gray-800'; // Subtle border color
const ACCENT_RED = 'text-red-500'; // Accent color for highlights
const HOVER_BG = 'hover:bg-gray-800/70'; // Darker, clear hover effect

// Utility function for conditional Badge styling
const getBadgeClasses = (status: 'success' | 'failed' | string) => {
    if (status === 'success') {
        return 'bg-green-600/20 text-green-400 border border-green-700 font-bold';
    }
    // Assuming 'failed' or any other non-success status maps to danger/red
    return 'bg-red-600/20 text-red-400 border border-red-700 font-bold';
};

export function RecentQueries({ queries }: RecentQueriesProps) {
  return (
    // Apply DEEPEST BLACK background and prominent red outline
    <Card className={`shadow-2xl border border-red-900/50 ${CARD_BG}`}>
      <CardHeader className={`border-b ${BORDER_DARK} p-6`}>
        {/* Title is bold and uses the red accent */}
        <CardTitle className={`text-xl font-bold ${TEXT_LIGHT}`}>
          <Zap className={`w-5 h-5 inline mr-2 ${ACCENT_RED}`} />
          Query Execution Log
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-6">
        {queries.length === 0 ? (
          <p className={`${TEXT_MUTED} text-center py-8`}>
            No recent executions found. Start a workflow to see results.
          </p>
        ) : (
          <div className="space-y-3">
            {queries.map((query) => (
              <div
                key={query.id}
                // Row Styling: Clear separation, subtle hover, dark border
                className={`
                  p-4 rounded-lg transition-colors duration-200 
                  ${HOVER_BG} 
                  border-b ${BORDER_DARK} 
                  last:border-0 last:pb-0
                `}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0 pr-4">
                    {/* Query text: primary focus, bolded */}
                    <p className={`text-base font-semibold ${TEXT_LIGHT} truncate`}>
                      {truncateText(query.query, 100)}
                    </p>
                    {/* Workflow name: secondary info, muted and italic */}
                    <p className={`text-xs ${TEXT_MUTED} mt-1 italic`}>
                      {/* @ts-ignore */}
                      Workflow: {query.workflow.name}
                    </p>
                  </div>
                  
                  {/* Status Badge: High-contrast, translucent design */}
                  <div className="flex items-center space-x-2 ml-4 flex-shrink-0">
                    <Badge className={getBadgeClasses(query.status)}>
                      {query.status === 'success' ? (
                        <>
                          <CheckCircle className="w-4 h-4 mr-1" /> Success
                        </>
                      ) : (
                        <>
                          <XCircle className="w-4 h-4 mr-1" /> Failed
                        </>
                      )}
                    </Badge>
                  </div>
                </div>
                
                {/* Secondary Metrics & Timestamp: Technical/Monospaced font */}
                <div className={`flex items-center space-x-6 mt-3 text-xs font-mono tracking-wide ${TEXT_MUTED}`}>
                  
                  {/* Latency: Highlighted Red Metric */}
                  <span className={`flex items-center font-bold ${ACCENT_RED}`}>
                    <Clock className="w-3 h-3 mr-1" />
                    {query.latency}ms
                  </span>
                  
                  {/* Timestamp: Muted text */}
                  <span className={`${TEXT_MUTED}`}>
                    Executed: {formatDateTime(query.createdAt)}
                  </span>
                  
                  {/* Confidence: Highlighted Red Metric */}
                  {query.confidence && (
                    <span className={`${TEXT_MUTED}`}>
                      CONFIDENCE: 
                      <span className={`font-bold ml-1 ${ACCENT_RED}`}>
                        {(query.confidence * 100).toFixed(0)}%
                      </span>
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}