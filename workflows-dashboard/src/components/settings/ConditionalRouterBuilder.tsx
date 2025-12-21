'use client';

import React from 'react';
import { SettingInput } from '@/components/ui/SettingInput';
import { SettingButton } from '@/components/ui/SettingButton';
import { X, Plus } from 'lucide-react';

interface Case {
  case: string;
  value?: any;
  isDefault?: boolean;
}

interface ConditionalRouterBuilderProps {
  nodeData: any;
  onNodeUpdate: (nodeId: string, updates: any) => void;
  nodeId: string;
}

export function ConditionalRouterBuilder({ nodeData, onNodeUpdate, nodeId }: ConditionalRouterBuilderProps) {
  const config = nodeData?.config || {};
  const conditionPath = config.conditionPath || '';
  const cases: Case[] = Array.isArray(config.cases) ? config.cases : [];

  const updateConditionPath = (value: string) => {
    onNodeUpdate(nodeId, {
      config: {
        ...config,
        conditionPath: value,
      },
    });
  };

  const addCase = () => {
    const newCase: Case = {
      case: `case${cases.length + 1}`,
      value: '',
      isDefault: false,
    };
    onNodeUpdate(nodeId, {
      config: {
        ...config,
        cases: [...cases, newCase],
      },
    });
  };

  const updateCase = (index: number, updates: Partial<Case>) => {
    const newCases = [...cases];
    newCases[index] = { ...newCases[index], ...updates };
    onNodeUpdate(nodeId, {
      config: {
        ...config,
        cases: newCases,
      },
    });
  };

  const removeCase = (index: number) => {
    const newCases = cases.filter((_, i) => i !== index);
    onNodeUpdate(nodeId, {
      config: {
        ...config,
        cases: newCases,
      },
    });
  };

  const toggleDefault = (index: number) => {
    const newCases = cases.map((c, i) => ({
      ...c,
      isDefault: i === index ? !c.isDefault : false, // Only one default at a time
    }));
    onNodeUpdate(nodeId, {
      config: {
        ...config,
        cases: newCases,
      },
    });
  };

  return (
    <div className="space-y-4">
      {/* Condition Path */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Condition Path
        </label>
        <SettingInput
          value={conditionPath}
          onChange={(e) => updateConditionPath(e.target.value)}
          placeholder="e.g., status, step_http_1.status, event.payload.code"
          className="w-full"
        />
        <p className="text-xs text-gray-500 mt-1">
          Path to the value that determines which case to route to
        </p>
      </div>

      {/* Cases */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">
            Cases
          </label>
          <SettingButton onClick={addCase} className="text-xs py-1 px-2">
            <Plus className="w-3 h-3 mr-1" />
            Add Case
          </SettingButton>
        </div>

        {cases.length === 0 ? (
          <div className="text-sm text-gray-500 p-4 border border-gray-200 rounded-md bg-gray-50">
            No cases configured. Add a case to define routing paths.
          </div>
        ) : (
          <div className="space-y-3">
            {cases.map((caseItem, index) => (
              <div
                key={index}
                className="border border-gray-200 rounded-md p-3 bg-white"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 space-y-2">
                    {/* Case Name */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Case Name
                      </label>
                      <SettingInput
                        value={caseItem.case}
                        onChange={(e) =>
                          updateCase(index, { case: e.target.value })
                        }
                        placeholder="e.g., success, error, default"
                        className="w-full text-sm"
                      />
                    </div>

                    {/* Case Value (only if not default) */}
                    {!caseItem.isDefault && (
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Value to Match
                        </label>
                        <SettingInput
                          value={
                            typeof caseItem.value === 'string'
                              ? caseItem.value
                              : caseItem.value !== undefined
                              ? JSON.stringify(caseItem.value)
                              : ''
                          }
                          onChange={(e) => {
                            let value: any = e.target.value;
                            // Try to parse as JSON if it looks like JSON
                            if (
                              (value.startsWith('{') && value.endsWith('}')) ||
                              (value.startsWith('[') && value.endsWith(']')) ||
                              value === 'true' ||
                              value === 'false' ||
                              !isNaN(Number(value)) && value !== ''
                            ) {
                              try {
                                value = JSON.parse(value);
                              } catch {
                                // Keep as string if parsing fails
                              }
                            } else if (!isNaN(Number(value)) && value !== '') {
                              value = Number(value);
                            }
                            updateCase(index, { value });
                          }}
                          placeholder="e.g., 200, 'success', true"
                          className="w-full text-sm"
                        />
                      </div>
                    )}

                    {/* Default Toggle */}
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={caseItem.isDefault || false}
                        onChange={() => toggleDefault(index)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label className="ml-2 text-xs text-gray-600">
                        Default case (matches when no other case matches)
                      </label>
                    </div>
                  </div>

                  {/* Remove Button */}
                  <button
                    onClick={() => removeCase(index)}
                    className="ml-2 p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                    title="Remove case"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

