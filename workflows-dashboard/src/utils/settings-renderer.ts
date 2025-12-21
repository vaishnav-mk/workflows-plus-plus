export function processFieldValue(value: any): any {
  if (typeof value === "string" && !isNaN(Number(value)) && value !== "") {
    return Number(value);
  }
  return value;
}

export function getNestedValue(
  keyPath: string,
  config: any,
  defaultValue: any
): any {
  if (keyPath.includes(".")) {
    const keys = keyPath.split(".");
    let value = config;
    for (const k of keys) {
      value = value?.[k];
      if (value === undefined || value === null) {
        return defaultValue;
      }
    }
    return value;
  }
  return config?.[keyPath] ?? defaultValue;
}

export function convertValueToString(currentValue: any): string {
  if (currentValue === undefined || currentValue === null) return "";
  if (typeof currentValue === "string") return currentValue;
  if (typeof currentValue === "number") return String(currentValue);
  if (typeof currentValue === "boolean") return String(currentValue);
  if (typeof currentValue === "object") {
    if (currentValue.label) return String(currentValue.label);
    if (currentValue.name) return String(currentValue.name);
    if (currentValue.value) return String(currentValue.value);
    if (currentValue.text) return String(currentValue.text);
    if (Array.isArray(currentValue)) return currentValue.join(", ");
    return "";
  }
  return String(currentValue);
}

export function migrateNestedValue(
  currentNested: any,
  nestedKeys: string[],
  processedValue: any
): any {
  if (
    currentNested !== undefined &&
    currentNested !== null &&
    typeof currentNested !== "object"
  ) {
    const oldValue = currentNested;
    if (nestedKeys[0] === "type") {
      return {
        type: processedValue,
        content: oldValue
      };
    } else if (nestedKeys[0] === "content") {
      const inferredType =
        typeof oldValue === "string" && oldValue.includes("{{")
          ? "variable"
          : "static";
      return {
        type: inferredType,
        content: processedValue
      };
    } else {
      return {};
    }
  }
  return currentNested || {};
}

export function buildNestedObject(
  nestedObj: any,
  nestedKeys: string[],
  processedValue: any
): void {
  for (let i = 0; i < nestedKeys.length - 1; i++) {
    if (!nestedObj[nestedKeys[i]] || typeof nestedObj[nestedKeys[i]] !== "object") {
      nestedObj[nestedKeys[i]] = {};
    }
    nestedObj = nestedObj[nestedKeys[i]];
  }
  const finalKey = nestedKeys[nestedKeys.length - 1];
  nestedObj[finalKey] = processedValue;
}

