"use client";

import { Card, CardHeader, CardContent, Button, Input } from "@/components";
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <h2 className="text-xl font-semibold text-gray-900">
            Complete Required Fields
          </h2>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-6">
            The AI generated your workflow, but some required fields need your
            input to complete the configuration.
          </p>

          <div className="space-y-6">
            {missingFields.map((nodeMissing) => (
              <Card key={nodeMissing.nodeId}>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">
                    {nodeMissing.nodeLabel} ({nodeMissing.nodeType})
                  </h3>
                  <div className="space-y-3">
                    {nodeMissing.missingFields.map((field: any) => {
                      const currentValue =
                        fieldValues[nodeMissing.nodeId]?.[field.field] || "";

                      return (
                        <div key={field.field}>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {field.field.replace(/\./g, " → ")}
                            {field.type && (
                              <span className="text-gray-500 ml-2">
                                ({field.type})
                              </span>
                            )}
                          </label>
                          {field.description && (
                            <p className="text-xs text-gray-500 mb-2">
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
                          />
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
            <Button variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
            <Button variant="primary" onClick={onComplete}>
              Complete & Continue
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

