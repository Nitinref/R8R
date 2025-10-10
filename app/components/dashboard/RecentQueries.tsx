'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/app/components/ui/Card';
import { Badge } from '@/app/components/ui/Badge';
import { formatDateTime, truncateText } from '@/app/lib/utils/helpers';
import { QueryLog } from '@/backend/generated/prisma';
import { Clock, CheckCircle, XCircle } from 'lucide-react';

interface RecentQueriesProps {
  queries: QueryLog[];
}

export function RecentQueries({ queries }: RecentQueriesProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Queries</CardTitle>
      </CardHeader>
      <CardContent>
        {queries.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No queries yet</p>
        ) : (
          <div className="space-y-4">
            {queries.map((query) => (
              <div
                key={query.id}
                className="border-b border-gray-200 pb-4 last:border-0 last:pb-0"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {truncateText(query.query, 100)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                        {/* @ts-ignore */}
                      {query.workflow.name}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    {query.status === 'success' ? (
                      <Badge variant="success">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Success
                      </Badge>
                    ) : (
                      <Badge variant="danger">
                        <XCircle className="w-3 h-3 mr-1" />
                        Failed
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                  <span className="flex items-center">
                    <Clock className="w-3 h-3 mr-1" />
                    {query.latency}ms
                  </span>
                  <span>{formatDateTime(query.createdAt)}</span>
                  {query.confidence && (
                    <span>Confidence: {(query.confidence * 100).toFixed(0)}%</span>
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