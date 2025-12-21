"use client";

import { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { Spinner } from "@/components";
import {
  PageHeader,
  DataTable,
  Card,
  StatCard,
  Tabs,
  Tab,
  Dropdown,
  Alert,
  AlertTitle,
  Pagination,
  DateDisplay
} from "@/components";
import { type ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui";
import Link from "next/link";
import { useInstancesQuery } from "../../../../hooks/useWorkflowsQuery";

interface Instance {
  id: string;
  status: string;
  created_on: string;
  modified_on: string;
  started_on?: string;
  ended_on?: string;
  version_id?: string;
  workflow_id?: string;
  result?: any;
  error?: string;
}

export default function WorkflowInstancesPage() {
  const params = useParams();
  const router = useRouter();
  const workflowName = params.workflowId as string;
  const [activeTab, setActiveTab] = useState(0);

  const {
    data: instancesData = [],
    isLoading: loading,
    error: queryError
  } = useInstancesQuery(workflowName);
  const instances = instancesData as Instance[];
  const error =
    queryError instanceof Error
      ? queryError.message
      : queryError
        ? String(queryError)
        : null;

  const getStatusBadge = (status: string) => {
    const statusLower = status.toLowerCase();
    let variant: "success" | "error" | "warning" | "info" = "info";

    if (statusLower === "completed" || statusLower === "success") {
      variant = "success";
    } else if (
      statusLower === "failed" ||
      statusLower === "error" ||
      statusLower === "errored"
    ) {
      variant = "error";
    } else if (statusLower === "running" || statusLower === "pending") {
      variant = "warning";
    }

    return (
      <Badge variant={variant}>
        {status === "errored" ? "Errored" : status}
      </Badge>
    );
  };

  const columns: ColumnDef<Instance>[] = useMemo(
    () => [
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => getStatusBadge(row.original.status)
      },
      {
        accessorKey: "id",
        header: "Instance ID",
        cell: ({ row }) => (
          <Link
            href={`/workflows/${workflowName}/instances/${row.original.id}`}
            className="text-sm font-medium text-blue-600 hover:text-blue-500"
          >
            {row.original.id.substring(0, 8)}...
          </Link>
        )
      },
      {
        id: "start_time",
        header: "Start time",
        cell: ({ row }) => (
          <div className="text-sm text-gray-900">
            {row.original.created_on
              ? <DateDisplay date={row.original.created_on} />
              : "N/A"}
          </div>
        )
      },
      {
        id: "end_time",
        header: "End time",
        cell: ({ row }) => (
          <div className="text-sm text-gray-900">
            {row.original.modified_on
              ? <DateDisplay date={row.original.modified_on} />
              : "N/A"}
          </div>
        )
      },
      {
        id: "wall_time",
        header: "Wall time",
        cell: () => <div className="text-sm text-gray-900">~1s</div>
      },
      {
        id: "cpu_time",
        header: "CPU time",
        cell: () => <div className="text-sm text-gray-900">—</div>
      },
      {
        id: "last_modified",
        header: "Last modified",
        cell: ({ row }) => {
          if (!row.original.modified_on)
            return <div className="text-sm text-gray-900">N/A</div>;
          const minutesAgo = Math.floor(
            (Date.now() - new Date(row.original.modified_on).getTime()) /
              (1000 * 60)
          );
          return (
            <div className="text-sm text-gray-900">
              {minutesAgo} minutes ago
            </div>
          );
        }
      }
    ],
    [workflowName]
  );

  const instanceStats = [
    { title: "Queued", value: "0", infoTooltip: "Number of queued instances" },
    {
      title: "Running",
      value: "0",
      infoTooltip: "Number of running instances"
    },
    { title: "Paused", value: "0", infoTooltip: "Number of paused instances" },
    { title: "Waiting", value: "0", infoTooltip: "Number of waiting instances" }
  ];

  const endedStats = [
    {
      title: "Complete",
      value: "1",
      infoTooltip: "Number of completed instances"
    },
    {
      title: "Errored",
      value: "0",
      infoTooltip: "Number of errored instances"
    },
    {
      title: "Terminated",
      value: "0",
      infoTooltip: "Number of terminated instances"
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Spinner size="lg" />
          <p className="text-sm text-gray-600">Loading workflow instances...</p>
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
        title={workflowName}
        description="Workflow instances and execution history"
      />

      <Tabs activeTab={activeTab} onTabChange={setActiveTab} className="mb-6">
        <Tab>Instances</Tab>
        <Tab>Metrics</Tab>
        <Tab>Settings</Tab>
      </Tabs>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card>
          <div className="p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Instances
            </h3>
            <div className="grid grid-cols-4 gap-4">
              {instanceStats.map((stat, index) => (
                <StatCard key={index} {...stat} />
              ))}
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Ended Instances
            </h3>
            <div className="grid grid-cols-3 gap-4">
              {endedStats.map((stat, index) => (
                <StatCard key={index} {...stat} />
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Instances Table */}
      <Card>
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Dropdown
                options={[
                  { value: "7", label: "Past 7 days" },
                  { value: "30", label: "Past 30 days" }
                ]}
                value="7"
                onChange={() => {}}
                disabled
              />
              <Dropdown
                options={[
                  { value: "all", label: "All" },
                  { value: "running", label: "Running" },
                  { value: "completed", label: "Completed" }
                ]}
                value="all"
                onChange={() => {}}
                disabled
              />
            </div>
          </div>

          <DataTable
            data={instances}
            columns={columns}
            onRowAction={(row) => {
              router.push(`/workflows/${workflowName}/instances/${row.id}`);
            }}
          />

          {instances.length > 25 && (
            <div className="mt-4">
              <Pagination
                currentPage={1}
                totalPages={Math.ceil(instances.length / 25)}
                totalItems={instances.length}
                itemsPerPage={25}
                onPageChange={(page) => {
                  console.log("Page change:", page);
                }}
                showItemsPerPage={true}
                clientItemsPerPage={25}
                onItemsPerPageChange={(itemsPerPage) => {
                  console.log("Items per page change:", itemsPerPage);
                }}
              />
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
