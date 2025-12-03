import React from "react";
import { cn } from "@/lib/utils";

export interface TableProps {
  children: React.ReactNode;
  className?: string;
}

export function Table({ children, className }: TableProps) {
  return (
    <div className={cn("mt-4 overflow-x-scroll bg-white border border-neutral-200 rounded-lg", className)}>
      <table className="w-full text-base">{children}</table>
    </div>
  );
}

export interface TableHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function TableHeader({ children, className }: TableHeaderProps) {
  return (
    <thead>
      <tr className={cn("bg-white", className)}>
        {children}
      </tr>
    </thead>
  );
}

export interface TableHeaderCellProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function TableHeaderCell({ children, className, onClick }: TableHeaderCellProps) {
  return (
    <th 
      className={cn("text-left p-3 first:pl-4 border-b border-neutral-200 hover:bg-neutral-100 transition-all cursor-pointer text-gray-800 font-semibold", className)}
      onClick={onClick}
    >
      <div className="flex items-center gap-2">
        {children}
      </div>
    </th>
  );
}

export interface TableBodyProps {
  children: React.ReactNode;
  className?: string;
}

export function TableBody({ children, className }: TableBodyProps) {
  return <tbody className={cn("bg-white", className)}>{children}</tbody>;
}

export interface TableRowProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function TableRow({ children, className, onClick }: TableRowProps) {
  return (
    <tr
      className={cn(onClick && "cursor-pointer", className)}
      onClick={onClick}
    >
      {children}
    </tr>
  );
}

export interface TableCellProps {
  children: React.ReactNode;
  className?: string;
  isActionColumn?: boolean;
}

export function TableCell({ children, className, isActionColumn = false }: TableCellProps) {
  if (isActionColumn) {
    return (
      <td className={cn("px-3 py-1.5 border-b border-neutral-200 sticky right-0 bg-gradient-to-r from-transparent via-transparent to-40% to-white", className)}>
        <div className="flex items-center justify-end gap-2">
          {children}
        </div>
      </td>
    );
  }
  
  return (
    <td className={cn("px-3 first:pl-4 py-2 sm:py-1.5 border-b border-neutral-200 font-medium", className)}>
      <div className="line-clamp-1 text-ellipsis">
        {children}
      </div>
    </td>
  );
}

