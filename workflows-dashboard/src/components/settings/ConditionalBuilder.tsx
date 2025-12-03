'use client';

import React, { useState } from 'react';
import { SettingInput } from '@/components/ui/SettingInput';
import { SettingSelect } from '@/components/ui/SettingSelect';
import { SettingButton } from '@/components/ui/SettingButton';

interface Condition {
  id: string;
  left: string;
  operator: string;
  right: string;
}

interface ConditionalBuilderProps {
  nodeData: any;
  onNodeUpdate: (nodeId: string, updates: any) => void;
  nodeId: string;
}

export function ConditionalBuilder({ nodeData, onNodeUpdate, nodeId }: ConditionalBuilderProps) {
  const [orGroups, setOrGroups] = useState<Condition[][]>(nodeData.config?.conditions || [[]]);
  const operators = ['==', '!=', '>', '<', '>=', '<='];

  const addConditionToGroup = (groupIndex: number) => {
    const newCondition: Condition = { id: Date.now().toString(), left: '', operator: '==', right: '' };
    const newGroups = [...orGroups];
    newGroups[groupIndex] = [...newGroups[groupIndex], newCondition];
    setOrGroups(newGroups);
    updateNodeConfig(newGroups);
  };

  const addNewGroup = () => {
    const newGroups = [...orGroups, []];
    setOrGroups(newGroups);
    updateNodeConfig(newGroups);
  };

  const removeCondition = (groupIndex: number, conditionId: string) => {
    const newGroups = [...orGroups];
    newGroups[groupIndex] = newGroups[groupIndex].filter(c => c.id !== conditionId);
    if (!newGroups[groupIndex].length) newGroups.splice(groupIndex, 1);
    const finalGroups = newGroups.length ? newGroups : [[]];
    setOrGroups(finalGroups);
    updateNodeConfig(finalGroups);
  };

  const updateCondition = (groupIndex: number, id: string, field: keyof Condition, value: string) => {
    const newGroups = [...orGroups];
    newGroups[groupIndex] = newGroups[groupIndex].map(c => (c.id === id ? { ...c, [field]: value } : c));
    setOrGroups(newGroups);
    updateNodeConfig(newGroups);
  };

  const updateNodeConfig = (conditions: Condition[][]) => {
    onNodeUpdate(nodeId, { 
      config: { 
        ...nodeData.config, 
        conditions 
      } 
    });
  };

  return (
    <div className="bg-white rounded-md">
      {orGroups.map((group, gi) => (
        <div key={gi} className="mb-4">
          {gi > 0 && (
            <div className="flex items-center mb-4">
              <div className="flex-1 h-px bg-gray-200"></div>
              <span className="px-4 py-1.5 bg-gray-50 text-gray-700 text-xs font-medium border border-gray-200 rounded mx-2">AND</span>
              <div className="flex-1 h-px bg-gray-200"></div>
            </div>
          )}

          <div className="space-y-3 bg-[#FAFAFA] rounded-md p-4">
            {group.map((cond, ci) => (
              <div key={cond.id} className="flex flex-col gap-0 overflow-hidden">
                <div className="flex items-stretch min-w-0">
                  <div className="px-3 py-2 w-28 text-sm bg-[#E5E5E5] border border-gray-300 rounded-tl-md text-gray-600 font-normal select-none">
                    metadata.
                  </div>
                  <div className="flex-1 min-w-0">
                    <input
                      value={cond.left}
                      onChange={e => updateCondition(gi, cond.id, 'left', e.target.value)}
                      placeholder="property"
                      className="w-full px-3 py-2 text-sm border-t border-b border-gray-300 bg-white text-gray-700 focus:outline-none focus:ring-0"
                    />
                  </div>
                  <button
                    onClick={() => removeCondition(gi, cond.id)}
                    className="px-3 py-2 text-sm bg-red-100 hover:bg-red-200 border border-gray-300 rounded-tr-md text-red-600 font-normal transition-colors duration-300"
                  >
                    ×
                  </button>
                </div>

                <div className="flex items-stretch min-w-0">
                  <select
                    value={cond.operator}
                    onChange={e => updateCondition(gi, cond.id, 'operator', e.target.value)}
                    className="flex-none px-3 py-2 w-28 text-sm border-l border-r border-b border-gray-300 rounded-bl-md bg-white text-gray-700 focus:outline-none focus:ring-0"
                  >
                    {operators.map(op => <option key={op} value={op}>{op}</option>)}
                  </select>
                  <div className="flex-1 min-w-0">
                    <input
                      value={cond.right}
                      onChange={e => updateCondition(gi, cond.id, 'right', e.target.value)}
                      placeholder="value"
                      className="w-full px-3 py-2 text-sm border-b border-r border-gray-300 rounded-br-md bg-white text-gray-700 focus:outline-none focus:ring-0"
                    />
                  </div>
                </div>

                {ci < group.length - 1 && (
                  <div className="flex justify-center py-2 relative">
                    <div className="absolute inset-x-0 top-1/2 h-px bg-gray-300"></div>
                    <span className="px-3 bg-[#FAFAFA] text-gray-600 text-xs font-medium relative z-10">OR</span>
                  </div>
                )}
              </div>
            ))}

            <div className="flex justify-center mt-3">
              <SettingButton
                onClick={() => addConditionToGroup(gi)}
              >
                + OR
              </SettingButton>
            </div>
          </div>
        </div>
      ))}

      <SettingButton
        onClick={addNewGroup}
      >
        + ADD
      </SettingButton>
    </div>
  );
}
