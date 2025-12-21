'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, Button, Spinner } from '@/components';
import { useWorkflowStartersQuery } from '@/hooks/useWorkflowsQuery';
import { generateWorkflowId } from '@/utils/id-generator';
import { Play } from 'lucide-react';

export function SampleWorkflows() {
  const router = useRouter();
  const { data: starters, isLoading } = useWorkflowStartersQuery();

  const handleStarterClick = (starterId: string) => {
    // Generate workflow ID and create URL with proper format
    // Format: ?type=starter&template_type=ai-processing&id=workflow-ghost-beneficiary-bed
    const workflowId = generateWorkflowId();
    router.push(`/builder?type=starter&template_type=${starterId}&id=${workflowId}`);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold text-gray-900">Sample Workflows</h2>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Spinner size="sm" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!starters || starters.length === 0) {
    return (
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold text-gray-900">Sample Workflows</h2>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">No workflow starters available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="text-xl font-semibold text-gray-900">Sample Workflows</h2>
        <p className="text-sm text-gray-500 mt-1">Start building from these pre-configured templates</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {starters.map((starter: any) => (
            <div 
              key={starter.id} 
              className="border-l-4 pl-4 py-3 rounded-r-lg transition-all hover:bg-gray-50"
              style={{ borderLeftColor: starter.workflow?.nodes?.[0]?.config?.color || '#3b82f6' }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900">{starter.name}</h3>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      starter.difficulty === 'beginner' 
                        ? 'bg-green-100 text-green-800'
                        : starter.difficulty === 'intermediate'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {starter.difficulty}
                    </span>
                    {starter.category && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                        {starter.category}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{starter.description}</p>
                  {starter.tags && starter.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {starter.tags.map((tag: string, tagIndex: number) => (
                        <span
                          key={tagIndex}
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleStarterClick(starter.id)}
                  className="m-4 flex-shrink-0"
                >
                  <Play className="w-4 h-4 mr-1.5" />
                  Use Template
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
