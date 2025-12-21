"use client";

import { Button, Input } from "@/components";
import { X } from "lucide-react";
import type { GenerateWorkflowFromAIResponse } from "@/lib/api/types";

interface MissingFieldsFormProps {
  missingFields: Array<{
    nodeId: string;
    nodeLabel: string;
    nodeType: string;
    missingFields: Array<{
      field: string;
      type?: string;
      description?: string;
    }>;
  }>;
  fieldValues: Record<string, Record<string, any>>;
  onFieldChange: (nodeId: string, fieldPath: string, value: any) => void;
  onComplete: () => void;
  onCancel: () => void;
}

export function MissingFieldsForm({
  missingFields,
  fieldValues,
  onFieldChange,
  onComplete,
  onCancel
}: MissingFieldsFormProps) {
  if (missingFields.length === 0) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-200 rounded-md bg-white shadow-xl">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">
            Complete Required Fields
          </h2>
          <button
            onClick={onCancel}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <div className="p-4">
          <p className="text-xs text-gray-600 mb-4">
            The AI generated your workflow, but some required fields need your
            input to complete the configuration.
          </p>

          <div className="space-y-3">
            {missingFields.map((nodeMissing) => (
              <div key={nodeMissing.nodeId} className="border border-gray-200 rounded-md p-3 bg-gray-50/50">
                <h3 className="text-xs font-semibold text-gray-900 mb-2">
                  {nodeMissing.nodeLabel} ({nodeMissing.nodeType})
                </h3>
                <div className="space-y-2.5">
                  {nodeMissing.missingFields.map((field: any) => {
                    const currentValue =
                      fieldValues[nodeMissing.nodeId]?.[field.field] || "";

                    return (
                      <div key={field.field}>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          {field.field.replace(/\./g, " → ")}
                          {field.type && (
                            <span className="text-gray-500 ml-1.5">
                              ({field.type})
                            </span>
                          )}
                        </label>
                        {field.description && (
                          <p className="text-[10px] text-gray-500 mb-1.5">
                            {field.description}
                          </p>
                        )}
                        <Input
                          type="text"
                          value={currentValue}
                          onChange={(e) =>
                            onFieldChange(
                              nodeMissing.nodeId,
                              field.field,
                              e.target.value
                            )
                          }
                          placeholder={`Enter ${field.field}`}
                          className="text-xs"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t border-gray-200">
            <Button variant="secondary" size="sm" onClick={onCancel}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={onComplete}>
              Complete & Continue
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
