'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { CloudflareLayout } from '../../../components/CloudflareLayout';
import { InstanceLoader } from '../../../../components/ui/Loader';

interface Instance {
  id: string;
  status: string;
  created_on: string;
  modified_on: string;
  started_on?: string;
  ended_on?: string;
  version_id?: string;
  workflow_id?: string;
  result?: any;
  error?: string;
}

export default function WorkflowInstancesPage() {
  const params = useParams();
  const workflowName = params.workflowId as string; // This is now the workflow name
  const [instances, setInstances] = useState<Instance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInstances = async () => {
      try {
        setLoading(true);
        
        // Get instances for this workflow using the workflow name
        const instancesResponse = await fetch(`http://localhost:8787/api/workflows/${workflowName}/instances`);
        const instancesData = await instancesResponse.json();
        
        if (instancesData.success) {
          // Handle Cloudflare API response structure
          const instances = instancesData.data?.result || instancesData.data || [];
          setInstances(Array.isArray(instances) ? instances : []);
        } else {
          setError(instancesData.error || 'Failed to fetch instances');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    if (workflowName) {
      fetchInstances();
    }
  }, [workflowName]);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'running':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'failed':
      case 'error':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'running':
        return '🔄';
      case 'completed':
      case 'success':
        return '✅';
      case 'failed':
      case 'error':
        return '❌';
      case 'pending':
        return '⏳';
      default:
        return '❓';
    }
  };

  if (loading) {
    return (
      <CloudflareLayout>
        <InstanceLoader text="Loading workflow instances..." />
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
      <div className="min-h-screen bg-white">
        {/* Breadcrumbs and Tabs */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center space-x-2 text-sm text-gray-500 mb-4">
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
            </svg>
            <a href="/workflows" className="hover:text-gray-700">Workflows</a>
            <span>/</span>
            <span className="font-medium text-gray-900">{workflowName}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex space-x-8">
              <button className="border-b-2 border-blue-500 pb-2 text-sm font-medium text-blue-600">
                Instances
              </button>
              <button className="border-b-2 border-transparent pb-2 text-sm font-medium text-gray-500 hover:text-gray-700">
                Metrics
              </button>
              <button className="border-b-2 border-transparent pb-2 text-sm font-medium text-gray-500 hover:text-gray-700">
                Settings
              </button>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="w-4 h-4 bg-gray-100 rounded flex items-center justify-center">
                <svg className="h-3 w-3 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <select className="text-sm border border-gray-300 rounded-md px-3 py-1">
                <option>Past 7 days</option>
              </select>
              <select className="text-sm border border-gray-300 rounded-md px-3 py-1">
                <option>All</option>
              </select>
              <button className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h1m4 0h1m-6-8h8a2 2 0 012 2v8a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2z" />
                </svg>
                Trigger
              </button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="px-6 py-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Instances</h3>
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="text-2xl font-bold text-gray-900">0</div>
                  <div className="text-sm text-gray-500">Queued</div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="text-2xl font-bold text-gray-900">0</div>
                  <div className="text-sm text-gray-500">Running</div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="text-2xl font-bold text-gray-900">0</div>
                  <div className="text-sm text-gray-500">Paused</div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="text-2xl font-bold text-gray-900">0</div>
                  <div className="text-sm text-gray-500">Waiting</div>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Ended Instances</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="text-2xl font-bold text-gray-900">1</div>
                  <div className="text-sm text-gray-500">Complete</div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="text-2xl font-bold text-gray-900">0</div>
                  <div className="text-sm text-gray-500">Errored</div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="text-2xl font-bold text-gray-900">0</div>
                  <div className="text-sm text-gray-500">Terminated</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Instances Table */}
        <div className="px-6 pb-6">
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Instance ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Start time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    End time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Wall time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    CPU time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last modified
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {instances.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      No instances found
                    </td>
                  </tr>
                ) : (
                  instances.map((instance) => (
                    <tr key={instance.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(instance.status)}`}>
                          {instance.status === 'errored' ? 'Errored' : 'Completed'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <a
                          href={`/workflows/${workflowName}/instances/${instance.id}`}
                          className="text-sm font-medium text-blue-600 hover:text-blue-500"
                        >
                          {instance.id.substring(0, 8)}...
                        </a>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {instance.created_on ? new Date(instance.created_on).toLocaleString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {instance.modified_on ? new Date(instance.modified_on).toLocaleString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ~1s
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        —
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {instance.modified_on ? `${Math.floor((Date.now() - new Date(instance.modified_on).getTime()) / (1000 * 60))} minutes ago` : 'N/A'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center">
              <span className="text-sm text-gray-700">Items per page:</span>
              <select className="ml-2 text-sm border border-gray-300 rounded-md px-2 py-1">
                <option>25</option>
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <button className="p-2 text-gray-400 hover:text-gray-600">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                </svg>
              </button>
              <button className="p-2 text-gray-400 hover:text-gray-600">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button className="p-2 text-gray-400 hover:text-gray-600">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              <button className="p-2 text-gray-400 hover:text-gray-600">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </CloudflareLayout>
  );
}
