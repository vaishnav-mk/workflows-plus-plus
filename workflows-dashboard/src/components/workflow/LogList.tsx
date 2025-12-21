"use client";

import { motion } from "framer-motion";
import { LogsLoader } from "@/components/ui/Loader";
import { getLogColor } from "@/utils/workflow-logs";
import type { LogEntry } from "@/types/workflow-logs";
import { DateDisplay } from "@/components/ui/DateDisplay";

interface LogListProps {
  filteredLogs: LogEntry[];
  selectedLog: LogEntry | null;
  isConnecting: boolean;
  onSelectLog: (log: LogEntry) => void;
  logContainerRef: React.RefObject<HTMLDivElement | null>;
}

export function LogList({
  filteredLogs,
  selectedLog,
  isConnecting,
  onSelectLog,
  logContainerRef
}: LogListProps) {
  if (filteredLogs.length === 0) {
    return isConnecting ? (
      <LogsLoader text="Connecting to workflow tail..." />
    ) : (
      <div className="p-6 text-center text-gray-500">
        <div className="w-12 h-12 mx-auto mb-3 text-gray-300">
          <svg fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className="text-sm">No logs available</div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto" ref={logContainerRef}>
      <div className="divide-y divide-gray-100">
        {filteredLogs.map((log, index) => (
          <motion.div
            key={log.id}
            className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
              selectedLog?.id === log.id
                ? "bg-blue-50 border-l-4 border-blue-400"
                : ""
            }`}
            onClick={() => onSelectLog(log)}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <div className="flex items-start space-x-3">
              {(() => {
                switch (log.type) {
                  case "WF_NODE_START":
                    return (
                      <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                        <svg
                          className="w-3 h-3 text-blue-600"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    );
                  case "WF_NODE_END":
                    return (
                      <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                        <svg
                          className="w-3 h-3 text-green-600"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    );
                  case "WF_NODE_ERROR":
                    return (
                      <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center">
                        <svg
                          className="w-3 h-3 text-red-600"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    );
                  case "WF_STATUS_UPDATE":
                    return (
                      <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center">
                        <svg
                          className="w-3 h-3 text-purple-600"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                        </svg>
                      </div>
                    );
                  default:
                    return (
                      <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
                        <svg
                          className="w-3 h-3 text-gray-600"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    );
                }
              })()}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span
                    className={`text-sm font-medium ${getLogColor(log.type, log.success)}`}
                  >
                    {log.nodeName || log.type}
                  </span>
                  <span className="text-xs text-gray-500 font-mono">
                    <DateDisplay date={log.timestamp} />
                  </span>
                </div>
                <div className="text-sm text-gray-700 mt-1">{log.message}</div>
                {log.nodeId && (
                  <div className="text-xs text-gray-500 mt-1 flex items-center space-x-2">
                    <span className="bg-gray-100 px-2 py-0.5 rounded text-xs">
                      {log.nodeType}
                    </span>
                    <span>ID: {log.nodeId}</span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

