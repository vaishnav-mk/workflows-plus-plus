"use client";

import React from "react";
import { Button } from "@/components";

interface SettingButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  comingSoon?: boolean;
}

export function SettingButton({
  children,
  onClick,
  className,
  disabled,
  comingSoon
}: SettingButtonProps) {
  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={onClick}
      className={className}
      disabled={disabled}
      comingSoon={comingSoon}
    >
      {children}
    </Button>
  );
}
