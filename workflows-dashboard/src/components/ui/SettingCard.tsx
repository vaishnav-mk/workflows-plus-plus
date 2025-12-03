'use client';

import React from 'react';
import { Card, CardHeader, CardContent } from '@/components';

interface SettingCardProps {
  title: string;
  children: React.ReactNode;
}

export function SettingCard({ title, children }: SettingCardProps) {
  return (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {children}
        </div>
      </CardContent>
    </Card>
  );
}
