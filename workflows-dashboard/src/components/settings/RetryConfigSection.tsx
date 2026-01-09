'use client';

import React from 'react';
import { SettingInput } from '@/components/ui/SettingInput';
import { SettingSelect } from '@/components/ui/SettingSelect';
import { DurationInput } from '@/components/ui/DurationInput';
import { Info } from 'lucide-react';

interface RetryConfigSectionProps {
  nodeData: any;
  onNodeUpdate: (nodeId: string, updates: any) => void;
  nodeId: string;
}

export function RetryConfigSection({ nodeData, onNodeUpdate, nodeId }: RetryConfigSectionProps) {
  const handleRetryChange = (key: string, value: any) => {
    const numValue = key === 'timeoutMs' && value ? parseInt(value, 10) : value;
    onNodeUpdate(nodeId, { 
      config: { 
        ...nodeData.config, 
        retry: { 
          ...(nodeData.config?.retry || {}), 
          [key]: numValue 
        } 
      } 
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h4 className="text-sm font-semibold text-gray-900">Retry Configuration</h4>
        <div className="group relative">
          <Info className="w-4 h-4 text-gray-400 cursor-help" />
          <div className="absolute left-0 top-6 w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
            Configure how the node behaves when it fails. Exponential backoff increases delay between retries.
          </div>
        </div>
      </div>
      
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <SettingInput
            label="Max Attempts"
            type="number"
            placeholder="3"
            defaultValue={String(nodeData.config?.retry?.attempts ?? 3)}
            onChange={(e: any) => handleRetryChange('attempts', parseInt(e.target.value || '0', 10))}
          />
          <SettingSelect
            label="Backoff Strategy"
            value={nodeData.config?.retry?.strategy ?? 'exponential'}
            onChange={(e: any) => handleRetryChange('strategy', e.target.value)}
            options={[
              { value: 'fixed', label: 'Fixed' },
              { value: 'exponential', label: 'Exponential' }
            ]}
          />
        </div>

        <DurationInput
          label="Initial Backoff Delay"
          value={nodeData.config?.retry?.backoffMs ?? 250}
          onChange={(ms) => handleRetryChange('backoffMs', ms)}
          placeholder="250"
          presets={[
            { label: "100ms", ms: 100 },
            { label: "250ms", ms: 250 },
            { label: "500ms", ms: 500 },
            { label: "1s", ms: 1000 },
            { label: "2s", ms: 2000 },
            { label: "5s", ms: 5000 },
          ]}
        />

        <DurationInput
          label="Timeout (Optional)"
          value={nodeData.config?.retry?.timeoutMs}
          onChange={(ms) => handleRetryChange('timeoutMs', ms || undefined)}
          placeholder="No timeout"
          presets={[
            { label: "5s", ms: 5000 },
            { label: "10s", ms: 10000 },
            { label: "30s", ms: 30000 },
            { label: "1m", ms: 60000 },
            { label: "5m", ms: 300000 },
          ]}
        />
      </div>
    </div>
  );
}
