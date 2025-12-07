"use client";

import React from "react";
import { Button, Dropdown, Input, StringIcon, NumberIcon, BooleanIcon } from "@/components/ui";
import { cn } from "@/lib/utils";

export type FilterOperator = "$eq" | "$ne" | "$in" | "$nin" | "$lt" | "$lte" | "$gt" | "$gte";
export type FilterValueType = "string" | "number" | "boolean";

export interface FilterCondition {
  key: string;
  operator: FilterOperator;
  value: string | number | boolean | null | (string | number | boolean | null)[];
  valueType?: FilterValueType;
}

export interface FilterGroup {
  logic: "AND" | "OR";
  conditions: FilterCondition[];
  groups?: FilterGroup[];
}

export interface FilterBuilderProps {
  filter: FilterGroup | null;
  onChange: (filter: FilterGroup | null) => void;
  className?: string;
}

const OPERATORS: Array<{ value: FilterOperator; label: string }> = [
  { value: "$eq", label: "Equals" },
  { value: "$ne", label: "Not equals" },
  { value: "$in", label: "In" },
  { value: "$nin", label: "Not in" },
  { value: "$lt", label: "Less than" },
  { value: "$lte", label: "Less than or equal" },
  { value: "$gt", label: "Greater than" },
  { value: "$gte", label: "Greater than or equal" },
];

const VALUE_TYPES: Array<{ value: FilterValueType; label: string; icon: React.ReactNode }> = [
  { value: "string", label: "String", icon: <StringIcon className="w-4 h-4" /> },
  { value: "number", label: "Number", icon: <NumberIcon className="w-4 h-4" /> },
  { value: "boolean", label: "Boolean", icon: <BooleanIcon className="w-4 h-4" /> },
];

export function FilterBuilder({ filter, onChange, className }: FilterBuilderProps) {
  const addCondition = () => {
    const newCondition: FilterCondition = {
      key: "",
      operator: "$eq",
      value: "",
      valueType: "string",
    };
    
    if (!filter) {
      onChange({
        logic: "AND",
        conditions: [newCondition],
      });
    } else {
      onChange({
        ...filter,
        conditions: [...filter.conditions, newCondition],
      });
    }
  };

  const removeCondition = (index: number) => {
    if (!filter) return;
    const newConditions = filter.conditions.filter((_, i) => i !== index);
    if (newConditions.length === 0) {
      onChange(null);
    } else {
      onChange({
        ...filter,
        conditions: newConditions,
      });
    }
  };

  const updateCondition = (index: number, updates: Partial<FilterCondition>) => {
    if (!filter) return;
    const newConditions = [...filter.conditions];
    newConditions[index] = { ...newConditions[index], ...updates };
    onChange({
      ...filter,
      conditions: newConditions,
    });
  };

  const toggleLogic = () => {
    if (!filter) return;
    onChange({
      ...filter,
      logic: filter.logic === "AND" ? "OR" : "AND",
    });
  };

  const parseValue = (value: string, operator: FilterOperator, valueType?: FilterValueType): string | number | boolean | null | (string | number | boolean | null)[] => {
    if (operator === "$in" || operator === "$nin") {
      const values = value
        .split(",")
        .map((v) => v.trim())
        .filter((v) => v !== ""); 
      
      return values.map((trimmed) => {
        if (trimmed === "null") return null;
        if (valueType === "boolean") {
          return trimmed.toLowerCase() === "true";
        }
        if (valueType === "number") {
          const num = Number(trimmed);
          return isNaN(num) ? 0 : num;
        }
        return trimmed;
      });
    }
    
    if (value === "null" || value === "") return null;
    if (valueType === "boolean") {
      return value.toLowerCase() === "true";
    }
    if (valueType === "number") {
      const num = Number(value);
      return isNaN(num) ? 0 : num;
    }
    return value;
  };

  if (!filter) {
    return (
      <div className={cn("space-y-3", className)}>
        <Button variant="ghost" size="sm" onClick={addCondition}>
          + Add Filter
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">Logic:</span>
        <Button
          variant={filter.logic === "AND" ? "primary" : "secondary"}
          size="sm"
          onClick={toggleLogic}
        >
          {filter.logic}
        </Button>
        <span className="text-xs text-gray-500 ml-2">
          {filter.logic === "OR" ? "(Note: Cloudflare applies AND logic)" : ""}
        </span>
      </div>

      <div className="space-y-2">
        {filter.conditions.map((condition, index) => (
          <div key={index} className="flex items-center gap-2 p-3 bg-gray-50 rounded border border-gray-200">
            <Input
              placeholder="Metadata key (e.g., 'url' or 'pandas.nice')"
              value={condition.key}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateCondition(index, { key: e.target.value })}
              className="flex-1"
            />
            <Dropdown
              options={OPERATORS.map((op) => ({ label: op.label, value: op.value }))}
              value={condition.operator}
              onChange={(value: string) => {
                const newOperator = value as FilterOperator;
                
                if (newOperator === "$in" || newOperator === "$nin") {
                  const currentValue = condition.value;
                  if (!Array.isArray(currentValue)) {
                    const arrayValue = currentValue !== undefined && currentValue !== null && currentValue !== ""
                      ? [currentValue]
                      : [];
                    updateCondition(index, { operator: newOperator, value: arrayValue });
                  } else {
                    updateCondition(index, { operator: newOperator });
                  }
                } else {
                  const singleValue = Array.isArray(condition.value)
                    ? condition.value[0] ?? ""
                    : condition.value;
                  updateCondition(index, { operator: newOperator, value: singleValue });
                }
              }}
              className="w-40"
            />
            <Dropdown
              options={VALUE_TYPES.map((type) => ({
                label: type.label,
                value: type.value,
                icon: type.icon,
              }))}
              value={condition.valueType || "string"}
              onChange={(value: string) => {
                const newType = value as FilterValueType;
                updateCondition(index, { 
                  valueType: newType,
                  value: newType === "boolean" ? false : newType === "number" ? 0 : "",
                });
              }}
              className="w-32"
            />
            {condition.valueType === "boolean" && condition.operator !== "$in" && condition.operator !== "$nin" ? (
              <Dropdown
                options={[
                  { label: "True", value: "true" },
                  { label: "False", value: "false" },
                ]}
                value={condition.value === true ? "true" : condition.value === false ? "false" : ""}
                onChange={(value: string) =>
                  updateCondition(index, {
                    value: value === "true",
                  })
                }
                className="flex-1"
              />
            ) : (
              <Input
                placeholder={
                  condition.operator === "$in" || condition.operator === "$nin"
                    ? "Comma-separated values (e.g., hbo, netflix)"
                    : condition.valueType === "number"
                    ? "Number"
                    : "Value"
                }
                type={condition.valueType === "number" && condition.operator !== "$in" && condition.operator !== "$nin" ? "number" : "text"}
                value={
                  Array.isArray(condition.value)
                    ? condition.value.join(", ")
                    : String(condition.value ?? "")
                }
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  updateCondition(index, { 
                    value: parseValue(e.target.value, condition.operator, condition.valueType),
                  })
                }
                className="flex-1"
              />
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => removeCondition(index)}
              className="text-red-600 hover:text-red-800"
            >
              Remove
            </Button>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Button variant="ghost" size="sm" onClick={addCondition}>
          + Add Condition
        </Button>
        {filter.conditions.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onChange(null)}
            className="text-red-600 hover:text-red-800"
          >
            Clear All
          </Button>
        )}
      </div>
    </div>
  );
}

export function filterGroupToCloudflareFilter(
  group: FilterGroup | null
): Record<string, unknown> | undefined {
  if (!group || group.conditions.length === 0) return undefined;

  const filterObj: Record<string, unknown> = {};

  group.conditions.forEach((condition) => {
    if (!condition.key || condition.key.trim() === "") {
      return;
    }

    let filterValue = condition.value;
    if (condition.operator === "$in" || condition.operator === "$nin") {
      if (!Array.isArray(filterValue)) {
        filterValue = filterValue !== undefined && filterValue !== null && filterValue !== ""
          ? [filterValue]
          : [];
      }
      
      if (Array.isArray(filterValue) && filterValue.length === 0) {
        return;
      }
    }

    if (filterValue === "" || (filterValue === null && condition.operator !== "$eq" && condition.operator !== "$ne")) {
      return;
    }

    const rangeOps = ["$lt", "$lte", "$gt", "$gte"];
    const isRangeOp = rangeOps.includes(condition.operator);
    
    if (filterObj[condition.key] && typeof filterObj[condition.key] === "object" && !Array.isArray(filterObj[condition.key])) {
      const existing = filterObj[condition.key] as Record<string, unknown>;
      const existingIsRange = Object.keys(existing).every(k => rangeOps.includes(k));
      
      if (isRangeOp && existingIsRange) {
        existing[condition.operator] = filterValue;
        return;
      }
      
      if (Object.keys(existing).some(k => k.startsWith("$"))) {
        return; 
      }
    }
    
    if (condition.operator === "$eq") {
      filterObj[condition.key] = filterValue;
    } else {
      filterObj[condition.key] = { [condition.operator]: filterValue };
    }
  });

  return Object.keys(filterObj).length > 0 ? filterObj : undefined;
}
