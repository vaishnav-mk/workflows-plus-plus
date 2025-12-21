"use client";

import React, { useMemo } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Home, Plus, Workflow, Server, Sparkles } from "lucide-react";
import { Breadcrumbs, Button } from "@/components/ui";
import { generateBreadcrumbs } from "@/lib/breadcrumbs";
import { logout } from "@/lib/auth";
import ToastContainer from "./ui/ToastContainer";
import { useToastStore } from "../stores/toastStore";

const VALID_ROUTE_PATTERNS = [
  /^\/$/,
  /^\/builder$/,
  /^\/create$/,
  /^\/workflows$/,
  /^\/workflows\/[^/]+\/instances$/,
  /^\/workflows\/[^/]+\/instances\/[^/]+$/,
  /^\/workers$/,
  /^\/workers\/[^/]+$/,
  /^\/workers\/[^/]+\/versions$/,
  /^\/workers\/[^/]+\/versions\/[^/]+$/,
  /^\/setup$/,
  /^\/deployment$/,
  /^\/databases$/,
  /^\/databases\/[^/]+$/,
];

export function AppHeader() {
  const pathname = usePathname();
  const breadcrumbItems = generateBreadcrumbs(pathname || "/");
  const { toasts, removeToast } = useToastStore();

  const is404 = useMemo(() => {
    if (!pathname) return false;
    return !VALID_ROUTE_PATTERNS.some(pattern => pattern.test(pathname));
  }, [pathname]);

  const handleLogout = async () => {
    await logout();
  };

  if (pathname === "/setup") {
    return null;
  }

  const navItems = [
    { href: "/", label: "Home", icon: Home },
    { href: "/builder", label: "Builder", icon: Plus },
    { href: "/create", label: "Create", icon: Sparkles },
    { href: "/workflows", label: "Workflows", icon: Workflow },
    { href: "/workers", label: "Workers", icon: Server },
  ];

  const isActive = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }
    return pathname?.startsWith(href);
  };

  // 404 page styling - transparent/blend with background
  if (is404) {
    return (
      <>
        <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 sticky top-0 z-50">
          <div className="w-full px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <nav className="flex items-center gap-3">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.href);
                    return (
                      <Link key={item.href} href={item.href} className="no-underline">
                        <Button
                          variant={active ? "primary" : "secondary"}
                          size="sm"
                          className="bg-white/90 hover:bg-white"
                        >
                          <Icon className="w-4 h-4 mr-1.5" />
                          {item.label}
                        </Button>
                      </Link>
                    );
                  })}
                </nav>
                <div className="h-4 w-px bg-gray-300/50" />
                <Breadcrumbs
                  items={breadcrumbItems}
                  maxLength={20}
                  showCopy={false}
                />
              </div>
              <div className="flex items-center gap-3">
                <Button variant="secondary" size="sm" onClick={handleLogout} className="bg-white/90 hover:bg-white">
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </header>
        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </>
    );
  }

  // Normal page styling - clean white theme matching 404 aesthetic
  return (
    <>
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="w-full px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <nav className="flex items-center gap-3">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <Link key={item.href} href={item.href} className="no-underline">
                      <Button
                        variant={active ? "primary" : "secondary"}
                        size="sm"
                      >
                        <Icon className="w-4 h-4 mr-1.5" />
                        {item.label}
                      </Button>
                    </Link>
                  );
                })}
              </nav>
              <div className="h-4 w-px bg-gray-300" />
              <Breadcrumbs
                items={breadcrumbItems}
                maxLength={20}
                showCopy={false}
              />
            </div>
            <div className="flex items-center gap-3">
              <Button variant="secondary" size="sm" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </>
  );
}

