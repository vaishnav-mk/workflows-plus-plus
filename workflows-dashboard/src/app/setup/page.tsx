"use client";

import React, { useState } from "react";
import {
  Card,
  CardContent,
  Tabs,
  Tab,
  CrossHatchBackground
} from "@/components";
import {
  SetupForm,
  SetupProgress,
  OverviewTab,
  CloudflareProducts,
  TweetsEmbed
} from "@/components/setup";
import { Cloud } from "lucide-react";
import type { SetupStep, StepStatus } from "@/types/setup";
import { useSetupSSE } from "@/hooks/useSetupSSE";
import {
  Shield,
  Database,
  Key,
  Workflow,
  Server,
  AlertTriangle
} from "lucide-react";
import { Alert, AlertTitle } from "@/components";
import { GITHUB } from "@/config/constants";

const INITIAL_STEPS: SetupStep[] = [
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
];

export default function SetupPage() {
  const [apiToken, setApiToken] = useState("");
  const [accountId, setAccountId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{
    apiToken?: string;
    accountId?: string;
  }>({});
  const [steps, setSteps] = useState<SetupStep[]>(INITIAL_STEPS);
  const [activeTab, setActiveTab] = useState(0);

  const updateStep = (id: string, status: StepStatus, message?: string) => {
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

  const { handleSubmit: handleSSESubmit } = useSetupSSE({
    apiToken,
    accountId,
    steps,
    updateStep,
    setErrors,
    setIsLoading
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50/30 relative">
      <CrossHatchBackground pattern="large" />
      <div className="relative z-10 w-full px-6 py-12">
        <div className="max-w-6xl mx-auto mb-12">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Cloud className="w-10 h-10 text-orange-600" />
              <h1 className="text-4xl font-bold text-gray-900">workers++</h1>
            </div>
            <p className="text-lg text-gray-600 mt-2 max-w-2xl mx-auto">
              Build, deploy, and manage workflows using Cloudflare products
            </p>
          </div>

          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <AlertTitle className="text-yellow-900 font-semibold mb-2">
                  Experimental Project
                </AlertTitle>
                <p className="text-sm text-yellow-800">
                  This project is still very experimental and I'm still learning
                  things properly. If you encounter any errors or issues, please
                  report them at{" "}
                  <a
                    href={GITHUB.ISSUES_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-yellow-900 underline font-medium hover:text-yellow-700"
                  >
                    {GITHUB.ISSUES_URL}
                  </a>{" "}
                  and I'll take a look at it shortly.
                </p>
              </div>
            </div>
          </div>

          <Card className="mb-8 bg-white/80 backdrop-blur-sm relative overflow-hidden">
            <CrossHatchBackground pattern="large" opacity={0.02} />
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
                <OverviewTab />
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <SetupForm
                    apiToken={apiToken}
                    accountId={accountId}
                    errors={errors}
                    isLoading={isLoading}
                    onApiTokenChange={setApiToken}
                    onAccountIdChange={setAccountId}
                    onSubmit={async () => {
                      if (!validate()) {
                        return;
                      }
                      setIsLoading(true);
                      setErrors({});
                      setSteps((prev) =>
                        prev.map((step) => ({
                          ...step,
                          status: "pending" as StepStatus,
                          message: undefined
                        }))
                      );
                      await handleSSESubmit();
                    }}
                  />
                  <SetupProgress steps={steps} />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="max-w-6xl mx-auto space-y-12">
          <div>
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
            <CloudflareProducts />
          </div>

          <TweetsEmbed
            tweetIds={[
              "1978160610849550406",
              "1997374008996802756",
              "1993026478372782453"
            ]}
            title="Tweets That Got Traction"
          />
        </div>
      </div>
    </div>
  );
}
