"use client";

import { PageHeader, CrossHatchBackground } from "@/components";
import { Workflow, Server, Plus, Database } from "lucide-react";
import Link from "next/link";
import { WorkflowDetails, SampleWorkflows } from "@/components";
import {
  useWorkflowsQuery,
  useWorkersQuery,
  useWorkflowStartersQuery
} from "@/hooks/useWorkflowsQuery";

export default function HomePage() {
  useWorkflowStartersQuery();
  useWorkersQuery(1, 10);
  useWorkflowsQuery();

  const features = [
    {
      icon: Workflow,
      title: "Workflow Builder",
      description: "Build workflows with a drag and drop interface",
      href: "/builder",
      color: "bg-blue-50 text-blue-600"
    },
    {
      icon: Workflow,
      title: "Workflows",
      description: "Manage and monitor your deployed workflows",
      href: "/workflows",
      color: "bg-green-50 text-green-600"
    },
    {
      icon: Server,
      title: "Workers",
      description: "View and manage Cloudflare Workers",
      href: "/workers",
      color: "bg-purple-50 text-purple-600"
    },
    {
      icon: Database,
      title: "Databases",
      description: "Manage D1 databases and queries",
      href: "/databases",
      color: "bg-indigo-50 text-indigo-600"
    },
    {
      icon: Plus,
      title: "Create with AI",
      description: "Generate workflows using AI",
      href: "/create",
      color: "bg-orange-50 text-orange-600"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50/30 relative">
      <CrossHatchBackground pattern="large" />
      <div className="relative z-10 w-full px-6 py-8">
        <div className="max-w-6xl mx-auto">
          <PageHeader
            title="Workflows Dashboard"
            description="Build, deploy, and manage Cloudflare Workflows with an intuitive drag-and-drop interface"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <Link
                  key={feature.href}
                  href={feature.href}
                  className="no-underline"
                >
                  <div className="border border-gray-200 rounded-md bg-white hover:border-orange-300 hover:bg-orange-50/20 transition-all p-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-1.5 rounded flex-shrink-0 ${feature.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-gray-900 mb-0.5">
                          {feature.title}
                        </h3>
                        <p className="text-xs text-gray-600 line-clamp-2">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          <WorkflowDetails />

          <div className="mt-4">
            <SampleWorkflows />
          </div>
        </div>
      </div>
    </div>
  );
}
