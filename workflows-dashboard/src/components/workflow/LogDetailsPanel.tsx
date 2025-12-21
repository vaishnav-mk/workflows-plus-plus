"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { LogEntry } from "@/types/workflow-logs";
import { DateDisplay } from "@/components/ui/DateDisplay";

interface LogDetailsPanelProps {
  selectedLog: LogEntry | null;
  onClose: () => void;
}

export function LogDetailsPanel({
  selectedLog,
  onClose
}: LogDetailsPanelProps) {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <AnimatePresence>
      {selectedLog && (
        <motion.div
          className="w-96 border-l border-gray-200 bg-gray-50"
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 30, stiffness: 300 }}
        >
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-900">Log Details</h4>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-200 transition-colors"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>

          <div className="p-4 space-y-4 overflow-y-auto max-h-80">
            <div>
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                Type
              </div>
              <div className="text-sm text-gray-900 bg-white px-3 py-2 rounded-md border">
                {selectedLog.type}
              </div>
            </div>

            {selectedLog.nodeName && (
              <div>
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                  Node
                </div>
                <div className="text-sm text-gray-900 bg-white px-3 py-2 rounded-md border">
                  {selectedLog.nodeName}
                </div>
              </div>
            )}

            <div>
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                Timestamp
              </div>
              <div className="text-sm text-gray-900 bg-white px-3 py-2 rounded-md border font-mono">
                <DateDisplay date={selectedLog.timestamp} />
              </div>
            </div>

            {selectedLog.output && (
              <div>
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                  Output
                </div>
                <div className="bg-white border rounded-md">
                  <div className="p-3 text-xs overflow-auto max-h-32">
                    <pre className="whitespace-pre-wrap">
                      {JSON.stringify(selectedLog.output, null, 2)}
                    </pre>
                  </div>
                  <div className="px-3 py-2 border-t bg-gray-50">
                    <button
                      onClick={() =>
                        copyToClipboard(
                          JSON.stringify(selectedLog.output, null, 2)
                        )
                      }
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Copy Output
                    </button>
                  </div>
                </div>
              </div>
            )}

            {selectedLog.error && (
              <div>
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                  Error
                </div>
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <div className="text-sm text-red-800">{selectedLog.error}</div>
                </div>
              </div>
            )}

            {selectedLog.status && (
              <div>
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                  Status
                </div>
                <div className="bg-white border rounded-md">
                  <div className="p-3 text-xs overflow-auto max-h-32">
                    <pre className="whitespace-pre-wrap">
                      {JSON.stringify(selectedLog.status, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

