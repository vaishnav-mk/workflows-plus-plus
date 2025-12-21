import type { LogEntry } from "@/types/workflow-logs";

export function convertLogsToEntries(logs: any[]): LogEntry[] {
  return logs.map((log, index) => ({
    id: `${log.timestamp || Date.now()}-${index}`,
    type: log.type,
    nodeId: log.nodeId,
    nodeName: log.nodeName,
    nodeType: log.nodeType,
    timestamp: log.timestamp || Date.now(),
    message:
      log.error ||
      `${log.nodeName} ${log.type.replace("WF_NODE_", "").toLowerCase()}`,
    output: log.output,
    error: log.error,
    success: log.success,
    status: log.status
  }));
}

export function filterLogs(logEntries: LogEntry[], filter: string): LogEntry[] {
  return logEntries.filter((log) => {
    if (filter === "all") return true;
    if (filter === "errors") return log.type === "WF_NODE_ERROR" || log.error;
    if (filter === "starts") return log.type === "WF_NODE_START";
    if (filter === "ends") return log.type === "WF_NODE_END";
    if (filter === "status") return log.type === "WF_STATUS_UPDATE";
    return true;
  });
}

export function formatLogTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    fractionalSecondDigits: 3
  });
}

export function getLogColor(type: string, success?: boolean): string {
  if (type === "WF_NODE_ERROR" || !success) return "text-red-600";
  if (type === "WF_NODE_END") return "text-green-600";
  if (type === "WF_NODE_START") return "text-blue-600";
  if (type === "WF_STATUS_UPDATE") return "text-purple-600";
  return "text-gray-600";
}

