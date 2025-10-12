'use client';

import { ReactNode } from 'react';
import { Search, Plus, Globe, Settings, User } from 'lucide-react';

interface CloudflareLayoutProps {
  children: ReactNode;
}

export function CloudflareLayout({ children }: CloudflareLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Header */}
      <header className="bg-gray-100 border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Left side */}
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-orange-500 rounded flex items-center justify-center">
                <span className="text-white font-bold text-sm">CF</span>
              </div>
              <span className="font-semibold text-gray-900">CLOUDFLARE</span>
            </div>
            <span className="text-sm text-gray-600">vaishnav240204@gmail.com's Account</span>
          </div>

          {/* Right side */}
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Go to... Ctrl+K"
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
            
            <button className="text-sm text-gray-600 hover:text-gray-900">Support</button>
            
            <div className="flex items-center space-x-1 bg-orange-500 text-white px-3 py-1 rounded-md text-sm">
              <Plus className="w-4 h-4" />
              <span>Add</span>
            </div>
            
            <button className="text-sm text-gray-600 hover:text-gray-900">English</button>
            
            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-gray-600" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex">
        {/* Sidebar Navigation */}
        <nav className="w-64 bg-gray-800 text-white min-h-screen">
          <div className="p-4">
            <div className="space-y-6">
              {/* Account Home */}
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  Account home
                </h3>
                <div className="space-y-1">
                  <button className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded-md">
                    Dashboard
                  </button>
                </div>
              </div>

              {/* Recents */}
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  Recents
                </h3>
                <div className="space-y-1">
                  <button className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded-md flex items-center justify-between">
                    <span>orbis-backend</span>
                    <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded">New</span>
                  </button>
                </div>
              </div>

              {/* Build Section */}
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  BUILD
                </h3>
                <div className="space-y-1">
                  <div className="bg-gray-700 rounded-md">
                    <button className="w-full text-left px-3 py-2 text-sm text-white hover:bg-gray-600 rounded-md flex items-center justify-between">
                      <span>Workers & Pages</span>
                      <Globe className="w-4 h-4" />
                    </button>
                  </div>
                  <button className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded-md">
                    Observability
                  </button>
                  <button className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded-md">
                    Workers for Platforms
                  </button>
                  <button className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded-md">
                    Durable Objects
                  </button>
                  <button className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded-md">
                    Queues
                  </button>
                  <button className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded-md">
                    Workflows
                  </button>
                  <button className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded-md">
                    Browser Rendering
                  </button>
                  <button className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded-md flex items-center justify-between">
                    <span>AI Search (AutoRAG)</span>
                    <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded">Beta</span>
                  </button>
                  <button className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded-md">
                    Workers AI
                  </button>
                  <button className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded-md">
                    AI Gateway
                  </button>
                  <button className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded-md">
                    Workers plans
                  </button>
                </div>
              </div>

              {/* Protect & Connect */}
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  PROTECT & CONNECT
                </h3>
                <div className="space-y-1">
                  <button className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded-md">
                    Security
                  </button>
                  <button className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded-md">
                    Network
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="absolute bottom-4 left-4 right-4">
            <button className="w-full text-left px-3 py-2 text-sm text-gray-400 hover:bg-gray-700 rounded-md">
              Switch to old sidebar
            </button>
          </div>
        </nav>

        {/* Main Content Area */}
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
