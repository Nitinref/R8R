'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent  } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Workflow } from '@/app/lib/types/workflow.types';
import { formatDate } from '@/app/lib/utils/helpers';
import { Plus, ExternalLink } from 'lucide-react';

interface WorkflowListProps {
  workflows: Workflow[];
}

export function WorkflowList({ workflows }: WorkflowListProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Your Workflows</CardTitle>
        <Link href="/workflows/new">
          <Button size="sm">
            <Plus className="w-4 h-4 mr-1" />
            New Workflow
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        {workflows.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">No workflows yet</p>
            <Link href="/workflows/new">
              <Button>Create your first workflow</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {workflows.map((workflow) => (
              <Link
                key={workflow.id}
                href={`/workflows/${workflow.id}`}
                className="block"
              >
                <div className="border border-gray-200 rounded-lg p-4 hover:border-primary-300 hover:shadow-sm transition-all">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-gray-900">
                        {workflow.name}
                      </h3>
                      {workflow.description && (
                        <p className="text-xs text-gray-600 mt-1">
                          {workflow.description}
                        </p>
                      )}
                    </div>
                    <Badge
                      variant={
                        workflow.status === 'active'
                          ? 'success'
                          : workflow.status === 'draft'
                          ? 'warning'
                          : 'default'
                      }
                    >
                      {workflow.status}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
                    <span>Updated {formatDate(workflow.updatedAt)}</span>
                    {workflow.analytics && (
                      <span>{workflow.analytics.totalQueries} queries</span>
                    )}
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