import React from "react";
import { BookIcon } from "@/components/ui";
import { cn } from "@/lib/utils";

export interface DocLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  children: React.ReactNode;
  href: string;
  icon?: React.ReactNode;
}

export function DocLink({
  children,
  href,
  icon,
  className,
  ...props
}: DocLinkProps) {
  return (
    <a
      href={href}
      className={cn(
        "inline-flex items-center justify-center cursor-pointer select-none bg-white text-primary font-medium text-sm py-1 px-4 gap-1 rounded-[20vh] transition-all duration-300 ease hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
        "[box-shadow:var(--color-primary)_0px_0px_0px_1px_inset]",
        className
      )}
      {...props}
    >
      {icon || <BookIcon className="w-4 h-4" />}
      <span>{children}</span>
    </a>
  );
}

