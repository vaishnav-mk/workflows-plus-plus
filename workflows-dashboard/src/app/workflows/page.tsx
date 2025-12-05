'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWorkflowsQuery } from '../../hooks/useWorkflowsQuery';
import { InlineLoader } from '../../components/ui/Loader';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client';
import { PageHeader, SearchBar, DataTable, UsageStatsPanel, Card, Pagination, Alert, AlertTitle } from '@/components';
import { type ColumnDef } from '@tanstack/react-table';
import { MoreVerticalIcon } from '@/components/ui';
import Link from 'next/link';

interface Workflow {
  id: string;
  name: string;
  description?: string;
  status?: string;
  created_on?: string;
  modified_on?: string;
  version?: number;
}

export default function WorkflowsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    per_page: 10,
    total: 0,
    total_pages: 0
  });
  
  // Use React Query for caching - data is cached and won't refetch on page changes
  const { data: workflowsResult, isLoading: loading, isFetching, error: queryError } = useWorkflowsQuery(pagination.page, pagination.per_page);
  
  const workflows = workflowsResult?.data || [];
  const error = queryError ? (queryError instanceof Error ? queryError.message : 'Failed to fetch workflows') : null;
  
  // Update pagination when data changes
  useEffect(() => {
    if (workflowsResult?.pagination) {
      const newPagination = workflowsResult.pagination;
      setPagination(prev => {
        // Only update if values actually changed to avoid unnecessary re-renders
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
  }, [workflowsResult]);

  // Prefetch next page when data is available
  useEffect(() => {
    if (!workflowsResult?.pagination) return;
    
    const currentPage = workflowsResult.pagination.page;
    const totalPages = workflowsResult.pagination.total_pages;
    const perPage = workflowsResult.pagination.per_page;

    // Prefetch next page if available
    if (currentPage < totalPages) {
      const nextPage = currentPage + 1;
      queryClient.prefetchQuery({
        queryKey: ['workflows', nextPage, perPage],
        queryFn: async () => {
          const result = await apiClient.getWorkflows(nextPage, perPage);
          if (!result.success) {
            throw new Error(result.error || 'Failed to fetch workflows');
          }
          return {
            data: result.data || [],
            pagination: result.pagination,
          };
        },
        staleTime: 5 * 60 * 1000,
      });
    }
    
    // Also prefetch previous page if not on first page
    if (currentPage > 1) {
      const prevPage = currentPage - 1;
      queryClient.prefetchQuery({
        queryKey: ['workflows', prevPage, perPage],
        queryFn: async () => {
          const result = await apiClient.getWorkflows(prevPage, perPage);
          if (!result.success) {
            throw new Error(result.error || 'Failed to fetch workflows');
          }
          return {
            data: result.data || [],
            pagination: result.pagination,
          };
        },
        staleTime: 5 * 60 * 1000,
      });
    }
  }, [workflowsResult, queryClient]);

  const filteredWorkflows = useMemo(() => {
    if (!searchQuery) return workflows;
    const query = searchQuery.toLowerCase();
    return workflows.filter((w: Workflow) => 
      w.name.toLowerCase().includes(query) ||
      w.description?.toLowerCase().includes(query)
    );
  }, [workflows, searchQuery]);

  const columns: ColumnDef<Workflow>[] = useMemo(() => [
    {
      accessorKey: 'name',
      header: 'Workflow',
      cell: ({ row }) => (
        <Link 
          href={`/workflows/${row.original.name}/instances`}
          className="text-sm font-medium text-blue-600 hover:text-blue-500"
        >
          {row.original.name}
        </Link>
      ),
    },
    {
      id: 'inactive',
      header: () => <div>Inactive</div>,
      cell: () => <div className="text-sm text-gray-500">0 instances</div>,
      meta: { align: 'center' },
    },
    {
      id: 'running',
      header: () => <div>Running</div>,
      cell: () => <div className="text-sm text-gray-500">0 instances</div>,
      meta: { align: 'center' },
    },
    {
      id: 'ended',
      header: () => <div>Ended</div>,
      cell: () => <div className="text-sm text-gray-500">1 instances</div>,
      meta: { align: 'center' },
    },
    {
      id: 'errored',
      header: () => <div>Errored</div>,
      cell: () => <div className="text-sm text-gray-500">1 instances</div>,
      meta: { align: 'center' },
    },
  ], []);

  const usageStats = [
    { title: 'Total CPU time', value: '~ 14 ms', infoTooltip: 'Total CPU time used by workflows' },
    { title: 'Total Wall time', value: '~ 997 ms', infoTooltip: 'Total wall clock time' },
    { title: 'Total Retries', value: '12', infoTooltip: 'Total number of retries' },
  ];

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
        title="Workflows"
        description="Durable Execution Engine for Cloudflare Workers"
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Workflows Table (3/4 width) */}
        <div className="lg:col-span-3">
          <Card>
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <SearchBar
                    placeholder="Search workflows..."
                    value={searchQuery}
                    onChange={setSearchQuery}
                  />
                  {isFetching && <InlineLoader />}
                </div>
                <div className="flex items-center gap-3">
                  <button className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                    Edit columns
                  </button>
                </div>
              </div>

              {loading && !workflowsResult ? (
                <div className="flex items-center justify-center py-12">
                  <InlineLoader text="Loading workflows..." />
                </div>
              ) : (
                <>
                  <DataTable
                    data={filteredWorkflows}
                    columns={columns}
                    onRowAction={(row) => {
                      router.push(`/workflows/${row.name}/instances`);
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
                </>
              )}
            </div>
          </Card>
        </div>

        {/* Usage Section (1/4 width) */}
        <div className="lg:col-span-1">
          <UsageStatsPanel
            title="Usage"
            dateRange="October 8 - October 15"
            stats={usageStats}
          />
        </div>
      </div>
    </div>
  );
}
