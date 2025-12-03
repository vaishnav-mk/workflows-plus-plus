'use client';

import { PageHeader, Card, CardContent } from '@/components';
import { Workflow, Server, Plus } from 'lucide-react';
import Link from 'next/link';
import { WorkflowDetails, SampleWorkflows } from '@/components';
import { useWorkflowsQuery, useWorkersQuery, useWorkflowStartersQuery } from '@/hooks/useWorkflowsQuery';

export default function HomePage() {
  useWorkflowStartersQuery();
  useWorkersQuery(1, 10);
  useWorkflowsQuery();

  const features = [
    {
      icon: Workflow,
      title: 'Workflow Builder',
      description: 'Build and deploy workflows with drag and drop interface',
      href: '/builder',
      color: 'bg-blue-50 text-blue-600',
    },
    {
      icon: Workflow,
      title: 'Workflows',
      description: 'Manage and monitor your deployed workflows',
      href: '/workflows',
      color: 'bg-green-50 text-green-600',
    },
    {
      icon: Server,
      title: 'Workers',
      description: 'View and manage Cloudflare Workers',
      href: '/workers',
      color: 'bg-purple-50 text-purple-600',
    },
    {
      icon: Plus,
      title: 'Create with AI',
      description: 'Generate workflows using AI from descriptions or images',
      href: '/create',
      color: 'bg-orange-50 text-orange-600',
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      <div className="w-full px-6 py-12">
        <PageHeader
          title="Workflows Dashboard"
          description="Build, deploy, and manage Cloudflare Workflows with an intuitive drag-and-drop interface"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Link key={feature.href} href={feature.href} className="no-underline">
                <Card className="h-full">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-lg ${feature.color}`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          {feature.title}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        <WorkflowDetails />
        
        <div className="mt-6">
          <SampleWorkflows />
        </div>

      </div>
    </div>
  );
}
