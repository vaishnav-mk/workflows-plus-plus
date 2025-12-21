"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWorkflowLogs } from "@/hooks/useWorkflowLogs";
import { LogList } from "./LogList";
import { LogDetailsPanel } from "./LogDetailsPanel";
import { LogHeader } from "./LogHeader";
import type { WorkflowTailBottomSheetProps } from "@/types/workflow-logs";
import { convertLogsToEntries, filterLogs } from "@/utils/workflow-logs";

export function WorkflowTailBottomSheet({
  workflowName,
  instanceId,
  isOpen,
  onClose,
  onStatusUpdate
}: WorkflowTailBottomSheetProps) {
  const { logs, isConnected, isConnecting, error, clearLogs, reconnect } =
    useWorkflowLogs({
      workflowName,
      instanceId,
      enabled: isOpen,
      onStatusUpdate
    });

  const [filter, setFilter] = useState<string>("all");
  const [autoScroll, setAutoScroll] = useState(true);
  const logContainerRef = useRef<HTMLDivElement>(null);
  const [selectedLog, setSelectedLog] = useState<any>(null);

  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop =
        logContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const logEntries = convertLogsToEntries(logs);
  const filteredLogs = filterLogs(logEntries, filter);

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 overflow-hidden"
          onClick={onClose}
        >
          <motion.div
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-xl shadow-2xl"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-12 h-1 bg-gray-300 rounded-full"></div>
            </div>

            <LogHeader
              isConnected={isConnected}
              isConnecting={isConnecting}
              filteredLogsCount={filteredLogs.length}
              filter={filter}
              autoScroll={autoScroll}
              error={error}
              onFilterChange={setFilter}
              onAutoScrollChange={setAutoScroll}
              onClearLogs={clearLogs}
              onReconnect={reconnect}
              onClose={onClose}
            />

            {error && (
              <motion.div
                className="px-6 py-3 bg-red-50 border-b border-red-200"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
              >
                <div className="text-red-800 text-sm">{error}</div>
              </motion.div>
            )}

            <div className="flex h-96">
              <LogList
                filteredLogs={filteredLogs}
                selectedLog={selectedLog}
                isConnecting={isConnecting}
                onSelectLog={setSelectedLog}
                logContainerRef={logContainerRef}
              />

              <LogDetailsPanel
                selectedLog={selectedLog}
                onClose={() => setSelectedLog(null)}
              />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
