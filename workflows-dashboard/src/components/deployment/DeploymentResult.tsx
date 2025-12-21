"use client";

import { Card, Button, IconButton } from "@/components";
import { motion } from "framer-motion";
import type { DeploymentStateResponse } from "@/lib/api/types";
import { ROUTES } from "@/config/constants";
import { useRouter } from "next/navigation";

interface DeploymentResultProps {
  result: DeploymentStateResponse["result"];
  workflowId: string;
}

export function DeploymentResult({ result, workflowId }: DeploymentResultProps) {
  const router = useRouter();
  const instanceHref =
    workflowId && result?.instanceId
      ? `/workflows/${workflowId}/instances/${result.instanceId}`
      : null;

  const handleCopy = (text: string) => {
    navigator.clipboard?.writeText(text);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <Card className="p-6">
        <h3 className="text-sm font-semibold text-green-900">
          Deployment Successful
        </h3>
        <div className="mt-3 space-y-2 text-xs text-gray-700">
          {result?.workerUrl && (
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900">Worker URL: </span>
              <a
                href={result.workerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-orange-600 hover:underline break-all"
              >
                {result.workerUrl}
              </a>
              <IconButton
                size="xs"
                variant="ghost"
                aria-label="Copy worker URL"
                onClick={() => handleCopy(result.workerUrl)}
              >
                📋
              </IconButton>
            </div>
          )}
          {result.mcpUrl && (
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900">MCP URL: </span>
              <a
                href={result.mcpUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-orange-600 hover:underline break-all"
              >
                {result.mcpUrl}
              </a>
              <IconButton
                size="xs"
                variant="ghost"
                aria-label="Copy MCP URL"
                onClick={() => handleCopy(result.mcpUrl)}
              >
                📋
              </IconButton>
            </div>
          )}
          {result?.instanceId && (
            <div>
              <span className="font-medium text-gray-900">Instance ID: </span>
              <span className="font-mono">{result.instanceId}</span>
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-3 mt-4">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => router.push(ROUTES.BUILDER)}
          >
            Back to builder
          </Button>
          {result.workerUrl && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => window.open(result.workerUrl, "_blank")}
            >
              Open worker
            </Button>
          )}
          {result.mcpUrl && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => window.open(result.mcpUrl, "_blank")}
            >
              Open MCP endpoint
            </Button>
          )}
          {instanceHref && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => window.open(instanceHref, "_blank")}
            >
              View instance
            </Button>
          )}
        </div>
      </Card>
    </motion.div>
  );
}

