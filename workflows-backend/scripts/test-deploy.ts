/**
 * Test script to deploy a simple worker with a durable object
 * This helps us verify that our deployment strategy works correctly
 * 
 * Usage:
 *   CLOUDFLARE_API_TOKEN=your_token CLOUDFLARE_ACCOUNT_ID=your_account_id npx tsx scripts/test-deploy.ts
 */

import { deployToCloudflare } from '../src/services/deployment/deployment-durable-object';
import { BindingType, DeploymentStep } from '../src/core/enums';
import type { DeploymentOptions, DeploymentProgressCallback } from '../src/services/deployment/types';
import { WorkflowCompiler } from '../src/services/compiler/workflow-compiler';
import { runPromise } from '../src/core/effect/runtime';
import { join, dirname } from 'node:path';
import { writeFileSync, mkdirSync, cpSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function bundleMcpBundles(projectRoot: string) {
  console.log('Bundling MCP dependencies via scripts/bundle-mcp.js ...');
  const result = spawnSync(
    'node',
    [join('scripts', 'bundle-mcp.js')],
    {
      cwd: projectRoot,
      stdio: 'inherit'
    }
  );

  if (result.status !== 0) {
    console.error('MCP bundling failed. Aborting deployment.');
    process.exit(result.status ?? 1);
  }
}

async function testDeploy() {
  const projectRoot = join(__dirname, '..');

  // Always ensure MCP bundles are up-to-date before compiling and deploying.
  bundleMcpBundles(projectRoot);

  // Inline test workflow definition (from user)
  const workflow = {
    name: 'Workflow',
    nodes: [
      {
        id: 'step_entry_0',
        type: 'mcp-tool-input',
        data: {
          label: 'MCP Tool Input',
          type: 'mcp-tool-input',
          icon: 'Input',
          status: 'idle',
          config: {}
        },
        config: {}
      },
      {
        id: 'step_http_request_1',
        type: 'http-request',
        data: {
          label: 'HTTP Request',
          type: 'http-request',
          icon: 'Globe',
          status: 'idle',
          config: {
            url: 'https://api.jolpi.ca/ergast/f1/current/driverStandings.json',
            method: 'GET'
          }
        },
        config: {
          url: 'https://api.jolpi.ca/ergast/f1/current/driverStandings.json',
          method: 'GET'
        }
      },
      {
        id: 'step_return_2',
        type: 'mcp-tool-output',
        data: {
          label: 'MCP Tool Output',
          type: 'mcp-tool-output',
          icon: 'Output',
          status: 'idle',
          config: {}
        },
        config: {}
      }
    ],
    edges: [
      {
        id: 'step_entry_0-step_http_request_1',
        source: 'step_entry_0',
        target: 'step_http_request_1'
      },
      {
        id: 'step_http_request_1-step_return_2',
        source: 'step_http_request_1',
        target: 'step_return_2'
      }
    ],
    options: {
      workflowId: 'workflow-shield-diamond-mountain34geggrg'
    }
  };

  const apiToken = "y8WYQMwuNQ-2nDDQYsxPeB6Q5hzR601I7zPpXYDC";
  const accountId = "c714a393dbfabeb858a7dea729b5e8f8";

  if (!apiToken || !accountId) {
    console.error('Missing required environment variables:');
    console.error('  CLOUDFLARE_API_TOKEN');
    console.error('  CLOUDFLARE_ACCOUNT_ID');
    process.exit(1);
  }

  // Compile workflow to worker code (with MCP enabled)
  const timestamp = Date.now();
  const workflowId = workflow.options?.workflowId ?? `workflow-${timestamp}`;
  const className = 'CrystalGemQuestWorkflow';
  const workflowBindingName =
    `${className.toUpperCase().replace(/[^A-Z0-9]/g, '_')}_WORKFLOW`;
  const compileEffect = WorkflowCompiler.compile(
    {
      name: workflow.name,
      nodes: workflow.nodes,
      edges: workflow.edges
    },
    {
      enableLogging: true,
      enableMCP: true,
      className,
      workflowId
    }
  );

  console.log('Compiling workflow to worker code...');
  const compileResult = await runPromise(compileEffect);

  if (compileResult.status !== 'success') {
    console.error('Workflow compilation failed:', compileResult.errors);
    process.exit(1);
  }

  const scriptContent = compileResult.tsCode;

  // Write the compiled worker to test-mcp-local for local wrangler testing.
  const localRoot = join(__dirname, '..', 'test-mcp-local');
  const localWorkerPath = join(localRoot, 'worker.mjs');
  const localBundlesRoot = join(localRoot, 'bundles');
  const projectBundlesRoot = join(__dirname, '..', 'bundles');
  const localWranglerPath = join(localRoot, 'wrangler.jsonc');

  // Ensure test-mcp-local mirrors what is actually deployed:
  // - overwrite worker.mjs
  // - fully replace the bundles directory with the full @bundles tree
  mkdirSync(localRoot, { recursive: true });
  rmSync(localBundlesRoot, { recursive: true, force: true });
  cpSync(projectBundlesRoot, localBundlesRoot, { recursive: true });

  writeFileSync(localWorkerPath, scriptContent, 'utf-8');
const wranglerConfig = {
    name: 'workflow-row',
    main: 'worker.mjs',
    compatibility_date: '2025-10-22',
    workflows: [
      {
        name: className,
        binding: workflowBindingName,
        class_name: className
      }
    ],
    durable_objects: {
      bindings: [
        {
          class_name: `${className}MCP`,
          name: 'MCP_OBJECT'
        }
      ]
    },
    migrations: [
      {
        new_sqlite_classes: [`${className}MCP`],
        tag: 'V1'
      }
    ],
    compatibility_flags: ['nodejs_compat']
  };

  writeFileSync(
    localWranglerPath,
    JSON.stringify(wranglerConfig, null, 2),
    'utf-8'
  );

  console.log(`Synced local test worker to ${localWorkerPath}`);
  console.log(`Synced local wrangler config to ${localWranglerPath}`);

  // Create deployment options with unique name based on workflow
  const uniqueName = `${workflow.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${timestamp}`;

  const options: DeploymentOptions = {
    workflowName: workflow.name,
    className,
    scriptName: `${uniqueName}-worker`,
    scriptContent: scriptContent,
    bindings: compileResult.bindings.map(b => ({
      name: b.name,
      type: b.type
    }))
  };

  // Progress callback
  const progress: DeploymentProgressCallback = (step: DeploymentStep, message: string, percentage: number, data?: unknown) => {
    console.log(`[${percentage}%] ${step}: ${message}`);
    if (data) {
      console.log('  Data:', JSON.stringify(data, null, 2));
    }
  };

  try {
    console.log('Starting compiled workflow deployment...');
    console.log('Workflow name:', workflow.name);
    console.log('Workflow ID:', workflowId);
    console.log('Generated class name:', className);
    console.log('Script content length:', scriptContent.length);
    console.log('Bindings:', JSON.stringify(options.bindings, null, 2));
    console.log('');

    const result = await deployToCloudflare(
      options,
      apiToken,
      accountId,
      undefined, // subdomain
      progress
    );

    console.log('');
    console.log('✅ Deployment successful!');
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('');
    console.error('❌ Deployment failed!');
    console.error('Error:', error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.stack) {
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  }
}

// Run the test
testDeploy().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});

