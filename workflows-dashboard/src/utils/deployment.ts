import type { DeploymentErrorInfo } from "@/types/deployment";

export function formatTimestamp(value: string): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export function parseDeploymentError(rawError: string | null): DeploymentErrorInfo | null {
  if (!rawError) return null;

  let shortMessage = rawError;
  let cfCode = 0;
  let cfMessage = "";

  try {
    let jsonPart = "";
    const firstBrace = rawError.indexOf("{");
    if (firstBrace !== -1) {
      jsonPart = rawError.slice(firstBrace);
    } else {
      const match = rawError.match(/^\s*\d+\s+(.+)$/);
      jsonPart = match ? match[1] : "";
    }

    if (jsonPart) {
      const parsed = JSON.parse(jsonPart);
      const firstError = parsed?.errors?.[0];
      if (firstError && typeof firstError.message === "string") {
        cfMessage = firstError.message;
      }
      if (firstError && typeof firstError.code === "number") {
        cfCode = firstError.code;
      }

      if (cfMessage) {
        shortMessage = cfMessage;
      }
    }
  } catch {}

  return {
    shortMessage,
    raw: rawError,
    cfCode,
    cfMessage
  };
}

