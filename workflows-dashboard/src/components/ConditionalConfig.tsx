'use client';

import React, { useState } from 'react';

interface Condition {
  id: string;
  left: string;
  operator: string;
  right: string;
}

interface ConditionalConfigProps {
  nodeId: string;
  onClose: () => void;
}

export const ConditionalConfig: React.FC<ConditionalConfigProps> = ({ onClose }) => {
  const [orGroups, setOrGroups] = useState<Condition[][]>([[]]);
  const operators = ['==', '!=', '>', '<', '>=', '<='];

  const addConditionToGroup = (groupIndex: number) => {
    const newCondition: Condition = { id: Date.now().toString(), left: '', operator: '==', right: '' };
    const newGroups = [...orGroups];
    newGroups[groupIndex] = [...newGroups[groupIndex], newCondition];
    setOrGroups(newGroups);
  };

  const addNewGroup = () => setOrGroups([...orGroups, []]);

  const removeCondition = (groupIndex: number, conditionId: string) => {
    const newGroups = [...orGroups];
    newGroups[groupIndex] = newGroups[groupIndex].filter(c => c.id !== conditionId);
    if (!newGroups[groupIndex].length) newGroups.splice(groupIndex, 1);
    setOrGroups(newGroups.length ? newGroups : [[]]);
  };

  const updateCondition = (groupIndex: number, id: string, field: keyof Condition, value: string) => {
    const newGroups = [...orGroups];
    newGroups[groupIndex] = newGroups[groupIndex].map(c => (c.id === id ? { ...c, [field]: value } : c));
    setOrGroups(newGroups);
  };

  return (
    <div className="bg-white rounded-md">
      <div className="flex justify-between items-center mb-4">
        <p className="!m-0 !mt-4 !-ml-1 !text-xl font-medium !pb-3 flex gap-1 items-center border-b border-b-neutral-200 dark:border-b-neutral-600">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="1em"
            height="1em"
            fill="currentColor"
            viewBox="0 0 256 256"
            className="w-4 h-4 rotate-90"
          >
            <path d="M160,112h48a16,16,0,0,0,16-16V48a16,16,0,0,0-16-16H160a16,16,0,0,0-16,16V64H128a24,24,0,0,0-24,24v32H72v-8A16,16,0,0,0,56,96H24A16,16,0,0,0,8,112v32a16,16,0,0,0,16,16H56a16,16,0,0,0,16-16v-8h32v32a24,24,0,0,0,24,24h16v16a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V160a16,16,0,0,0-16-16H160a16,16,0,0,0-16,16v16H128a8,8,0,0,1-8-8V88a8,8,0,0,1,8-8h16V96A16,16,0,0,0,160,112ZM56,144H24V112H56v32Zm104,16h48v48H160Zm0-112h48V96H160Z"></path>
          </svg>
          If...Else
        </p>
        <button
          onClick={onClose}
          className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center hover:bg-gray-200 transition-colors duration-300"
        >
          <span className="text-gray-600 text-base font-bold leading-none select-none rotate-45">+</span>
        </button>
      </div>

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
                  <input
                    value={cond.left}
                    onChange={e => updateCondition(gi, cond.id, 'left', e.target.value)}
                    placeholder="property"
                    className="flex-1 min-w-0 px-3 py-2 text-sm border-t border-b border-gray-300 bg-white text-gray-700 focus:outline-none focus:ring-0"
                  />
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
                  <input
                    value={cond.right}
                    onChange={e => updateCondition(gi, cond.id, 'right', e.target.value)}
                    placeholder="value"
                    className="flex-1 min-w-0 px-3 py-2 text-sm border-b border-r border-gray-300 rounded-br-md bg-white text-gray-700 focus:outline-none focus:ring-0"
                  />
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
              <button
                onClick={() => addConditionToGroup(gi)}
                className="px-3 py-1.5 text-xs text-blue-500 border border-blue-500 rounded hover:bg-blue-50 transition-colors"
              >
                + OR
              </button>
            </div>
          </div>
        </div>
      ))}

      <button
        onClick={addNewGroup}
        className="px-3 py-1.5 text-xs text-blue-500 border border-blue-500 rounded hover:bg-blue-50 transition-colors"
      >
        + ADD
      </button>
    </div>
  );
};
