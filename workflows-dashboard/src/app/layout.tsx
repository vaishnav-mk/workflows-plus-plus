import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { NodeRegistryProvider } from "../contexts/NodeRegistryContext";
import { AppHeader } from "../components/AppHeader";
import { QueryProvider } from "../providers/QueryProvider";
import { ErrorBoundaryWrapper } from "../components/ErrorBoundaryWrapper";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Workflows Dashboard",
  description: "Cloudflare-style workflow builder with drag and drop",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-white`}
      >
        <ErrorBoundaryWrapper>
          <QueryProvider>
            <NodeRegistryProvider>
              <AppHeader />
              <main className="bg-white min-h-screen">
                {children}
              </main>
            </NodeRegistryProvider>
          </QueryProvider>
        </ErrorBoundaryWrapper>
      </body>
    </html>
  );
}