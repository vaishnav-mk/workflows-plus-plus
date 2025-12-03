'use client';

import React, { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardContent, Button, Input, Alert, AlertTitle } from '@/components';
import { toast } from '../../stores/toastStore';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8787/api';

export default function SetupPage() {
  const router = useRouter();
  const [apiToken, setApiToken] = useState('');
  const [accountId, setAccountId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ apiToken?: string; accountId?: string }>({});

  const validate = (): boolean => {
    const newErrors: { apiToken?: string; accountId?: string } = {};
    
    if (!apiToken.trim()) {
      newErrors.apiToken = 'API token is required';
    }
    
    if (!accountId.trim()) {
      newErrors.accountId = 'Account ID is required';
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

    try {
      const response = await fetch(`${API_BASE}/setup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          apiToken: apiToken.trim(),
          accountId: accountId.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Credentials configured successfully');
        router.push('/builder');
      } else {
        toast.error(data.message || 'Failed to configure credentials');
        if (data.error === 'Invalid credentials') {
          setErrors({
            apiToken: 'Invalid API token or Account ID',
            accountId: 'Invalid API token or Account ID',
          });
        }
      }
    } catch (error) {
      console.error('Setup error:', error);
      toast.error('An error occurred while configuring credentials');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader>
            <h1 className="text-2xl font-semibold text-gray-900">
              Cloudflare Setup
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Configure your Cloudflare API credentials to get started
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Input
                  type="password"
                  value={apiToken}
                  onChange={(e) => setApiToken(e.target.value)}
                  placeholder="Enter your Cloudflare API token"
                  disabled={isLoading}
                  required
                />
                {errors.apiToken && (
                  <p className="mt-1 text-sm text-red-600">{errors.apiToken}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Your Cloudflare API token with appropriate permissions
                </p>
              </div>

              <div>
                <Input
                  type="text"
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  placeholder="Enter your Cloudflare Account ID"
                  disabled={isLoading}
                  required
                />
                {errors.accountId && (
                  <p className="mt-1 text-sm text-red-600">{errors.accountId}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Your Cloudflare Account ID
                </p>
              </div>

              <div className="pt-4">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? 'Configuring...' : 'Configure Credentials'}
                </Button>
              </div>

              <Alert>
                <AlertTitle>Where to find these:</AlertTitle>
                <ul className="list-disc list-inside space-y-1 ml-2 text-sm mt-2">
                  <li>
                    API Token: Create one at{' '}
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
                    Account ID: Found in your{' '}
                    <a
                      href="https://dash.cloudflare.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      Cloudflare Dashboard
                    </a>{' '}
                    sidebar
                  </li>
                </ul>
              </Alert>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
