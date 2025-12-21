"use client";

import { Card, CardHeader, CardContent, Button, Input, Alert, AlertTitle } from "@/components";
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
  return (
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
        <h2 className="text-xl font-semibold text-gray-900">Credentials</h2>
        <p className="mt-1 text-sm text-gray-600">
          Enter your Cloudflare API credentials
        </p>
      </CardHeader>
      <CardContent className="relative z-10">
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
  );
}

