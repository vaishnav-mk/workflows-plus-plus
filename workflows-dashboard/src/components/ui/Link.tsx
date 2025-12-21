import React from "react";
import { cn } from "@/lib/utils";

export interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  children: React.ReactNode;
  href?: string;
  external?: boolean;
}

export function Link({
  children,
  href,
  external,
  className,
  ...props
}: LinkProps) {
  return (
    <a
      href={href}
      className={cn("text-primary underline underline-offset-[4px] transition-colors duration-150 ease-in-out hover:opacity-80", className)}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      {...props}
    >
      {children}
    </a>
  );
}

