import React from "react";
import { Button } from "@/components/ui";
import type { PageHeaderProps } from "@/types/components";

export function PageHeader({
  title,
  description,
  primaryAction,
  secondaryAction,
}: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div className="flex flex-col">
        <h1 className="text-[32px] font-semibold text-[#313131] mb-2 leading-[1.25] mt-0">{title}</h1>
        <p className="text-base font-normal text-[#4A4A4A] mb-2 leading-[1.25] mt-0 break-words">{description}</p>
      </div>
      <div className="flex items-center gap-3">
        {secondaryAction && (
          <Button variant="secondary" onClick={secondaryAction.onClick}>
            {secondaryAction.label}
          </Button>
        )}
        {primaryAction && (
          <Button variant="primary" onClick={primaryAction.onClick}>
            {primaryAction.label}
          </Button>
        )}
      </div>
    </div>
  );
}

