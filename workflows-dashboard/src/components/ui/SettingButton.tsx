"use client";

import React from "react";
import { Button } from "@/components";

interface SettingButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}

export function SettingButton({
  children,
  onClick,
  className,
  disabled
}: SettingButtonProps) {
  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={onClick}
      className={className}
      disabled={disabled}
    >
      {children}
    </Button>
  );
}
