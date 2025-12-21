'use client';

import { useRouter } from 'next/navigation';
import { Spinner } from '@/components';
import { useWorkflowStartersQuery } from '@/hooks/useWorkflowsQuery';
import { generateWorkflowId } from '@/utils/id-generator';
import { Play, Sparkles } from 'lucide-react';

export function SampleWorkflows() {
  const router = useRouter();
  const { data: starters, isLoading } = useWorkflowStartersQuery();

  const handleStarterClick = (starterId: string) => {
    const workflowId = generateWorkflowId();
    router.push(`/builder?type=starter&template_type=${starterId}&id=${workflowId}`);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty?.toLowerCase()) {
      case 'beginner':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'advanced':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  if (isLoading) {
    return (
      <div className="border border-gray-200 rounded-md bg-white">
        <div className="p-3 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-orange-600" />
            <h2 className="text-xs font-semibold text-gray-900">Sample Workflows</h2>
          </div>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-center">
            <Spinner size="sm" />
          </div>
        </div>
      </div>
    );
  }

  if (!starters || starters.length === 0) {
    return (
      <div className="border border-gray-200 rounded-md bg-white">
        <div className="p-3 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-orange-600" />
            <h2 className="text-xs font-semibold text-gray-900">Sample Workflows</h2>
          </div>
        </div>
        <div className="p-4">
          <p className="text-xs text-gray-500">No workflow starters available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-md bg-white">
      <div className="p-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-orange-600" />
          <h2 className="text-xs font-semibold text-gray-900">Sample Workflows</h2>
        </div>
        <p className="text-[10px] text-gray-500 mt-1">Pre-configured templates to get you started</p>
      </div>
      <div className="p-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {starters.map((starter: any) => {
            const nodeColor = starter.workflow?.nodes?.[0]?.config?.color || '#3b82f6';
            const difficultyColor = getDifficultyColor(starter.difficulty);
            
            return (
              <button
                key={starter.id}
                onClick={() => handleStarterClick(starter.id)}
                className="w-full text-left border border-gray-200 rounded-md bg-white hover:border-orange-300 hover:bg-orange-50/20 transition-all p-3 group"
              >
                <div className="flex items-start gap-2.5">
                  <div
                    className="p-1.5 rounded flex-shrink-0"
                    style={{ backgroundColor: `${nodeColor}15` }}
                  >
                    <Play className="w-3.5 h-3.5" style={{ color: nodeColor }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                      <h3 className="text-xs font-semibold text-gray-900 group-hover:text-orange-700 transition-colors">
                        {starter.name}
                      </h3>
                      {starter.difficulty && (
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] uppercase font-bold border ${difficultyColor}`}>
                          {starter.difficulty}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 mb-2 line-clamp-2 leading-relaxed">
                      {starter.description}
                    </p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {starter.tags && starter.tags.length > 0 && (
                        <>
                          {starter.tags.map((tag: string, tagIndex: number) => (
                            <span
                              key={tagIndex}
                              className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] uppercase font-medium bg-gray-50 text-gray-600 border border-gray-200"
                            >
                              {tag}
                            </span>
                          ))}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
