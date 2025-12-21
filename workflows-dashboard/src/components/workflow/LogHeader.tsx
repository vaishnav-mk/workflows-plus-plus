"use client";

interface LogHeaderProps {
  isConnected: boolean;
  isConnecting: boolean;
  filteredLogsCount: number;
  filter: string;
  autoScroll: boolean;
  error: string | null;
  onFilterChange: (filter: string) => void;
  onAutoScrollChange: (autoScroll: boolean) => void;
  onClearLogs: () => void;
  onReconnect: () => void;
  onClose: () => void;
}

export function LogHeader({
  isConnected,
  isConnecting,
  filteredLogsCount,
  filter,
  autoScroll,
  error,
  onFilterChange,
  onAutoScrollChange,
  onClearLogs,
  onReconnect,
  onClose
}: LogHeaderProps) {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          <div
            className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`}
          ></div>
          <span className="text-sm font-medium text-gray-700">
            {isConnecting
              ? "Connecting..."
              : isConnected
                ? "Workflow Tail"
                : "Disconnected"}
          </span>
        </div>
        <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
          {filteredLogsCount} logs
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <select
          value={filter}
          onChange={(e) => onFilterChange(e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white focus:ring-2 focus:ring-[#056DFF] focus:border-[#056DFF]"
        >
          <option value="all">All Logs</option>
          <option value="starts">Node Starts</option>
          <option value="ends">Node Ends</option>
          <option value="errors">Errors</option>
          <option value="status">Status Updates</option>
        </select>

        <label className="flex items-center text-sm text-gray-600">
          <input
            type="checkbox"
            checked={autoScroll}
            onChange={(e) => onAutoScrollChange(e.target.checked)}
            className="mr-2 rounded border-gray-300 text-[#056DFF] focus:ring-[#056DFF]"
          />
          Auto-scroll
        </label>

        <button
          onClick={onClearLogs}
          className="text-sm text-gray-600 hover:text-gray-800 px-3 py-1.5 rounded-md hover:bg-gray-100 transition-colors"
        >
          Clear
        </button>

        {error && (
          <button
            onClick={onReconnect}
            className="text-sm text-[#056DFF] hover:text-[#0456CC] px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
          >
            Reconnect
          </button>
        )}

        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100 transition-colors"
        >
          <svg
            className="w-5 h-5"
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
  );
}
