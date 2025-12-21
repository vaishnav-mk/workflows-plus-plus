'use client';

import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Spinner } from '@/components';
import { useWorkerQuery, useWorkerVersionsQuery } from '../../../../hooks/useWorkflowsQuery';
import { PageHeader, SearchBar, DataTable, Card, Pagination, Alert, AlertTitle } from '@/components';
import { type ColumnDef } from '@tanstack/react-table';
import Link from 'next/link';

interface Version {
  id: string;
  created_on: string;
  number: number;
}

export default function WorkerVersionsPage() {
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
  if (versionsResult?.pagination) {
    if (JSON.stringify(versionsResult.pagination) !== JSON.stringify(pagination)) {
      setPagination(versionsResult.pagination);
    }
  }

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
          className="text-sm font-medium text-blue-600 hover:text-blue-500"
        >
          Version {row.original.number}
        </Link>
      ),
    },
    {
      accessorKey: 'id',
      header: 'Version ID',
      cell: ({ row }) => (
        <div className="text-sm text-gray-500 font-mono">
          {row.original.id.substring(0, 8)}...
        </div>
      ),
    },
    {
      accessorKey: 'created_on',
      header: 'Created',
      cell: ({ row }) => (
        <div className="text-sm text-gray-500">
          {new Date(row.original.created_on).toLocaleString()}
        </div>
      ),
    },
  ], [workerId]);

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

  return (
    <div className="w-full px-6 py-8">
      <PageHeader
        title={worker?.name || 'Worker'}
        description="Worker versions and deployment history"
      />

      <Card>
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <SearchBar
              placeholder="Search versions..."
              value={searchQuery}
              onChange={setSearchQuery}
            />
            <div className="flex items-center gap-3">
              <button className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                Edit columns
              </button>
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
      </Card>
    </div>
  );
}
