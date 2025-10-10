'use client';

import React from 'react';
import { WorkflowNode, StepType, LLMProvider, RetrieverType } from '@/app/lib/types/workflow.types';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { Button } from '../ui/Button';

interface ConfigPanelProps {
  node: WorkflowNode | null;
  onUpdate: (config: Partial<WorkflowNode['config']>) => void;
}

export function ConfigPanel({ node, onUpdate }: ConfigPanelProps) {
  if (!node) {
    return (
      <Card className="w-80">
        <CardContent className="p-6">
          <p className="text-gray-500 text-center">
            Select a node to configure
          </p>
        </CardContent>
      </Card>
    );
  }

  const requiresLLM = [
    StepType.QUERY_REWRITE,
    StepType.RERANK,
    StepType.ANSWER_GENERATION,
  ].includes(node.type);

  const requiresRetriever = node.type === StepType.RETRIEVAL;

  return (
    <Card className="w-80">
      <CardHeader>
        <CardTitle className="text-base">Configure Node</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2">
            {node.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </h4>
        </div>

        {requiresLLM && (
          <>
            <Select
              label="LLM Provider"
              value={node.config.llm?.provider || ''}
              onChange={(e) =>
                onUpdate({
                  llm: {
                    ...node.config.llm,
                    provider: e.target.value as LLMProvider,
                    model: node.config.llm?.model || 'gpt-3.5-turbo',
                  },
                })
              }
              options={[
                { value: '', label: 'Select provider' },
                { value: LLMProvider.OPENAI, label: 'OpenAI' },
                { value: LLMProvider.ANTHROPIC, label: 'Anthropic' },
                { value: LLMProvider.GOOGLE, label: 'Google' },
                { value: LLMProvider.MISTRAL, label: 'Mistral' },
              ]}
            />

            <Input
              label="Model"
              value={node.config.llm?.model || ''}
              onChange={(e) =>
                onUpdate({
                  llm: {
                    ...node.config.llm,
                    provider: node.config.llm?.provider || LLMProvider.OPENAI,
                    model: e.target.value,
                  },
                })
              }
              placeholder="e.g., gpt-3.5-turbo"
            />

            <Input
              label="Temperature"
              type="number"
              step="0.1"
              min="0"
              max="2"
              value={node.config.llm?.temperature || 0.7}
              onChange={(e) =>
                onUpdate({
                  llm: {
                    ...node.config.llm!,
                    temperature: parseFloat(e.target.value),
                  },
                })
              }
            />

            <Input
              label="Max Tokens"
              type="number"
              value={node.config.llm?.maxTokens || 1000}
              onChange={(e) =>
                onUpdate({
                  llm: {
                    ...node.config.llm!,
                    maxTokens: parseInt(e.target.value),
                  },
                })
              }
            />

            <Textarea
              label="Custom Prompt (Optional)"
              value={node.config.prompt || ''}
              onChange={(e) => onUpdate({ prompt: e.target.value })}
              rows={4}
              placeholder="Enter custom prompt..."
            />
          </>
        )}

        {requiresRetriever && (
          <>
            <Select
              label="Retriever Type"
              value={node.config.retriever?.type || ''}
              onChange={(e) =>
                onUpdate({
                  retriever: {
                    type: e.target.value as RetrieverType,
                    config: node.config.retriever?.config || {},
                  },
                })
              }
              options={[
                { value: '', label: 'Select retriever' },
                { value: RetrieverType.PINECONE, label: 'Pinecone' },
                { value: RetrieverType.WEAVIATE, label: 'Weaviate' },
                { value: RetrieverType.KEYWORD, label: 'Keyword' },
                { value: RetrieverType.HYBRID, label: 'Hybrid' },
              ]}
            />

            <Input
              label="Index Name"
              value={node.config.retriever?.config.indexName || ''}
              onChange={(e) =>
                onUpdate({
                  retriever: {
                    ...node.config.retriever!,
                    config: {
                      ...node.config.retriever?.config,
                      indexName: e.target.value,
                    },
                  },
                })
              }
              placeholder="default"
            />

            <Input
              label="Top K Results"
              type="number"
              value={node.config.retriever?.config.topK || 5}
              onChange={(e) =>
                onUpdate({
                  retriever: {
                    ...node.config.retriever!,
                    config: {
                      ...node.config.retriever?.config,
                      topK: parseInt(e.target.value),
                    },
                  },
                })
              }
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}