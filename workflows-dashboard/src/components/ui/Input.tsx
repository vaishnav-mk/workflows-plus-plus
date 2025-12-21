import React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
}

export function Input({
  icon,
  className,
  ...props
}: InputProps) {
  return (
    <div className="text-gray-900 placeholder:text-gray-500 disabled:text-gray-400 outline-none h-9 rounded-lg text-base border-gray-300 focus:border-primary border-0 flex gap-0 overflow-hidden px-0 w-full ring ring-gray-950/10 shadow-xs focus-within:ring-primary bg-white">
      {icon && (
        <div className="flex p-0 items-center text-gray-500 px-2 h-full">
          {icon}
        </div>
      )}
      <input
        className={cn(
          "text-gray-900 placeholder:text-gray-500 disabled:text-gray-400 outline-none gap-1.5 text-base border-gray-300 border-0 h-full rounded-none flex items-center last:pr-2 bg-white font-sans focus:border-gray-300 flex-1 px-2",
          !icon && "first:pl-2",
          className
        )}
        {...props}
      />
    </div>
  );
}

