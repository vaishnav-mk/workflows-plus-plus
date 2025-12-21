"use client";

import {
  Card,
  CardHeader,
  CardContent,
  Button,
  Input,
  Alert,
  AlertTitle,
  CrossHatchBackground
} from "@/components";
import { Sparkles } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { isSuccessResponse, getResponseData } from "@/lib/api/utils";
import { useState, useEffect } from "react";
import type { SetupErrors } from "@/types/setup";

interface SetupFormProps {
  apiToken: string;
  accountId: string;
  errors: SetupErrors;
  isLoading: boolean;
  onApiTokenChange: (value: string) => void;
  onAccountIdChange: (value: string) => void;
  onSubmit: () => void;
}

export function SetupForm({
  apiToken,
  accountId,
  errors,
  isLoading,
  onApiTokenChange,
  onAccountIdChange,
  onSubmit
}: SetupFormProps) {
  const [testCredentials, setTestCredentials] = useState<{
    apiToken: string;
    accountId: string;
  } | null>(null);
  const [loadingTestCreds, setLoadingTestCreds] = useState(false);

  useEffect(() => {
    const fetchTestCredentials = async () => {
      setLoadingTestCreds(true);
      try {
        const result = await (apiClient as any).getTestCredentials();
        if (isSuccessResponse(result)) {
          try {
            const data = getResponseData(result) as {
              apiToken: string;
              accountId: string;
            };
            setTestCredentials({
              apiToken: data.apiToken,
              accountId: data.accountId
            });
          } catch {}
        }
      } catch (error) {
      } finally {
        setLoadingTestCreds(false);
      }
    };

    fetchTestCredentials();
  }, []);

  const handleUseTestCredentials = () => {
    if (testCredentials?.apiToken && testCredentials?.accountId) {
      onApiTokenChange(testCredentials.apiToken);
      onAccountIdChange(testCredentials.accountId);
    }
  };

  return (
    <Card className="bg-white/80 backdrop-blur-sm relative overflow-hidden">
      <CrossHatchBackground pattern="large" opacity={0.02} />
      <CardHeader className="relative z-10">
        <h2 className="text-xl font-semibold text-gray-900">Credentials</h2>
        <p className="mt-1 text-sm text-gray-600">
          Enter your Cloudflare API credentials
        </p>
      </CardHeader>
      <CardContent className="relative z-10">
        {testCredentials && (
          <div className="mb-5 p-4 bg-gradient-to-br from-orange-50 to-orange-50/50 border border-orange-200 rounded-lg shadow-sm relative overflow-hidden">
            <CrossHatchBackground pattern="small" opacity={0.03} />
            <div className="relative z-10">
              <div className="mb-3">
                <h3 className="text-sm font-semibold text-orange-900 mb-2">
                  Quick Start with Test Credentials
                </h3>
                <ul className="text-xs text-orange-800 leading-relaxed space-y-1 list-disc list-inside">
                  <li>
                    Test credentials are available for quick exploration and
                    development
                  </li>
                  <li>
                    These are shared resources please use responsibly and avoid
                    abuse
                  </li>
                </ul>
              </div>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleUseTestCredentials}
                disabled={isLoading || loadingTestCreds}
                className="w-full flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Use Test Credentials
              </Button>
            </div>
          </div>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
          className="space-y-5"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              API Token
            </label>
            <Input
              type="password"
              value={apiToken}
              onChange={(e) => onApiTokenChange(e.target.value)}
              placeholder="Enter your Cloudflare API token"
              disabled={isLoading}
              required
              className="w-full"
            />
            {errors.apiToken && (
              <p className="mt-1.5 text-sm text-red-600">{errors.apiToken}</p>
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
              onChange={(e) => onAccountIdChange(e.target.value)}
              placeholder="Enter your Cloudflare Account ID"
              disabled={isLoading}
              required
              className="w-full"
            />
            {errors.accountId && (
              <p className="mt-1.5 text-sm text-red-600">{errors.accountId}</p>
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
              {isLoading ? "Configuring..." : "Configure Credentials"}
            </Button>
          </div>

          <Alert className="relative overflow-hidden">
            <CrossHatchBackground pattern="small" opacity={0.02} />
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
  );
}
