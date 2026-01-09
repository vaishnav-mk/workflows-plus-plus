"use client";

import { PageHeader, Card, Button } from "@/components";
import { AlertCircle } from "lucide-react";
import { ROUTES } from "@/config/constants";
import { useRouter } from "next/navigation";

export function NoDeploymentId() {
  const router = useRouter();

  return (
    <div className="w-full px-6 py-8">
      <PageHeader
        title="Deployment"
        description="View the status and progress of your workflow deployment."
      />
      <div className="max-w-3xl mt-6">
        <Card>
          <div className="p-6">
            <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-yellow-50">
              <AlertCircle className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">
                Deployment ID required
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                Provide a deployment ID in the URL query parameter to view
                deployment status.
              </p>
              <div className="mt-4">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => router.push(ROUTES.BUILDER)}
                >
                  Go to Builder
                </Button>
              </div>
            </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

