import React from 'react';
import { cn } from '../../lib/utils';

interface CloudflareCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const CloudflareCard = React.forwardRef<HTMLDivElement, CloudflareCardProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "bg-white border border-gray-200 rounded-lg shadow-sm",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CloudflareCard.displayName = 'CloudflareCard';

interface CloudflareCardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const CloudflareCardHeader = React.forwardRef<HTMLDivElement, CloudflareCardHeaderProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("px-6 py-4 border-b border-gray-200", className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CloudflareCardHeader.displayName = 'CloudflareCardHeader';

interface CloudflareCardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const CloudflareCardContent = React.forwardRef<HTMLDivElement, CloudflareCardContentProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("px-6 py-4", className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CloudflareCardContent.displayName = 'CloudflareCardContent';
