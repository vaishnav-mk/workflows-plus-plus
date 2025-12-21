'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useMemo, useEffect } from 'react';
import { PageHeader, Badge, DetailsList, StatCard, Spinner, CrossHatchBackground, SearchBar, DataTable, Pagination, Alert, AlertTitle, Button } from '@/components';
import { useWorkerQuery, useWorkerVersionsQuery } from '@/hooks/useWorkflowsQuery';
import { type ColumnDef } from '@tanstack/react-table';
import Link from 'next/link';

interface Version {
  id: string;
  created_on: string;
  number: number;
}

export default function WorkerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const workerId = params.workerId as string;
  
  const [searchQuery, setSearchQuery] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    per_page: 10,
    total: 0,
    total_pages: 0
  });

  const { data: worker, isLoading: workerLoading, error: workerError } = useWorkerQuery(workerId);
  const { data: versionsResult, isLoading: versionsLoading, error: versionsError } = useWorkerVersionsQuery(workerId, pagination.page, pagination.per_page);
  
  const versions = useMemo(() => versionsResult?.data || [], [versionsResult?.data]);
  const loading = workerLoading || versionsLoading;
  const error = workerError instanceof Error ? workerError.message : (versionsError instanceof Error ? versionsError.message : (workerError || versionsError ? String(workerError || versionsError) : null));
  
  // Update pagination when data changes
  useEffect(() => {
    if (versionsResult?.pagination) {
      const newPagination = versionsResult.pagination;
      setPagination((prev) => {
        if (
          prev.page !== newPagination.page ||
          prev.per_page !== newPagination.per_page ||
          prev.total !== newPagination.total ||
          prev.total_pages !== newPagination.total_pages
        ) {
          return newPagination;
        }
        return prev;
      });
    }
  }, [versionsResult]);
  
  const typedWorker = worker as {
    id?: string;
    name?: string;
    created_on?: string;
    updated_on?: string;
    subdomain?: { enabled?: boolean };
    observability?: { enabled?: boolean };
    [key: string]: unknown;
  } | undefined;

  const filteredVersions = useMemo(() => {
    if (!searchQuery) return versions;
    const query = searchQuery.toLowerCase();
    return versions.filter((v: any) => 
      v.id.toLowerCase().includes(query) ||
      v.number.toString().includes(query)
    );
  }, [versions, searchQuery]);

  const columns: ColumnDef<Version>[] = useMemo(() => [
    {
      accessorKey: 'number',
      header: 'Version',
      cell: ({ row }) => (
        <Link 
          href={`/workers/${workerId}/versions/${row.original.id}`}
          className="text-xs font-medium text-blue-600 hover:text-blue-500"
        >
          Version {row.original.number}
        </Link>
      ),
    },
    {
      accessorKey: 'id',
      header: 'Version ID',
      cell: ({ row }) => (
        <div className="text-xs text-gray-500 font-mono">
          {row.original.id.substring(0, 8)}...
        </div>
      ),
    },
    {
      accessorKey: 'created_on',
      header: 'Created',
      cell: ({ row }) => (
        <div className="text-xs text-gray-500">
          {new Date(row.original.created_on).toLocaleString()}
        </div>
      ),
    },
  ], [workerId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50/30 relative flex items-center justify-center">
        <CrossHatchBackground pattern="large" />
        <div className="relative z-10 flex flex-col items-center gap-4">
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
    { label: 'Worker ID', value: typedWorker?.id || 'N/A' },
    { label: 'Worker Name', value: typedWorker?.name || 'N/A' },
    { 
      label: 'Created', 
      value: typedWorker?.created_on ? new Date(typedWorker.created_on).toLocaleString() : 'N/A' 
    },
    { 
      label: 'Last Updated', 
      value: typedWorker?.updated_on ? new Date(typedWorker.updated_on).toLocaleString() : 'N/A' 
    },
    { 
      label: 'Subdomain', 
      value: typedWorker?.subdomain?.enabled ? (
        <Badge variant="success">Enabled</Badge>
      ) : (
        <Badge variant="info">Disabled</Badge>
      )
    },
    { 
      label: 'Observability', 
      value: typedWorker?.observability?.enabled ? (
        <Badge variant="success">Enabled</Badge>
      ) : (
        <Badge variant="info">Disabled</Badge>
      )
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50/30 relative">
      <CrossHatchBackground pattern="large" />
      <div className="relative z-10 w-full px-6 py-8">
        <PageHeader
          title={typedWorker?.name || 'Worker'}
          description="Worker details and versions"
        />

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Worker Details (3/4 width) */}
          <div className="lg:col-span-3 space-y-4">
            <div className="border border-gray-200 rounded-md bg-white">
              <div className="p-3 border-b border-gray-200">
                <h3 className="text-xs font-semibold text-gray-900">Worker Information</h3>
              </div>
              <div className="p-3">
                <DetailsList items={workerDetails} />
              </div>
            </div>

            <div className="border border-gray-200 rounded-md bg-white">
              <div className="p-3 border-b border-gray-200">
                <h3 className="text-xs font-semibold text-gray-900">Versions</h3>
              </div>
              <div className="p-3">
                <div className="flex items-center justify-between mb-3">
                  <SearchBar
                    placeholder="Search versions..."
                    value={searchQuery}
                    onChange={setSearchQuery}
                  />
                  <div className="flex items-center gap-2">
                    <Button variant="secondary" size="sm" comingSoon>
                      Edit columns
                    </Button>
                  </div>
                </div>

                <DataTable
                  data={filteredVersions}
                  columns={columns}
                  onRowAction={(row) => {
                    router.push(`/workers/${workerId}/versions/${row.id}`);
                  }}
                />

                {pagination.total_pages > 1 && (
                  <Pagination
                    currentPage={pagination.page}
                    totalPages={pagination.total_pages}
                    totalItems={pagination.total}
                    itemsPerPage={pagination.per_page}
                    onPageChange={(page) => setPagination(prev => ({ ...prev, page }))}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Worker Stats Section (1/4 width) */}
          <div className="lg:col-span-1 space-y-3">
            <div className="border border-gray-200 rounded-md bg-white p-3">
              <h2 className="text-xs font-semibold text-gray-900 mb-3">Worker Stats</h2>
              <div className="space-y-2">
                <StatCard title="Status" value="Active" />
                <StatCard 
                  title="Subdomain" 
                  value={typedWorker?.subdomain?.enabled ? "Enabled" : "Disabled"}
                />
                <StatCard 
                  title="Observability" 
                  value={typedWorker?.observability?.enabled ? "Enabled" : "Disabled"}
                />
                <StatCard 
                  title="Created" 
                  value={typedWorker?.created_on ? new Date(typedWorker.created_on).toLocaleDateString() : 'N/A'} 
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
