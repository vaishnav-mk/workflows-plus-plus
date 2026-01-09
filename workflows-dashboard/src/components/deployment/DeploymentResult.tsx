"use client";

import { Card, Button, CopyButton } from "@/components";
import { motion } from "framer-motion";
import type { DeploymentStateResponse } from "@/lib/api/types";
import { ROUTES } from "@/config/constants";
import { useRouter } from "next/navigation";

interface DeploymentResultProps {
  result: DeploymentStateResponse["result"];
  workflowId: string;
}

export function DeploymentResult({
  result,
  workflowId
}: DeploymentResultProps) {
  const router = useRouter();
  const instanceHref =
    workflowId && result?.instanceId
      ? `/workflows/${workflowId}/instances/${result.instanceId}`
      : null;

  const workerUrl =
    result?.workerUrl?.replace(".workers.dev/", ".wishee.workers.dev/") || "";
  const mcpUrl =
    result?.mcpUrl?.replace(".workers.dev/", ".wishee.workers.dev/") || "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <Card className="bg-green-50 border-green-200">
        <div className="px-6 py-4 bg-green-100/50 border-b border-green-200">
          <h3 className="text-lg font-semibold text-green-900">
            Deployment Successful
          </h3>
        </div>
        <div className="p-6 space-y-3">
          {workerUrl && (
            <div>
              <span className="text-sm font-medium text-gray-700 block mb-1">
                Worker URL
              </span>
              <div className="relative">
                <a
                  href={workerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block px-3 py-2 pr-10 bg-white border border-gray-300 rounded text-sm text-blue-600 hover:bg-gray-50 truncate"
                >
                  {workerUrl}
                </a>
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                  <CopyButton text={workerUrl} size="sm" />
                </div>
              </div>
            </div>
          )}
          {mcpUrl && (
            <div>
              <span className="text-sm font-medium text-gray-700 block mb-1">
                MCP URL
              </span>
              <div className="relative">
                <a
                  href={mcpUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block px-3 py-2 pr-10 bg-white border border-gray-300 rounded text-sm text-blue-600 hover:bg-gray-50 truncate"
                >
                  {mcpUrl}
                </a>
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                  <CopyButton text={mcpUrl} size="sm" />
                </div>
              </div>
            </div>
          )}
          {result?.instanceId && (
            <div>
              <span className="text-sm font-medium text-gray-700 block mb-1">
                Instance ID
              </span>
              <div className="relative">
                <div className="px-3 py-2 pr-10 bg-white border border-gray-300 rounded text-sm flex items-center gap-2">
                  {result.instanceId}
                </div>
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                  <CopyButton text={result.instanceId} size="sm" />
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="px-6 pb-6 pt-2">
          <div className="flex flex-wrap gap-3 pt-4 border-t border-green-200">
          {workerUrl && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => window.open(workerUrl, "_blank")}
            >
              Open Worker
            </Button>
          )}
          {instanceHref && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => router.push(instanceHref)}
            >
              View Instance
            </Button>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => router.push(ROUTES.BUILDER)}
          >
            Back to Builder
          </Button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
