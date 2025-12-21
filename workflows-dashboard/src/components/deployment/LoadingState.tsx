"use client";

import { Card, Loader } from "@/components";
import { motion } from "framer-motion";

interface LoadingStateProps {
  isConnected: boolean;
  hasNoDeployment: boolean;
}

export function LoadingState({ isConnected, hasNoDeployment }: LoadingStateProps) {
  const title = isConnected ? "Waiting for deployment..." : "Connecting...";
  const description = hasNoDeployment
    ? "No deployment was found for this ID yet. Once a deployment is started, its progress will appear here."
    : isConnected
      ? "The deployment is being initialized. Progress updates will appear shortly."
      : "Establishing connection to the deployment server...";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="p-6">
        <div className="flex flex-col items-center justify-center py-12">
          <Loader variant="spinner" size="lg" className="text-[#056DFF]" />
          <h3 className="mt-4 text-lg font-semibold text-gray-900">{title}</h3>
          <p className="mt-2 text-sm text-gray-600 text-center max-w-md">{description}</p>
        </div>
      </Card>
    </motion.div>
  );
}

