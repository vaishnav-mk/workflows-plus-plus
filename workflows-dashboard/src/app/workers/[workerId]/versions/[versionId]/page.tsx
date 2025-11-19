'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { CloudflareLayout } from '../../../../components/CloudflareLayout';
import { WorkflowLoader } from '../../../../../components/ui/Loader';
import { useApi } from '../../../../../hooks/useApi';

interface Version {
  id: string;
  created_on: string;
  number: number;
  compatibility_date?: string;
  main_module?: string;
  annotations?: {
    'workers/triggered_by'?: string;
    'workers/message'?: string;
    'workers/tag'?: string;
  };
  usage_model?: string;
  source?: string;
  modules?: Array<{
    name: string;
    content_type: string;
    content_base64: string;
  }>;
  bindings?: Array<{
    name: string;
    type: string;
    text?: string;
    json?: boolean;
  }>;
}

interface Worker {
  id: string;
  name: string;
  created_on: string;
  modified_on: string;
}

export default function VersionDetailPage() {
  const params = useParams();
  const workerId = params.workerId as string;
  const versionId = params.versionId as string;
  
  const [worker, setWorker] = useState<Worker | null>(null);
  const [version, setVersion] = useState<Version | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { fetchWorker, fetchWorkerVersion } = useApi();

  useEffect(() => {
    const run = async () => {
      if (!workerId || !versionId) return;
      setLoading(true);
      const workerRes = await fetchWorker(workerId);
      const w = workerRes.data;
      if (w?.success) {
        setWorker(w.data);
      } else {
        setError(w?.error || workerRes.error || 'Failed to fetch worker');
        setLoading(false);
        return;
      }

      const versionRes = await fetchWorkerVersion(workerId, versionId, 'modules');
      const v = versionRes.data;
      if (v?.success) {
        setVersion(v.data);
        setError(null);
      } else {
        setError(v?.error || versionRes.error || 'Failed to fetch version');
      }
      setLoading(false);
    };
    run();
  }, [fetchWorker, fetchWorkerVersion, workerId, versionId]);

  if (loading) {
    return (
      <CloudflareLayout>
        <WorkflowLoader text="Loading version details..." />
      </CloudflareLayout>
    );
  }

  if (error) {
    return (
      <CloudflareLayout>
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">{error}</div>
              </div>
            </div>
          </div>
        </div>
      </CloudflareLayout>
    );
  }

  return (
    <CloudflareLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <nav className="flex" aria-label="Breadcrumb">
                <ol className="flex items-center space-x-4">
                  <li>
                    <div>
                      <a href="/workers" className="text-gray-400 hover:text-gray-500">
                        Workers
                      </a>
                    </div>
                  </li>
                  <li>
                    <div className="flex items-center">
                      <svg className="flex-shrink-0 h-5 w-5 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                      <a href={`/workers/${workerId}/versions`} className="ml-4 text-sm font-medium text-gray-500 hover:text-gray-700">
                        {worker?.name}
                      </a>
                    </div>
                  </li>
                  <li>
                    <div className="flex items-center">
                      <svg className="flex-shrink-0 h-5 w-5 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="ml-4 text-sm font-medium text-gray-500">v{version?.number}</span>
                    </div>
                  </li>
                </ol>
              </nav>
              <h1 className="mt-2 text-3xl font-bold text-gray-900">{worker?.name} v{version?.number}</h1>
              <p className="mt-2 text-base text-gray-500">
                Version details and configuration
              </p>
            </div>
            <div className="flex space-x-3">
              <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                Deploy
              </button>
              <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                Edit
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 px-6 pb-8">
          {/* Version Details (3/4 width) */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Version Information</h3>
              </div>
              <div className="px-6 py-4">
                <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Version ID</dt>
                    <dd className="mt-1 text-sm text-gray-900 font-mono">{version?.id}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Version Number</dt>
                    <dd className="mt-1 text-sm text-gray-900">v{version?.number}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Created</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {version?.created_on ? new Date(version.created_on).toLocaleString() : 'N/A'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Status</dt>
                    <dd className="mt-1">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Active
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Compatibility Date</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {version?.compatibility_date || 'N/A'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Main Module</dt>
                    <dd className="mt-1 text-sm text-gray-900 font-mono">
                      {version?.main_module || 'N/A'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Usage Model</dt>
                    <dd className="mt-1">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        version?.usage_model === 'standard' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {version?.usage_model || 'N/A'}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Source</dt>
                    <dd className="mt-1">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        version?.source === 'api' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {version?.source || 'N/A'}
                      </span>
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Annotations Section */}
            {version?.annotations && Object.keys(version.annotations).length > 0 && (
              <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Annotations</h3>
                </div>
                <div className="px-6 py-4">
                  <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                    {version.annotations['workers/triggered_by'] && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Triggered By</dt>
                        <dd className="mt-1 text-sm text-gray-900">{version.annotations['workers/triggered_by']}</dd>
                      </div>
                    )}
                    {version.annotations['workers/message'] && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Message</dt>
                        <dd className="mt-1 text-sm text-gray-900">{version.annotations['workers/message']}</dd>
                      </div>
                    )}
                    {version.annotations['workers/tag'] && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Tag</dt>
                        <dd className="mt-1 text-sm text-gray-900">{version.annotations['workers/tag']}</dd>
                      </div>
                    )}
                  </dl>
                </div>
              </div>
            )}

            {/* Bindings Section */}
            {version?.bindings && version.bindings.length > 0 && (
              <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Environment Variables & Bindings</h3>
                </div>
                <div className="px-6 py-4">
                  <div className="space-y-4">
                    {version.bindings.map((binding, index) => (
                      <div key={index} className="border border-gray-200 rounded-md p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-medium text-gray-900">{binding.name}</h4>
                          <div className="flex items-center space-x-2">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              binding.type === 'plain_text' 
                                ? 'bg-blue-100 text-blue-800' 
                                : binding.type === 'json'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {binding.type}
                            </span>
                            {binding.json && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                JSON
                              </span>
                            )}
                          </div>
                        </div>
                        {binding.text && (
                          <div className="mt-2">
                            <pre className="text-sm text-gray-900 bg-gray-50 rounded p-2 overflow-x-auto">
                              {binding.json ? JSON.stringify(JSON.parse(binding.text), null, 2) : binding.text}
                            </pre>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Code Section */}
            <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Code</h3>
              </div>
              <div className="px-6 py-4">
                {version?.modules && version.modules.length > 0 ? (
                  <div className="space-y-4">
                    {version.modules.map((module, index) => (
                      <div key={index} className="bg-gray-50 rounded-md p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-medium text-gray-900">{module.name}</h4>
                          <span className="text-xs text-gray-500">{module.content_type}</span>
                        </div>
                        <pre className="text-sm text-gray-900 whitespace-pre-wrap overflow-x-auto">
                          {atob(module.content_base64)}
                        </pre>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-md p-4">
                    <pre className="text-sm text-gray-900 whitespace-pre-wrap">
                      {`// Worker code for ${worker?.name} v${version?.number}
export default {
  async fetch(request) {
    return new Response('Hello World!');
  }
};`}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Actions Section (1/4 width) */}
          <div className="lg:col-span-1">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Actions</h2>
            
            <div className="space-y-4">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Deployment</h3>
                <div className="space-y-2">
                  <button className="w-full px-3 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                    Deploy to Production
                  </button>
                  <button className="w-full px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                    Deploy to Staging
                  </button>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Management</h3>
                <div className="space-y-2">
                  <button className="w-full px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                    Edit Version
                  </button>
                  <button className="w-full px-3 py-2 text-sm font-medium text-red-700 bg-white border border-red-300 rounded-md hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">
                    Delete Version
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Worker Details</h3>
                <dl className="space-y-2">
                  <div>
                    <dt className="text-xs font-medium text-gray-500">Worker ID</dt>
                    <dd className="text-sm text-gray-900 font-mono">{worker?.id}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-gray-500">Worker Name</dt>
                    <dd className="text-sm text-gray-900">{worker?.name}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>
    </CloudflareLayout>
  );
}
