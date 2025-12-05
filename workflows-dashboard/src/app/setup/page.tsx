"use client";

import React, { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardHeader,
  CardContent,
  Button,
  Input,
  Alert,
  AlertTitle,
  Spinner,
  Badge,
  CheckIcon,
  Tabs,
  Tab
} from "@/components";
import { toast } from "../../stores/toastStore";
import {
  Shield,
  Database,
  Key,
  CheckCircle2,
  XCircle,
  Loader2,
  Cloud,
  Zap,
  Globe,
  Box,
  Workflow,
  Server,
  Info,
  Check,
  Search,
  Brain,
  Network,
  Monitor
} from "lucide-react";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8787/api";

type StepStatus = "pending" | "loading" | "success" | "error";

interface SetupStep {
  id: string;
  label: string;
  status: StepStatus;
  message?: string;
  icon: React.ComponentType<{ className?: string }>;
}

export default function SetupPage() {
  const router = useRouter();
  const [apiToken, setApiToken] = useState("");
  const [accountId, setAccountId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{
    apiToken?: string;
    accountId?: string;
  }>({});
  const [steps, setSteps] = useState<SetupStep[]>([
    {
      id: "validate-token",
      label: "Validating token",
      status: "pending",
      icon: Shield
    },
    {
      id: "databases",
      label: "Getting list of databases",
      status: "pending",
      icon: Database
    },
    {
      id: "kv-namespaces",
      label: "Listing KV namespaces",
      status: "pending",
      icon: Key
    },
    {
      id: "workflows",
      label: "Listing workflows",
      status: "pending",
      icon: Workflow
    },
    {
      id: "workers",
      label: "Listing workers",
      status: "pending",
      icon: Server
    }
  ]);
  const [activeTab, setActiveTab] = useState(0);

  const updateStep = (id: string, status: StepStatus, message?: string) => {
    console.log(`[Setup Step] ${id}: ${status}`, message ? `- ${message}` : "");
    setSteps((prev) =>
      prev.map((step) => (step.id === id ? { ...step, status, message } : step))
    );
  };

  const validate = (): boolean => {
    const newErrors: { apiToken?: string; accountId?: string } = {};

    if (!apiToken.trim()) {
      newErrors.apiToken = "API token is required";
    }

    if (!accountId.trim()) {
      newErrors.accountId = "Account ID is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setIsLoading(true);
    setErrors({});

    // Reset all steps to pending
    setSteps((prev) =>
      prev.map((step) => ({
        ...step,
        status: "pending" as StepStatus,
        message: undefined
      }))
    );

    try {
      // Start SSE stream
      const response = await fetch(`${API_BASE}/setup/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
          apiToken: apiToken.trim(),
          accountId: accountId.trim()
        })
      });

      if (!response.ok) {
        throw new Error("Failed to start setup stream");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("Failed to get response stream");
      }

      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() || "";

        for (const chunk of chunks) {
          if (!chunk.trim()) continue;

          let eventType = "message";
          let dataStr = "";

          for (const line of chunk.split("\n")) {
            if (line.startsWith("event: ")) {
              eventType = line.substring(7).trim();
            } else if (line.startsWith("data: ")) {
              dataStr = line.substring(6).trim();
            }
          }

          if (dataStr) {
            try {
              const data = JSON.parse(dataStr);

              if (eventType === "progress" && data.step) {
                // Progress update
                console.log(`[Setup Progress] ${data.step}:`, data);
                updateStep(data.step, data.status, data.message);
              } else if (eventType === "complete") {
                console.log("[Setup Complete]", data);
                // Completion - save credentials
                if (data.success) {
                  const saveResponse = await fetch(`${API_BASE}/setup`, {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json"
                    },
                    credentials: "include",
                    body: JSON.stringify({
                      apiToken: apiToken.trim(),
                      accountId: accountId.trim()
                    })
                  });

                  const saveData = await saveResponse.json();

                  if (saveResponse.ok && saveData.success) {
                    toast.success("Credentials configured successfully");
                    await new Promise((resolve) => setTimeout(resolve, 500));
                    router.push("/builder");
                  } else {
                    toast.error(
                      saveData.message || "Failed to save credentials"
                    );
                    if (saveData.error === "Invalid credentials") {
                      setErrors({
                        apiToken: "Invalid API token or Account ID",
                        accountId: "Invalid API token or Account ID"
                      });
                    }
                  }
                }
              } else if (eventType === "error") {
                // Error
                console.error("[Setup Error]", data);
                toast.error(data.message || "An error occurred");
                setErrors({
                  apiToken: data.message || "Setup failed",
                  accountId: data.message || "Setup failed"
                });
              }
            } catch (e) {
              console.error("Failed to parse SSE data:", e, dataStr);
            }
          }
        }
      }
    } catch (error) {
      console.error("Setup error:", error);
      toast.error("An error occurred while configuring credentials");
    } finally {
      setIsLoading(false);
    }
  };

  const renderStepIcon = (
    status: StepStatus,
    Icon: React.ComponentType<{ className?: string }>
  ) => {
    switch (status) {
      case "loading":
        return <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />;
      case "success":
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case "error":
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Icon className="w-5 h-5 text-gray-400" />;
    }
  };

  const cloudflareProducts = [
    {
      icon: Cloud,
      name: "Workers",
      description: "Serverless functions at the edge",
      comingSoon: false
    },
    {
      icon: Database,
      name: "D1",
      description: "SQLite database",
      comingSoon: false
    },
    {
      icon: Key,
      name: "KV",
      description: "Key-value storage",
      comingSoon: false
    },
    { icon: Box, name: "R2", description: "Object storage", comingSoon: true },
    {
      icon: Globe,
      name: "Pages",
      description: "Static site hosting",
      comingSoon: false
    },
    {
      icon: Zap,
      name: "AI",
      description: "Workers AI models",
      comingSoon: false
    },
    {
      icon: Search,
      name: "AI Search",
      description: "AI-powered search",
      comingSoon: true
    },
    {
      icon: Brain,
      name: "Vectorize",
      description: "Vector database",
      comingSoon: true
    },
    {
      icon: Network,
      name: "AI Gateway",
      description: "AI request gateway",
      comingSoon: true
    },
    {
      icon: Monitor,
      name: "Browser Use",
      description: "Browser automation",
      comingSoon: true
    }
  ];

  const requiredPermissions = [
    {
      permission: "Account:Read",
      reason: "To access your Cloudflare account information"
    },
    {
      permission: "Workers:Edit",
      reason: "To deploy and manage Cloudflare Workers"
    },
    {
      permission: "Workflows:Edit",
      reason: "To create and manage Cloudflare Workflows"
    },
    {
      permission: "D1:Edit",
      reason: "To manage D1 databases"
    },
    {
      permission: "KV Storage:Edit",
      reason: "To manage KV namespaces"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50/30 relative">
      {/* Cross-hatching pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `
            repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,1) 10px, rgba(0,0,0,1) 11px),
            repeating-linear-gradient(-45deg, transparent, transparent 10px, rgba(0,0,0,1) 10px, rgba(0,0,0,1) 11px)
          `
        }}
      />
      <div className="relative z-10 w-full px-6 py-12">
        {/* Hero Section */}
        <div className="max-w-6xl mx-auto mb-12">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Cloud className="w-10 h-10 text-orange-600" />
              <h1 className="text-4xl font-bold text-gray-900">
                Cloudflare Workflows
              </h1>
            </div>
            <p className="text-lg text-gray-600 mt-2 max-w-2xl mx-auto">
              Build, deploy, and manage workflows using Cloudflare products
            </p>
          </div>

          {/* Tabs Section */}
          <Card className="mb-8 bg-white/80 backdrop-blur-sm relative overflow-hidden">
            <div
              className="absolute inset-0 opacity-[0.02] pointer-events-none"
              style={{
                backgroundImage: `
                  repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,1) 10px, rgba(0,0,0,1) 11px),
                  repeating-linear-gradient(-45deg, transparent, transparent 10px, rgba(0,0,0,1) 10px, rgba(0,0,0,1) 11px)
                `
              }}
            />
            <Tabs
              activeTab={activeTab}
              onTabChange={setActiveTab}
              className="relative z-10"
            >
              <Tab>Overview</Tab>
              <Tab>Setup</Tab>
            </Tabs>
            <CardContent className="p-6 relative z-10">
              {activeTab === 0 ? (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">
                      What is Cloudflare Workflows?
                    </h2>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      A visual workflow builder to create, deploy, and manage
                      serverless applications on Cloudflare's edge network using
                      drag-and-drop interfaces.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      <Zap className="w-4 h-4 text-orange-600" />
                      Capabilities
                    </h3>
                    <ul className="space-y-1.5 text-gray-600 text-sm">
                      <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                        <span>Visual drag-and-drop workflow builder</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                        <span>Deploy as optimized Cloudflare Workers</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                        <span>
                          Integrate with D1, KV, and other Cloudflare products
                        </span>
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      <Info className="w-4 h-4 text-orange-600" />
                      Why API Keys?
                    </h3>
                    <p className="text-gray-600 text-sm leading-relaxed mb-3">
                      Cloudflare doesn't support OAuth. API tokens provide
                      secure, scoped access to your resources.
                    </p>
                    <Alert>
                      <AlertTitle className="text-sm">Security</AlertTitle>
                      <p className="text-xs text-gray-600 mt-1">
                        Your API token is stored in your browser and attached to
                        requests. This is open source -{" "}
                        <a
                          href="https://github.com/vaishnav-mk/workflows-dashboard"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          view the code
                        </a>
                        .
                      </p>
                    </Alert>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Required Permissions
                    </h3>
                    <div className="space-y-1.5">
                      {requiredPermissions.map((perm, idx) => (
                        <div
                          key={idx}
                          className="p-2 bg-gray-50 rounded border border-gray-200 relative overflow-hidden"
                        >
                          <div
                            className="absolute inset-0 opacity-[0.02] pointer-events-none"
                            style={{
                              backgroundImage: `
                                repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(0,0,0,1) 8px, rgba(0,0,0,1) 9px),
                                repeating-linear-gradient(-45deg, transparent, transparent 8px, rgba(0,0,0,1) 8px, rgba(0,0,0,1) 9px)
                              `
                            }}
                          />
                          <div className="flex items-center gap-2 relative z-10">
                            <Shield className="w-3.5 h-3.5 text-orange-600 flex-shrink-0" />
                            <div>
                              <p className="font-medium text-gray-900 text-xs">
                                {perm.permission}
                              </p>
                              <p className="text-xs text-gray-600 mt-0.5 leading-tight">
                                {perm.reason}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left: Form */}
                  <Card className="bg-white/80 backdrop-blur-sm relative overflow-hidden">
                    <div
                      className="absolute inset-0 opacity-[0.02] pointer-events-none"
                      style={{
                        backgroundImage: `
                          repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,1) 10px, rgba(0,0,0,1) 11px),
                          repeating-linear-gradient(-45deg, transparent, transparent 10px, rgba(0,0,0,1) 10px, rgba(0,0,0,1) 11px)
                        `
                      }}
                    />
                    <CardHeader className="relative z-10">
                      <h2 className="text-xl font-semibold text-gray-900">
                        Credentials
                      </h2>
                      <p className="mt-1 text-sm text-gray-600">
                        Enter your Cloudflare API credentials
                      </p>
                    </CardHeader>
                    <CardContent className="relative z-10">
                      <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            API Token
                          </label>
                          <Input
                            type="password"
                            value={apiToken}
                            onChange={(e) => setApiToken(e.target.value)}
                            placeholder="Enter your Cloudflare API token"
                            disabled={isLoading}
                            required
                            className="w-full"
                          />
                          {errors.apiToken && (
                            <p className="mt-1.5 text-sm text-red-600">
                              {errors.apiToken}
                            </p>
                          )}
                          <p className="mt-1.5 text-xs text-gray-500">
                            Token with appropriate permissions
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            Account ID
                          </label>
                          <Input
                            type="text"
                            value={accountId}
                            onChange={(e) => setAccountId(e.target.value)}
                            placeholder="Enter your Cloudflare Account ID"
                            disabled={isLoading}
                            required
                            className="w-full"
                          />
                          {errors.accountId && (
                            <p className="mt-1.5 text-sm text-red-600">
                              {errors.accountId}
                            </p>
                          )}
                          <p className="mt-1.5 text-xs text-gray-500">
                            Your Cloudflare Account ID
                          </p>
                        </div>

                        <div className="pt-2">
                          <Button
                            type="submit"
                            variant="primary"
                            size="lg"
                            className="w-full"
                            disabled={isLoading}
                          >
                            {isLoading
                              ? "Configuring..."
                              : "Configure Credentials"}
                          </Button>
                        </div>

                        <Alert className="relative overflow-hidden">
                          <div
                            className="absolute inset-0 opacity-[0.02] pointer-events-none"
                            style={{
                              backgroundImage: `
                                repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(0,0,0,1) 8px, rgba(0,0,0,1) 9px),
                                repeating-linear-gradient(-45deg, transparent, transparent 8px, rgba(0,0,0,1) 8px, rgba(0,0,0,1) 9px)
                              `
                            }}
                          />
                          <AlertTitle className="relative z-10 text-sm">
                            Where to find these:
                          </AlertTitle>
                          <ul className="list-disc list-inside space-y-1 ml-2 text-xs mt-2 relative z-10">
                            <li>
                              API Token: Create one at{" "}
                              <a
                                href="https://dash.cloudflare.com/profile/api-tokens"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline"
                              >
                                Cloudflare Dashboard
                              </a>
                            </li>
                            <li>
                              Account ID: Found in your{" "}
                              <a
                                href="https://dash.cloudflare.com/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline"
                              >
                                Cloudflare Dashboard
                              </a>{" "}
                              sidebar
                            </li>
                          </ul>
                        </Alert>
                      </form>
                    </CardContent>
                  </Card>

                  {/* Right: Progress Steps */}
                  <Card className="bg-white/80 backdrop-blur-sm relative overflow-hidden">
                    <div
                      className="absolute inset-0 opacity-[0.02] pointer-events-none"
                      style={{
                        backgroundImage: `
                          repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,1) 10px, rgba(0,0,0,1) 11px),
                          repeating-linear-gradient(-45deg, transparent, transparent 10px, rgba(0,0,0,1) 10px, rgba(0,0,0,1) 11px)
                        `
                      }}
                    />
                    <CardHeader className="relative z-10">
                      <h2 className="text-xl font-semibold text-gray-900">
                        Setup Progress
                      </h2>
                      <p className="mt-1 text-sm text-gray-600">
                        Real-time validation and configuration
                      </p>
                    </CardHeader>
                    <CardContent className="relative z-10">
                      <div className="space-y-3">
                        {steps.map((step) => {
                          const Icon = step.icon;
                          return (
                            <div
                              key={step.id}
                              className={`flex items-start gap-3 p-3.5 rounded-lg transition-all relative overflow-hidden ${
                                step.status === "loading"
                                  ? "bg-blue-50 border border-blue-200"
                                  : step.status === "success"
                                    ? "bg-green-50 border border-green-200"
                                    : step.status === "error"
                                      ? "bg-red-50 border border-red-200"
                                      : "bg-gray-50 border border-gray-200"
                              }`}
                            >
                              <div
                                className="absolute inset-0 opacity-[0.02] pointer-events-none"
                                style={{
                                  backgroundImage: `
                                    repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(0,0,0,1) 8px, rgba(0,0,0,1) 9px),
                                    repeating-linear-gradient(-45deg, transparent, transparent 8px, rgba(0,0,0,1) 8px, rgba(0,0,0,1) 9px)
                                  `
                                }}
                              />
                              <div className="flex-shrink-0 mt-0.5 relative z-10">
                                {renderStepIcon(step.status, Icon)}
                              </div>
                              <div className="flex-1 min-w-0 relative z-10">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p
                                    className={`text-sm font-semibold ${
                                      step.status === "error"
                                        ? "text-red-700"
                                        : step.status === "success"
                                          ? "text-green-700"
                                          : step.status === "loading"
                                            ? "text-blue-700"
                                            : "text-gray-600"
                                    }`}
                                  >
                                    {step.label}
                                  </p>
                                  {step.status === "success" && (
                                    <Badge
                                      variant="success"
                                      className="text-xs"
                                    >
                                      Done
                                    </Badge>
                                  )}
                                  {step.status === "error" && (
                                    <Badge variant="error" className="text-xs">
                                      Error
                                    </Badge>
                                  )}
                                  {step.status === "loading" && (
                                    <Badge variant="info" className="text-xs">
                                      Processing
                                    </Badge>
                                  )}
                                </div>
                                {step.message && (
                                  <p
                                    className={`mt-1.5 text-xs ${
                                      step.status === "error"
                                        ? "text-red-600"
                                        : step.status === "success"
                                          ? "text-green-600"
                                          : step.status === "loading"
                                            ? "text-blue-600"
                                            : "text-gray-500"
                                    }`}
                                  >
                                    {step.message}
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Cloudflare Products Section - Bento Grid */}
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              Cloudflare Products
            </h3>
            <p className="text-gray-600 max-w-2xl mx-auto">
              This platform integrates with Cloudflare products, giving you a
              unified interface to build, deploy, and manage your edge
              applications.
            </p>
          </div>
          <Card className="bg-orange-50/30 border-orange-100 relative overflow-hidden">
            <div
              className="absolute inset-0 opacity-[0.02] pointer-events-none"
              style={{
                backgroundImage: `
                  repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,1) 10px, rgba(0,0,0,1) 11px),
                  repeating-linear-gradient(-45deg, transparent, transparent 10px, rgba(0,0,0,1) 10px, rgba(0,0,0,1) 11px)
                `
              }}
            />
            <CardContent className="p-6 relative z-10">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4">
                {cloudflareProducts.map((product, idx) => {
                  const Icon = product.icon;
                  // Bento box grid with varied spans
                  const rowSpans = [
                    "row-span-1",
                    "row-span-1",
                    "row-span-1",
                    "row-span-1",
                    "row-span-1",
                    "row-span-1",
                    "row-span-1",
                    "row-span-1",
                    "row-span-1",
                    "row-span-1"
                  ];
                  const colSpans = [
                    "col-span-1",
                    "col-span-1",
                    "col-span-1",
                    "col-span-1",
                    "col-span-1",
                    "col-span-1",
                    "col-span-1",
                    "col-span-1",
                    "col-span-1",
                    "col-span-1"
                  ];
                  return (
                    <div
                      key={product.name}
                      className={`${colSpans[idx] || ""} ${rowSpans[idx] || ""} bg-white rounded-lg border border-orange-200 p-4 relative overflow-hidden ${product.comingSoon ? "opacity-75" : ""}`}
                    >
                      <div
                        className="absolute inset-0 opacity-[0.02] pointer-events-none"
                        style={{
                          backgroundImage: `
                            repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(0,0,0,1) 8px, rgba(0,0,0,1) 9px),
                            repeating-linear-gradient(-45deg, transparent, transparent 8px, rgba(0,0,0,1) 8px, rgba(0,0,0,1) 9px)
                          `
                        }}
                      />
                      <div className="flex items-center gap-3 relative z-10">
                        <div
                          className={`p-2.5 rounded-lg ${product.comingSoon ? "bg-gray-100" : "bg-orange-100"}`}
                        >
                          <Icon
                            className={`w-5 h-5 ${product.comingSoon ? "text-gray-500" : "text-orange-600"}`}
                          />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4
                              className={`font-semibold text-sm ${product.comingSoon ? "text-gray-600" : "text-gray-900"}`}
                            >
                              {product.name}
                            </h4>
                            {product.comingSoon && (
                              <Badge variant="outline" className="text-xs">
                                Coming Soon
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-gray-600 mt-0.5">
                            {product.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
