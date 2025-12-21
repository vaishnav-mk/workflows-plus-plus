import React from "react";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn("w-full px-10 py-16 bg-white border border-neutral-200 rounded-xl flex flex-col gap-6 items-center", className)}>
      {icon && <div className="flex items-center justify-center text-gray-700">{icon}</div>}
      <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
      <p className="text-center max-w-[560px] text-neutral-600">
        {description}
      </p>
    </div>
  );
}

export interface EmptyStateContainerProps {
  children: React.ReactNode;
  className?: string;
}

export function EmptyStateContainer({
  children,
  className,
}: EmptyStateContainerProps) {
  return (
    <div className={cn("flex flex-col-reverse xl:flex-row gap-6 xl:gap-8", className)}>
      <div className="min-w-0 grow">
        {children}
      </div>
    </div>
  );
}

export interface SearchEmptyStateProps {
  loading: boolean;
  hasResults: boolean;
}

export function SearchEmptyState({ loading, hasResults }: SearchEmptyStateProps) {
  if (loading) {
    return (
      <div className="w-full px-10 py-16 bg-white border border-neutral-200 rounded-xl flex flex-col gap-6 items-center">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
        <p className="text-sm text-gray-600">Searching...</p>
      </div>
    );
  }

  if (hasResults) {
    return (
      <div className="w-full px-10 py-16 bg-white border border-neutral-200 rounded-xl flex flex-col gap-6 items-center">
        <p className="text-center text-gray-500">No results found for your query.</p>
      </div>
    );
  }

  return (
    <div className="w-full px-10 py-16 bg-white border border-neutral-200 rounded-xl flex flex-col gap-6 items-center">
      <div className="text-gray-300">
        <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-gray-900">Ready to search</h3>
      <p className="text-sm text-gray-500">Enter a query and click search to see results</p>
    </div>
  );
}

