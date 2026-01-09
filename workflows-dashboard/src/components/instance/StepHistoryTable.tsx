"use client";

import { Card, CardHeader, CardContent, Badge, DataTable, DateDisplay } from "@/components";
import type { ColumnDef } from "@tanstack/react-table";
import type { InstanceStep } from "@/types/instance";

interface StepHistoryTableProps {
  steps: InstanceStep[];
  selectedStep?: InstanceStep | null;
  onStepClick?: (step: InstanceStep) => void;
}

export function StepHistoryTable({ steps, selectedStep, onStepClick }: StepHistoryTableProps) {
  const stepColumns: ColumnDef<any>[] = [
    {
      accessorKey: "success",
      header: "Status",
      cell: ({ row }) => {
        const step = row.original;
        let status = "pending";
        let variant: "success" | "error" | "info" = "info";

        if (step.success === true) {
          status = "Completed";
          variant = "success";
        } else if (step.success === false) {
          status = "Failed";
          variant = "error";
        } else if (step.end === null || step.end === undefined) {
          status = "Running";
          variant = "info";
        } else {
          status = "Pending";
          variant = "info";
        }

        return <Badge variant={variant}>{status}</Badge>;
      }
    },
    {
      accessorKey: "name",
      header: "Step",
      cell: ({ row }) => (
        <div className="text-sm font-medium text-gray-900">
          {row.original.name}
        </div>
      )
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => (
        <Badge variant="info">{row.original.type || "step"}</Badge>
      )
    },
    {
      id: "start",
      header: "Start Time",
      cell: ({ row }) => (
        <div className="text-sm text-gray-900">
          {row.original.start
            ? <DateDisplay date={row.original.start} />
            : "N/A"}
        </div>
      )
    },
    {
      id: "end",
      header: "End Time",
      cell: ({ row }) => (
        <div className="text-sm text-gray-900">
          {row.original.end
            ? <DateDisplay date={row.original.end} />
            : "N/A"}
        </div>
      )
    },
    {
      id: "duration",
      header: "Duration",
      cell: ({ row }) => {
        const duration =
          row.original.start && row.original.end
            ? Math.round(
                new Date(row.original.end).getTime() -
                  new Date(row.original.start).getTime()
              )
            : null;
        return (
          <div className="text-sm text-gray-900">
            {duration ? `${duration} ms` : "N/A"}
          </div>
        );
      }
    },
    {
      id: "attempts",
      header: "Attempts",
      cell: ({ row }) => (
        <div className="text-sm text-gray-900">
          {row.original.attempts?.length || 1}
        </div>
      )
    }
  ];

  return (
    <Card>
      <CardHeader>
        <h2 className="text-xl font-bold text-gray-900">Step History</h2>
      </CardHeader>
      <CardContent>
        <DataTable 
          data={steps.map(step => ({
            ...step,
            isSelected: selectedStep?.name === step.name
          }))} 
          columns={stepColumns} 
          onRowAction={(step) => onStepClick?.(step)}
        />
      </CardContent>
    </Card>
  );
}

