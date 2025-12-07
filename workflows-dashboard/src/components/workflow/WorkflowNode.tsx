'use client';

import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';
import { 
  X, Code, Play, CheckCircle, RotateCw, Clock, GitBranch, 
  CheckSquare, ArrowRight, ArrowLeft, Brain, Pause, Repeat, Globe, 
  Database, Save 
} from 'lucide-react';
import { useMemo } from 'react';
import { useWorkflowStore } from '@/stores/workflowStore';
import { useNodeRegistry } from '@/hooks/useNodeRegistry';
import { WORKFLOW_DEFAULT_MAX_RETRIES, WORKFLOW_DEFAULT_TIMEOUT_MS } from '@/config/workflowDefaults';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Play,
  CheckCircle,
  Code,
  GitBranch,
  CheckSquare,
  Output: ArrowRight,
  Input: ArrowLeft,
  Brain,
  Pause,
  Repeat,
  Globe,
  Database,
  Save,
  Clock,
};

function formatTimeout(timeoutMs?: number): string | null {
  if (timeoutMs == null || timeoutMs <= 0) return null;

  const seconds = timeoutMs / 1000;
  const minutes = seconds / 60;
  const hours = minutes / 60;

  const formatWithOneDecimal = (value: number, unit: string): string => {
    const rounded = Math.round(value * 10) / 10;
    const str = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
    return `${str}${unit}`;
  };

  if (hours >= 1) {
    return formatWithOneDecimal(hours, 'H');
  }

  if (minutes >= 1) {
    return formatWithOneDecimal(minutes, 'M');
  }

  return formatWithOneDecimal(seconds, 'S');
}

function getConfigEntries(config: any): Array<{ key: string; value: string }> {
  if (!config || typeof config !== 'object') return [];

  const entries: Array<{ key: string; value: string }> = [];

  Object.entries(config)
    .filter(([key]) => key !== 'retry')
    .slice(0, 6)
    .forEach(([key, value]) => {
      if (value === null || value === undefined) {
        return;
      }

      let displayValue: string;

      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        displayValue = String(value);
      } else if (Array.isArray(value)) {
        displayValue = `[${value.length} items]`;
      } else {
        try {
          displayValue = JSON.stringify(value);
        } catch {
          displayValue = String(value);
        }
      }

      entries.push({
        key: key.charAt(0).toUpperCase() + key.slice(1),
        value: displayValue,
      });
    });

  return entries;
}

export function WorkflowNode({ id, data, selected }: NodeProps) {
  const { removeNode } = useWorkflowStore();
  const { catalog } = useNodeRegistry();

  const catalogItem = useMemo(() => 
    catalog.find(item => item.type === data.type),
    [catalog, data.type]
  );

  const isSystemNode = data.type === 'entry' || data.type === 'return';
  const isConditionalRouter = data.type === 'conditional-router';

  const borderColor = useMemo(() => {
    const status = typeof data.status === 'string' ? data.status.toLowerCase() : '';
    if (status === 'completed' || status === 'success') return '#10b981';
    if (status === 'failed' || status === 'error') return '#ef4444';
    if (status === 'running') return '#3b82f6';
    if (status === 'pending') return '#fbbf24';
    return catalogItem?.color || '#e5e7eb';
  }, [data.status, catalogItem?.color]);

  const iconName = typeof data.icon === 'string' ? data.icon : (catalogItem?.icon || 'Code');
  const Icon = iconMap[iconName] || Code;

  const nodeName = typeof data.label === 'string' && data.label.length > 0 
    ? data.label 
    : (catalogItem?.name || (typeof data.type === 'string' ? data.type : 'Node'));

  const nodeConfigItems = useMemo(
    () => getConfigEntries((data as any)?.config || {}),
    [data]
  );

  const retryConfig = (data as any)?.config?.retry || (data as any)?.retry || {};
  const maxRetries =
    retryConfig.attempts ??
    retryConfig.maxAttempts ??
    WORKFLOW_DEFAULT_MAX_RETRIES;
  const timeoutMs =
    retryConfig.timeoutMs ??
    retryConfig.timeout ??
    WORKFLOW_DEFAULT_TIMEOUT_MS;
  const timeoutFormatted = formatTimeout(timeoutMs);

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm('Delete this node?')) {
      removeNode(id);
    }
  };

  return (
    <div className="relative group">
      <div
        style={{
          position: 'absolute',
          top: '-24px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '4px',
          padding: '2px 6px',
          background: borderColor,
          borderRadius: '4px',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          zIndex: 10,
          boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
        }}
      >
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
          }}
        >
          <Icon className="w-3 h-3 icon-thick" />
        </span>
        <span
          style={{ 
            fontWeight: 600, 
            fontSize: '12px',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {nodeName.toUpperCase()}
        </span>
      </div>

      <div 
        className="react-flow__node-workflow"
        style={{
          background: isSystemNode ? '#f3f4f6' : '#ffffff',
          border: `2px solid ${borderColor}`,
          borderRadius: '8px',
          width: '260px',
          boxShadow: selected ? '0 0 0 2px #3b82f6' : '0 1px 3px rgba(0,0,0,0.1)',
          position: 'relative',
        }}
      >
      {!isSystemNode && (
        <button 
          onClick={handleDelete}
          title="Delete node"
          style={{
            position: 'absolute',
            top: '4px',
            right: '4px',
            background: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            width: '20px',
            height: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            opacity: 0,
            transition: 'opacity 0.2s',
            zIndex: 10,
          }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '0'}
        >
          <X className="w-3 h-3" />
        </button>
      )}


      {data.type !== 'entry' && (
        <Handle
          type="target"
          position={Position.Top}
          style={{ 
            top: '-4px',
            background: borderColor,
            border: '2px solid white',
            width: '12px',
            height: '12px'
          }}
        />
      )}

      <div style={{ 
        display: 'flex', 
        flexDirection: 'row',
        position: 'relative',
      }}>
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column',
          padding: '12px',
          flex: 1,
          minWidth: 0,
        }}>
          {nodeConfigItems.length > 0 ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              {nodeConfigItems.map((item, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                  }}
                >
                  <div
                    style={{
                      fontSize: '9px',
                      fontWeight: 600,
                      color: '#9ca3af',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    {item.key}
                  </div>
                  <div
                    style={{
                      fontSize: '11px',
                      color: '#374151',
                      lineHeight: '1.4',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      wordBreak: 'break-word',
                    }}
                  >
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            catalogItem?.description && (
              <div
                style={{
                  fontSize: '11px',
                  color: '#6b7280',
                  lineHeight: '1.4',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  wordBreak: 'break-word',
                }}
              >
                {catalogItem.description}
              </div>
            )
          )}
        </div>

        {(maxRetries > 0 || timeoutMs != null) && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '12px 8px',
            borderLeft: '1px solid #e5e7eb',
            minWidth: '48px',
          }}>
            {maxRetries > 0 && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '2px',
                }}
              >
                <RotateCw className="w-4 h-4 icon-thick" style={{ color: '#6b7280' }} />
                <span
                  style={{
                    fontSize: '10px',
                    color: '#6b7280',
                    fontWeight: 600,
                  }}
                >
                  {maxRetries}
                </span>
              </div>
            )}
            {timeoutFormatted && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '2px',
                }}
              >
                <Clock className="w-4 h-4 icon-thick" style={{ color: '#6b7280' }} />
                <span
                  style={{
                    fontSize: '10px',
                    color: '#6b7280',
                    fontWeight: 600,
                  }}
                >
                  {timeoutFormatted}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {data.type !== 'return' && (
        <>
          {isConditionalRouter ? (
            (() => {
              const config = (data as any)?.config || {};
              const cases = config.cases || [];
              
              if (cases.length === 0) {
                return (
                  <Handle
                    type="source"
                    position={Position.Bottom}
                    style={{ 
                      bottom: '-4px',
                      background: borderColor,
                      border: '2px solid white',
                      width: '12px',
                      height: '12px'
                    }}
                  />
                );
              }
              
              return cases.map((caseConfig: any, index: number) => {
                const caseName = caseConfig.case || `case${index + 1}`;
                const totalCases = cases.length;
                const positionPercent = totalCases === 1 
                  ? 50 
                  : (index / (totalCases - 1)) * 80 + 10;
                
                return (
                  <Handle
                    key={caseName}
                    type="source"
                    id={caseName}
                    position={Position.Bottom}
                    style={{ 
                      bottom: '-4px',
                      background: borderColor,
                      border: '2px solid white',
                      width: '12px',
                      height: '12px',
                      left: `${positionPercent}%`,
                      transform: 'translateX(-50%)',
                    }}
                  />
                );
              });
            })()
          ) : (
            <Handle
              type="source"
              position={Position.Bottom}
              style={{ 
                bottom: '-4px',
                background: borderColor,
                border: '2px solid white',
                width: '12px',
                height: '12px'
              }}
            />
          )}
        </>
      )}
      </div>
    </div>
  );
}
