export function formatTimeout(timeoutMs?: number): string | null {
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
    return formatWithOneDecimal(hours, "H");
  }

  if (minutes >= 1) {
    return formatWithOneDecimal(minutes, "M");
  }

  return formatWithOneDecimal(seconds, "S");
}

export function getConfigEntries(config: any): Array<{ key: string; value: string }> {
  if (!config || typeof config !== "object") return [];

  const entries: Array<{ key: string; value: string }> = [];

  Object.entries(config)
    .filter(([key]) => key !== "retry")
    .slice(0, 6)
    .forEach(([key, value]) => {
      if (value === null || value === undefined) {
        return;
      }

      let displayValue: string;

      if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
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
        value: displayValue
      });
    });

  return entries;
}

