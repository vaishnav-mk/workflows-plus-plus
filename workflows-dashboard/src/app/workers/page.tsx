'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { InlineLoader } from '../../components/ui/Loader';
import { useWorkersQuery } from '../../hooks/useWorkflowsQuery';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client';
import { PageHeader, SearchBar, DataTable, UsageStatsPanel, Card, Pagination, Alert, AlertTitle, Button } from '@/components';
import { type ColumnDef } from '@tanstack/react-table';
import Link from 'next/link';
import type { Worker } from '@/lib/api/types';

export default function WorkersPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    per_page: 10,
    total: 0,
    total_pages: 0
  });

  const { data: workersResult, isLoading: loading, isFetching, error: queryError } = useWorkersQuery(pagination.page, pagination.per_page);
  
  const workers = useMemo(() => workersResult?.data || [], [workersResult?.data]);
  const error = queryError instanceof Error ? queryError.message : (queryError ? String(queryError) : null);
  
  // Update pagination when data changes
  useEffect(() => {
    if (workersResult?.pagination) {
      const newPagination = workersResult.pagination;
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
  }, [workersResult]);

  // Prefetch next page when data is available
  useEffect(() => {
    if (!workersResult?.pagination) return;
    
    const currentPage = workersResult.pagination.page;
    const totalPages = workersResult.pagination.total_pages;
    const perPage = workersResult.pagination.per_page;

    // Prefetch next page if available
    if (currentPage < totalPages) {
      const nextPage = currentPage + 1;
      queryClient.prefetchQuery({
        queryKey: ['workers', nextPage, perPage],
        queryFn: async () => {
          const result = await apiClient.getWorkers(nextPage, perPage);
          if (!result.success) {
            throw new Error(result.error || 'Failed to fetch workers');
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
        queryKey: ['workers', prevPage, perPage],
        queryFn: async () => {
          const result = await apiClient.getWorkers(prevPage, perPage);
          if (!result.success) {
            throw new Error(result.error || 'Failed to fetch workers');
          }
          return {
            data: result.data || [],
            pagination: result.pagination,
          };
        },
        staleTime: 5 * 60 * 1000,
      });
    }
  }, [workersResult, queryClient]);

  const filteredWorkers = useMemo(() => {
    if (!searchQuery) return workers;
    const query = searchQuery.toLowerCase();
    return workers.filter((w: any) => 
      w.name.toLowerCase().includes(query) ||
      w.id.toLowerCase().includes(query)
    );
  }, [workers, searchQuery]);

  const columns: ColumnDef<Worker>[] = useMemo(() => [
    {
      accessorKey: 'name',
      header: 'Worker',
      cell: ({ row }) => (
        <Link 
          href={`/workers/${row.original.id}/versions`}
          className="text-sm font-medium text-blue-600 hover:text-blue-500"
        >
          {row.original.name}
        </Link>
      ),
    },
    {
      accessorKey: 'created_on',
      header: 'Created',
      cell: ({ row }) => (
        <div className="text-sm text-gray-500">
          {new Date(row.original.created_on).toLocaleDateString()}
        </div>
      ),
    },
    {
      accessorKey: 'updated_on',
      header: 'Modified',
      cell: ({ row }) => (
        <div className="text-sm text-gray-500">
          {new Date(row.original.updated_on || row.original.created_on).toLocaleDateString()}
        </div>
      ),
    },
  ], []);

  const usageStats = [
    { title: 'Total Workers', value: pagination.total.toString(), infoTooltip: 'Total number of workers' },
    { title: 'Active Workers', value: pagination.total.toString(), infoTooltip: 'Number of active workers' },
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
        title="Workers"
        description="Cloudflare Workers for serverless computing"
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Workers Table (3/4 width) */}
        <div className="lg:col-span-3">
          <Card>
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <SearchBar
                    placeholder="Search workers..."
                    value={searchQuery}
                    onChange={setSearchQuery}
                  />
                  {isFetching && <InlineLoader />}
                </div>
                <div className="flex items-center gap-3">
                  <Button variant="secondary" size="sm" comingSoon>
                    Edit columns
                  </Button>
                </div>
              </div>

              {loading && !workersResult ? (
                <div className="flex items-center justify-center py-12">
                  <InlineLoader text="Loading workers..." />
                </div>
              ) : (
                <>
                  <DataTable
                    data={filteredWorkers}
                    columns={columns}
                    onRowAction={(row) => {
                      router.push(`/workers/${row.id}/versions`);
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
