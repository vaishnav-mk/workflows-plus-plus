'use client';

import { useParams, useRouter } from 'next/navigation';
import { WorkflowLoader } from '../../../components/ui/Loader';
import { Spinner } from '@/components';
import { useWorkerQuery } from '../../../hooks/useWorkflowsQuery';
import { PageHeader, Card, CardHeader, CardContent, Button, Badge, DetailsList, StatCard } from '@/components';
import { Alert, AlertTitle } from '@/components';
import Link from 'next/link';

interface Worker {
  id: string;
  name: string;
  created_on: string;
  updated_on?: string;
  subdomain?: {
    enabled: boolean;
    previews_enabled: boolean;
  };
  observability?: {
    enabled: boolean;
    logs?: {
      enabled: boolean;
    };
    traces?: {
      enabled: boolean;
    };
  };
}

export default function WorkerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const workerId = params.workerId as string;
  
  const { data: worker, isLoading: loading, error: queryError } = useWorkerQuery(workerId);
  const error = queryError instanceof Error ? queryError.message : (queryError ? String(queryError) : null);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Spinner size="lg" />
          <p className="text-sm text-gray-600">Loading worker details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="error">
          <AlertTitle>Error</AlertTitle>
          {error}
        </Alert>
      </div>
    );
  }

  const workerDetails: Array<{ label: string; value: string | React.ReactNode }> = [
    { label: 'Worker ID', value: worker?.id || 'N/A' },
    { label: 'Worker Name', value: worker?.name || 'N/A' },
    { 
      label: 'Created', 
      value: worker?.created_on ? new Date(worker.created_on).toLocaleString() : 'N/A' 
    },
    { 
      label: 'Last Updated', 
      value: worker?.updated_on ? new Date(worker.updated_on).toLocaleString() : 'N/A' 
    },
    { 
      label: 'Subdomain', 
      value: worker?.subdomain?.enabled ? (
        <Badge variant="success">Enabled</Badge>
      ) : (
        <Badge variant="info">Disabled</Badge>
      )
    },
    { 
      label: 'Observability', 
      value: worker?.observability?.enabled ? (
        <Badge variant="success">Enabled</Badge>
      ) : (
        <Badge variant="info">Disabled</Badge>
      )
    },
  ];

  return (
    <div className="w-full px-6 py-8">
      <PageHeader
        title={worker?.name || 'Worker'}
        description="Worker details and configuration"
        primaryAction={{
          label: 'View Versions',
          onClick: () => router.push(`/workers/${workerId}/versions`),
        }}
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Worker Details (3/4 width) */}
        <div className="lg:col-span-3 space-y-6">
          <Card>
            <CardHeader>
              <h3 className="text-lg font-medium text-gray-900">Worker Information</h3>
            </CardHeader>
            <CardContent>
              <DetailsList items={workerDetails} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Link href={`/workers/${workerId}/versions`}>
                  <Card className="p-4 hover:ring-2 hover:ring-blue-500 cursor-pointer">
                    <div className="flex items-center gap-3">
                      <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <div>
                        <p className="text-sm font-medium text-gray-900">View Versions</p>
                        <p className="text-sm text-gray-500">See all versions</p>
                      </div>
                    </div>
                  </Card>
                </Link>

                <Card className="p-4 hover:ring-2 hover:ring-blue-500 cursor-pointer">
                  <div className="flex items-center gap-3">
                    <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Create Version</p>
                      <p className="text-sm text-gray-500">Deploy a new version</p>
                    </div>
                  </div>
                </Card>

                <Card className="p-4 hover:ring-2 hover:ring-blue-500 cursor-pointer">
                  <div className="flex items-center gap-3">
                    <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Settings</p>
                      <p className="text-sm text-gray-500">Configure settings</p>
                    </div>
                  </div>
                </Card>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Worker Stats Section (1/4 width) */}
        <div className="lg:col-span-1 space-y-4">
          <h2 className="text-xl font-bold text-gray-900">Worker Stats</h2>
          <StatCard title="Status" value="Active" />
          <StatCard 
            title="Subdomain" 
            value={worker?.subdomain?.enabled ? "Enabled" : "Disabled"}
          />
          <StatCard 
            title="Observability" 
            value={worker?.observability?.enabled ? "Enabled" : "Disabled"}
          />
          <StatCard 
            title="Created" 
            value={worker?.created_on ? new Date(worker.created_on).toLocaleDateString() : 'N/A'} 
          />
        </div>
      </div>
    </div>
  );
}
