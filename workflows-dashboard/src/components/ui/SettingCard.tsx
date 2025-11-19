'use client';

import React from 'react';

interface SettingCardProps {
  title: string;
  children: React.ReactNode;
}

export function SettingCard({ title, children }: SettingCardProps) {
  return (
    <div className="bg-white rounded-md">
      <div className="flex justify-between items-center mb-4">
        <p className="!m-0 !mt-4 !-ml-1 !text-xl font-medium !pb-3 flex gap-1 items-center border-b border-b-neutral-200 dark:border-b-neutral-600">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="1em"
            height="1em"
            fill="currentColor"
            viewBox="0 0 256 256"
            className="w-4 h-4 rotate-90"
          >
            <path d="M160,112h48a16,16,0,0,0,16-16V48a16,16,0,0,0-16-16H160a16,16,0,0,0-16,16V64H128a24,24,0,0,0-24,24v32H72v-8A16,16,0,0,0,56,96H24A16,16,0,0,0,8,112v32a16,16,0,0,0,16,16H56a16,16,0,0,0,16-16v-8h32v32a24,24,0,0,0,24,24h16v16a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V160a16,16,0,0,0-16-16H160a16,16,0,0,0-16,16v16H128a8,8,0,0,1-8-8V88a8,8,0,0,1,8-8h16V96A16,16,0,0,0,160,112ZM56,144H24V112H56v32Zm104,16h48v48H160Zm0-112h48V96H160Z"></path>
          </svg>
          {title}
        </p>
      </div>
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
}
