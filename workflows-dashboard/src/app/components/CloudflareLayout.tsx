'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Plus, Workflow, Server } from 'lucide-react';
import ToastContainer from '../../components/ui/ToastContainer';
import { useToastStore } from '../../stores/toastStore';

interface CloudflareLayoutProps {
  children: ReactNode;
}

export function CloudflareLayout({ children }: CloudflareLayoutProps) {
  const { toasts, removeToast } = useToastStore();
  const pathname = usePathname();

  const navItems = [
    { href: '/', label: 'Builder', icon: Home },
    { href: '/create', label: 'Create', icon: Plus },
    { href: '/workflows', label: 'Workflows', icon: Workflow },
    { href: '/workers', label: 'Workers', icon: Server },
  ];

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname?.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-white">
      <header className="bg-gray-50 border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <span>Workers & Pages</span>
            <span>/</span>
            <span className="text-gray-900 font-medium">workflow-builder</span>
          </div>

          <div className="flex items-center space-x-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    active
                      ? 'bg-blue-500 text-white hover:bg-blue-600'
                      : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </header>

      <main className="bg-white">
        {children}
      </main>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
