"use client";

import { ErrorBoundary } from "./ErrorBoundary";

export function ErrorBoundaryWrapper({ children }: { children: React.ReactNode }) {
  return <ErrorBoundary>{children}</ErrorBoundary>;
}

