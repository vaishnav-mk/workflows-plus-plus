"use client";

import { Alert, AlertTitle, Button } from "@/components";
import { motion } from "framer-motion";
import type { DeploymentErrorInfo } from "@/types/deployment";
import { DEPLOYMENT, ROUTES } from "@/config/constants";
import { useRouter } from "next/navigation";

interface ErrorBannerProps {
  errorInfo: DeploymentErrorInfo;
  workflowId?: string;
}

export function ErrorBanner({ errorInfo, workflowId }: ErrorBannerProps) {
  const router = useRouter();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <Alert variant="error">
        <AlertTitle>Deployment failed</AlertTitle>
        <p className="mt-1 text-base font-semibold text-red-900">
          {errorInfo.shortMessage}
        </p>

        {errorInfo.cfCode === DEPLOYMENT.CLOUDFLARE_ERROR_CODE_WORKER_EXISTS && (
          <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
            <p className="text-xs sm:text-sm text-red-700 max-w-xl">
              This worker name already exists in your Cloudflare account.
              Try again with a different workflow ID so the worker name
              will be unique.
            </p>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                if (workflowId) {
                  const params = new URLSearchParams();
                  params.set("id", workflowId);
                  params.set("regen", "1");
                  router.push(`${ROUTES.BUILDER}?${params.toString()}`);
                } else {
                  router.push(ROUTES.BUILDER);
                }
              }}
            >
              Go back to builder with a new ID
            </Button>
          </div>
        )}

        {errorInfo.raw && errorInfo.raw !== errorInfo.shortMessage && (
          <details className="mt-3">
            <summary className="text-xs text-gray-500 cursor-pointer">
              View raw error
            </summary>
            <pre className="mt-2 text-xs bg-white p-2 rounded border overflow-auto">
              {errorInfo.raw}
            </pre>
          </details>
        )}
      </Alert>
    </motion.div>
  );
}

