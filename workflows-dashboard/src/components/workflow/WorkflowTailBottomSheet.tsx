'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWorkflowLogs } from '../../hooks/useWorkflowLogs';
import { LogsLoader } from '../ui/Loader';

interface WorkflowTailBottomSheetProps {
  workflowName: string;
  instanceId: string;
  isOpen: boolean;
  onClose: () => void;
  onStatusUpdate?: (status: any) => void;
}

interface LogEntry {
  id: string;
  type: string;
  nodeId?: string;
  nodeName?: string;
  nodeType?: string;
  timestamp: number;
  message?: string;
  output?: any;
  error?: string;
  success?: boolean;
  status?: any;
}

export function WorkflowTailBottomSheet({ 
  workflowName, 
  instanceId, 
  isOpen,
  onClose,
  onStatusUpdate
}: WorkflowTailBottomSheetProps) {
  const { logs, isConnected, isConnecting, error, clearLogs, reconnect } = useWorkflowLogs({
    workflowName,
    instanceId,
    enabled: isOpen,
    onStatusUpdate
  });

  const [filter, setFilter] = useState<string>('all');
  const [autoScroll, setAutoScroll] = useState(true);
  const logContainerRef = useRef<HTMLDivElement>(null);
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  // Convert logs to display format
  const logEntries: LogEntry[] = logs.map((log, index) => ({
    id: `${log.timestamp || Date.now()}-${index}`,
    type: log.type,
    nodeId: log.nodeId,
    nodeName: log.nodeName,
    nodeType: log.nodeType,
    timestamp: log.timestamp || Date.now(),
    message: log.error || `${log.nodeName} ${log.type.replace('WF_NODE_', '').toLowerCase()}`,
    output: log.output,
    error: log.error,
    success: log.success,
    status: log.status
  }));

  // Filter logs based on selected filter
  const filteredLogs = logEntries.filter(log => {
    if (filter === 'all') return true;
    if (filter === 'errors') return log.type === 'WF_NODE_ERROR' || log.error;
    if (filter === 'starts') return log.type === 'WF_NODE_START';
    if (filter === 'ends') return log.type === 'WF_NODE_END';
    if (filter === 'status') return log.type === 'WF_STATUS_UPDATE';
    return true;
  });

  const getLogIcon = (type: string) => {
    switch (type) {
      case 'WF_NODE_START':
        return (
          <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
            <svg className="w-3 h-3 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
            </svg>
          </div>
        );
      case 'WF_NODE_END':
        return (
          <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
            <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        );
      case 'WF_NODE_ERROR':
        return (
          <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center">
            <svg className="w-3 h-3 text-red-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
        );
      case 'WF_STATUS_UPDATE':
        return (
          <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center">
            <svg className="w-3 h-3 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
            <svg className="w-3 h-3 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
            </svg>
          </div>
        );
    }
  };

  const getLogColor = (type: string, success?: boolean) => {
    if (type === 'WF_NODE_ERROR' || !success) return 'text-red-600';
    if (type === 'WF_NODE_END') return 'text-green-600';
    if (type === 'WF_NODE_START') return 'text-blue-600';
    if (type === 'WF_STATUS_UPDATE') return 'text-purple-600';
    return 'text-gray-600';
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden" onClick={onClose}>
          {/* Bottom Sheet */}
          <motion.div 
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-xl shadow-2xl"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-12 h-1 bg-gray-300 rounded-full"></div>
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="text-sm font-medium text-gray-700">
                    {isConnecting ? 'Connecting...' : isConnected ? 'Workflow Tail' : 'Disconnected'}
                  </span>
                </div>
                <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  {filteredLogs.length} logs
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="text-sm border border-gray-300 rounded-md px-3 py-1.5 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                    onChange={(e) => setAutoScroll(e.target.checked)}
                    className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  Auto-scroll
                </label>
                
                <button
                  onClick={clearLogs}
                  className="text-sm text-gray-600 hover:text-gray-800 px-3 py-1.5 rounded-md hover:bg-gray-100 transition-colors"
                >
                  Clear
                </button>
                
                {error && (
                  <button
                    onClick={reconnect}
                    className="text-sm text-blue-600 hover:text-blue-800 px-3 py-1.5 rounded-md hover:bg-blue-50 transition-colors"
                  >
                    Reconnect
                  </button>
                )}

                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <motion.div 
                className="px-6 py-3 bg-red-50 border-b border-red-200"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <div className="text-red-800 text-sm">{error}</div>
              </motion.div>
            )}

            <div className="flex h-96">
              {/* Log List */}
              <div className="flex-1 overflow-y-auto" ref={logContainerRef}>
                {filteredLogs.length === 0 ? (
                  isConnecting ? (
                    <LogsLoader text="Connecting to workflow tail..." />
                  ) : (
                    <div className="p-6 text-center text-gray-500">
                      <div className="w-12 h-12 mx-auto mb-3 text-gray-300">
                        <svg fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="text-sm">No logs available</div>
                    </div>
                  )
                ) : (
                  <div className="divide-y divide-gray-100">
                    {filteredLogs.map((log, index) => (
                      <motion.div
                        key={log.id}
                        className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                          selectedLog?.id === log.id ? 'bg-blue-50 border-l-4 border-blue-400' : ''
                        }`}
                        onClick={() => setSelectedLog(log)}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <div className="flex items-start space-x-3">
                          {getLogIcon(log.type)}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className={`text-sm font-medium ${getLogColor(log.type, log.success)}`}>
                                {log.nodeName || log.type}
                              </span>
                              <span className="text-xs text-gray-500 font-mono">
                                {formatTimestamp(log.timestamp)}
                              </span>
                            </div>
                            <div className="text-sm text-gray-700 mt-1">
                              {log.message}
                            </div>
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
                )}
              </div>

              {/* Log Details Panel */}
              <AnimatePresence>
                {selectedLog && (
                  <motion.div 
                    className="w-96 border-l border-gray-200 bg-gray-50"
                    initial={{ x: '100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '100%' }}
                    transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                  >
                    <div className="p-4 border-b border-gray-200">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-gray-900">Log Details</h4>
                        <button
                          onClick={() => setSelectedLog(null)}
                          className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-200 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    
                    <div className="p-4 space-y-4 overflow-y-auto max-h-80">
                      <div>
                        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Type</div>
                        <div className="text-sm text-gray-900 bg-white px-3 py-2 rounded-md border">
                          {selectedLog.type}
                        </div>
                      </div>
                      
                      {selectedLog.nodeName && (
                        <div>
                          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Node</div>
                          <div className="text-sm text-gray-900 bg-white px-3 py-2 rounded-md border">
                            {selectedLog.nodeName}
                          </div>
                        </div>
                      )}
                      
                      <div>
                        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Timestamp</div>
                        <div className="text-sm text-gray-900 bg-white px-3 py-2 rounded-md border font-mono">
                          {new Date(selectedLog.timestamp).toLocaleString()}
                        </div>
                      </div>
                      
                      {selectedLog.output && (
                        <div>
                          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Output</div>
                          <div className="bg-white border rounded-md">
                            <div className="p-3 text-xs overflow-auto max-h-32">
                              <pre className="whitespace-pre-wrap">{JSON.stringify(selectedLog.output, null, 2)}</pre>
                            </div>
                            <div className="px-3 py-2 border-t bg-gray-50">
                              <button
                                onClick={() => copyToClipboard(JSON.stringify(selectedLog.output, null, 2))}
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
                          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Error</div>
                          <div className="bg-red-50 border border-red-200 rounded-md p-3">
                            <div className="text-sm text-red-800">{selectedLog.error}</div>
                          </div>
                        </div>
                      )}
                      
                      {selectedLog.status && (
                        <div>
                          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Status</div>
                          <div className="bg-white border rounded-md">
                            <div className="p-3 text-xs overflow-auto max-h-32">
                              <pre className="whitespace-pre-wrap">{JSON.stringify(selectedLog.status, null, 2)}</pre>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
