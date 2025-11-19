'use client';

import React from 'react';
import { SettingInput } from '../ui/SettingInput';
import { SettingSelect } from '../ui/SettingSelect';

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
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-gray-900">Retry Configuration</h4>
      <div className="grid grid-cols-2 gap-3">
        <SettingInput
          label="Attempts"
          type="number"
          placeholder="3"
          defaultValue={String(nodeData.config?.retry?.attempts ?? 3)}
          onChange={(e: any) => handleRetryChange('attempts', parseInt(e.target.value || '0', 10))}
        />
        <SettingSelect
          label="Strategy"
          value={nodeData.config?.retry?.strategy ?? 'exponential'}
          onChange={(e: any) => handleRetryChange('strategy', e.target.value)}
          options={[
            { value: 'fixed', label: 'Fixed' },
            { value: 'exponential', label: 'Exponential' }
          ]}
        />
        <SettingInput
          label="Backoff (ms)"
          type="number"
          placeholder="250"
          defaultValue={String(nodeData.config?.retry?.backoffMs ?? 250)}
          onChange={(e: any) => handleRetryChange('backoffMs', parseInt(e.target.value || '0', 10))}
        />
        <SettingInput
          label="Timeout (ms)"
          type="number"
          placeholder="5000"
          defaultValue={String(nodeData.config?.retry?.timeoutMs ?? '')}
          onChange={(e: any) => {
            const num = e.target.value ? parseInt(e.target.value, 10) : undefined;
            handleRetryChange('timeoutMs', num);
          }}
        />
      </div>
    </div>
  );
}
