'use client';

import React from 'react';
import { Spinner } from '@/components';

export function WorkflowLoader({ text = "Loading..." }: { text?: string }) {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Spinner size="lg" />
        {text && <p className="text-sm text-gray-600">{text}</p>}
      </div>
    </div>
  );
}

export function InstanceLoader({ text = "Loading..." }: { text?: string }) {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <Spinner size="md" />
        {text && <p className="text-sm text-gray-600">{text}</p>}
      </div>
    </div>
  );
}

export function LogsLoader({ text = "Connecting..." }: { text?: string }) {
  return (
    <div className="flex items-center justify-center p-6">
      <div className="flex items-center gap-2">
        <Spinner size="sm" />
        {text && <span className="text-sm text-gray-600">{text}</span>}
      </div>
    </div>
  );
}

export function ButtonLoader({ text }: { text?: string }) {
  return (
    <div className="flex items-center gap-2">
      <Spinner size="sm" />
      {text && <span className="text-sm">{text}</span>}
    </div>
  );
}

export function InlineLoader({ text }: { text?: string }) {
  return (
    <div className="flex items-center gap-2">
      <Spinner size="sm" />
      {text && <span className="text-sm text-gray-600">{text}</span>}
    </div>
  );
}
