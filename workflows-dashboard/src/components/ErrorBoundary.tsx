"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { Card, CardContent, CrossHatchBackground } from "@/components";
import { AlertCircle, RefreshCw, Home, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useRouter } from "next/navigation";
import { GITHUB } from "@/config/constants";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    });

    if (typeof window !== "undefined") {
      console.error("ErrorBoundary caught an error:", error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return <ErrorFallback error={this.state.error} onReset={this.handleReset} />;
    }

    return this.props.children;
  }
}

interface ErrorFallbackProps {
  error: Error | null;
  onReset: () => void;
}

function ErrorFallback({ error, onReset }: ErrorFallbackProps) {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50/30 relative">
      <CrossHatchBackground pattern="large" />
      <div className="relative z-10 w-full px-6 py-12">
        <div className="max-w-2xl mx-auto">
          <Card className="bg-white/80 backdrop-blur-sm relative overflow-hidden">
            <CrossHatchBackground pattern="large" opacity={0.02} />
            <CardContent className="p-8 relative z-10">
              <div className="text-center mb-6">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <AlertCircle className="w-10 h-10 text-orange-600" />
                  <h1 className="text-3xl font-bold text-gray-900">
                    Something went wrong
                  </h1>
                </div>
                <p className="text-lg text-gray-600 mt-2">
                  An unexpected error occurred. Please try again or return to the home page.
                </p>
              </div>

              {error && (
                <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm font-semibold text-red-900 mb-2">
                    Error Details:
                  </p>
                  <p className="text-sm text-red-800 font-mono break-all">
                    {error.message || "Unknown error"}
                  </p>
                </div>
              )}

              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-900 mb-2">
                  If this error persists, please report it on GitHub:
                </p>
                <a
                  href={GITHUB.ISSUES_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 hover:underline font-medium"
                >
                  <span>Report Issue</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>

              <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  variant="primary"
                  onClick={onReset}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Try Again
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => router.push("/")}
                  className="flex items-center gap-2"
                >
                  <Home className="w-4 h-4" />
                  Go Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

