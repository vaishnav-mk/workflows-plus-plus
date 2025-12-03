import Cloudflare from "cloudflare";
import type {
  DeploymentOptions,
  DeploymentProgress,
  DeploymentState,
  DeploymentResult,
  DeploymentProgressCallback,
  BindingDeploymentContext
} from "./types";
import { logger } from "../../core/logging/logger";
import {
  DEPLOYMENT_STEPS_ORDER,
  DeploymentStatus,
  DeploymentStep,
  BindingType
} from "../../core/enums";
import { CLOUDFLARE, CODE_GENERATION } from "../../core/constants";
import {
  transformBindingsForAPI
} from "./binding-deployment";
import { MCP_EMBEDDED_MODULES } from "./mcp-bundles.generated";

export class DeploymentDurableObject {
  private deploymentState: DeploymentState | null = null;
  private sseConnections: Set<ReadableStreamDefaultController> = new Set();
  private readonly state: DurableObjectState;
  private readonly env: { [key: string]: unknown };

  constructor(state: DurableObjectState, env: { [key: string]: unknown }) {
    this.state = state;
    this.env = env;
  }

  // Method to access state if needed in the future
  getState(): DurableObjectState {
    return this.state;
  }

  // Method to access env if needed in the future
  getEnv(): { [key: string]: unknown } {
    return this.env;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;

    if (
      pathname.endsWith("/stream") &&
      request.headers.get("accept") === "text/event-stream"
    ) {
      return this.handleSSE(request);
    }

    if (pathname.endsWith("/deploy") && request.method === "POST") {
      return this.handleDeploy(request);
    }

    if (pathname.endsWith("/status") && request.method === "GET") {
      return this.handleStatus();
    }

    if (request.method === "GET") {
      return this.handleStatus();
    }

    return new Response("Not Found", { status: 404 });
  }

  private async handleSSE(request: Request): Promise<Response> {
    const stream = new ReadableStream({
      start: controller => {
        this.sseConnections.add(controller);

        if (this.deploymentState) {
          this.sendSSEMessage(controller, "state", this.deploymentState);
        }

        const keepaliveInterval = setInterval(() => {
          try {
            controller.enqueue(new TextEncoder().encode(": keepalive\n\n"));
          } catch (e) {
            clearInterval(keepaliveInterval);
            this.sseConnections.delete(controller);
          }
        }, 30000);

        request.signal.addEventListener("abort", () => {
          clearInterval(keepaliveInterval);
          this.sseConnections.delete(controller);
        });
      }
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
        "Access-Control-Allow-Headers": "Cache-Control"
      }
    });
  }

  private sendSSEMessage(controller: ReadableStreamDefaultController, event: string, data: unknown): void {
    try {
      const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
      controller.enqueue(new TextEncoder().encode(message));
    } catch (e) {
      this.sseConnections.delete(controller);
    }
  }

  private broadcastProgress(progress: DeploymentProgress): void {
    for (const controller of this.sseConnections) {
      this.sendSSEMessage(controller, "progress", progress);
    }
  }

  private broadcastState(state: DeploymentState): void {
    for (const controller of this.sseConnections) {
      this.sendSSEMessage(controller, "state", state);
    }
  }

  private async handleDeploy(request: Request): Promise<Response> {
    try {
      const body = (await request.json()) as {
        deploymentId: string;
        workflowId: string;
        options: DeploymentOptions;
        apiToken: string;
        accountId: string;
        subdomain?: string;
      };

      if (
        this.deploymentState &&
        this.deploymentState.status === "in_progress"
      ) {
        return Response.json({
          success: true,
          data: this.deploymentState
        });
      }

      this.deploymentState = {
        deploymentId: body.deploymentId,
        workflowId: body.workflowId,
        status: DeploymentStatus.PENDING,
        progress: [],
        startedAt: new Date().toISOString()
      };

      this.broadcastState(this.deploymentState);

      this.runDeployment(
        body.options,
        body.apiToken,
        body.accountId,
        body.subdomain
      ).catch(error => {
        logger.error(
          "Deployment failed",
          error instanceof Error ? error : new Error(String(error)),
          {
            deploymentId: body.deploymentId,
            workflowId: body.workflowId
          }
        );

        if (this.deploymentState) {
          this.deploymentState.status = DeploymentStatus.FAILED;
          this.deploymentState.error =
            error instanceof Error ? error.message : String(error);
          this.deploymentState.completedAt = new Date().toISOString();
          this.broadcastState(this.deploymentState);
        }
      });

      return Response.json({
        success: true,
        data: {
          deploymentId: body.deploymentId,
          status: "pending"
        }
      });
    } catch (error) {
      logger.error(
        "Failed to start deployment",
        error instanceof Error ? error : new Error(String(error))
      );
      return Response.json(
        {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error"
        },
        { status: 500 }
      );
    }
  }

  private async handleStatus(): Promise<Response> {
    if (!this.deploymentState) {
      return Response.json(
        {
          success: false,
          error: "No deployment found",
          events: DEPLOYMENT_STEPS_ORDER
        },
        { status: 404 }
      );
    }

    return Response.json({
      success: true,
      data: this.deploymentState,
      events: DEPLOYMENT_STEPS_ORDER
    });
  }

  private async runDeployment(
    options: DeploymentOptions,
    apiToken: string,
    accountId: string,
    subdomain?: string
  ): Promise<void> {
    if (!this.deploymentState) {
      throw new Error("Deployment state not initialized");
    }

    this.deploymentState.status = DeploymentStatus.IN_PROGRESS;
    this.broadcastState(this.deploymentState);

    const addProgress: DeploymentProgressCallback = (
      step: DeploymentStep,
      message: string,
      progress: number,
      data?: Record<string, unknown>
    ) => {
      const progressEntry: DeploymentProgress = {
        step,
        message,
        progress,
        timestamp: new Date().toISOString(),
        data
      };
      this.deploymentState!.progress.push(progressEntry);
      this.broadcastProgress(progressEntry);
    };

    try {
      const result = await deployToCloudflare(
        options,
        apiToken,
        accountId,
        subdomain,
        addProgress
      );

      this.deploymentState.status = DeploymentStatus.SUCCESS;
      this.deploymentState.result = result;
      this.deploymentState.completedAt = new Date().toISOString();
      this.broadcastState(this.deploymentState);

      logger.info("Deployment completed successfully", {
        deploymentId: this.deploymentState.deploymentId,
        workflowId: this.deploymentState.workflowId,
        workerUrl: result.workerUrl
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.deploymentState.status = DeploymentStatus.FAILED;
      this.deploymentState.error = errorMessage;
      this.deploymentState.completedAt = new Date().toISOString();
      this.broadcastState(this.deploymentState);

      throw error;
    }
  }
}

/**
 * Cloudflare deployment pipeline:
 * INITIALIZING → CREATING_WORKER → TRANSFORMING_BINDINGS → CREATING_VERSION
 * → DEPLOYING → UPDATING_WORKFLOW → CREATING_INSTANCE → COMPLETED/FAILED.
 */
export async function deployToCloudflare(
  options: DeploymentOptions,
  apiToken: string,
  accountId: string,
  subdomain: string | undefined,
  progress: DeploymentProgressCallback
): Promise<DeploymentResult> {
  const client = new Cloudflare({ apiToken });
  const startTime = Date.now();

  logger.info("Starting workflow deployment", {
    workflowName: options.workflowName,
    scriptName: options.scriptName,
    className: options.className
  });

  progress(DeploymentStep.INITIALIZING, "Starting deployment...", 5);

  try {
    const sanitizedWorkflowName = (options.workflowName || `workflow-${Date.now()}`)
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    const workerName =
      options.scriptName || `${sanitizedWorkflowName}-worker`;
    const workflowName = sanitizedWorkflowName;
    const className =
      options.className || CODE_GENERATION.CLASS_NAME_PATTERN(options.workflowName);
    const scriptFilename = `${workerName}.mjs`;
    const chosenSubdomain = options.subdomain || subdomain || CLOUDFLARE.DEFAULT_SUBDOMAIN;

    // Derive the workflow binding name in the same way as the compiler, so
    // the MCP Durable Object can consistently reference env.<BINDING_NAME>.
    const workflowBindingName =
      `${className.toUpperCase().replace(/[^A-Z0-9]/g, "_")}_WORKFLOW`;

    logger.info("Deployment configuration", {
      workerName,
      workflowName,
      className,
      scriptFilename
    });

    progress(DeploymentStep.CREATING_WORKER, "Creating worker...", 15);
    const worker = await client.workers.beta.workers.create({
      account_id: accountId,
      name: workerName,
      subdomain: { enabled: true },
      observability: { enabled: true }
    });

    logger.info("Worker created", { workerId: worker.id, workerName });
    progress(
      DeploymentStep.WORKER_CREATED,
      `Worker created: ${worker.id}`,
      25,
      { workerId: worker.id }
    );

    progress(DeploymentStep.TRANSFORMING_BINDINGS, "Transforming bindings...", 35);
    const bindingCtx: BindingDeploymentContext = { 
      client, 
      accountId,
      className: className,
      workflowName
    };
    const transformedBindings = await transformBindingsForAPI(
      bindingCtx,
      options.bindings || []
    );
    
    const durableObjectBindings = transformedBindings.filter(
      (b): b is Record<string, unknown> & { type: string; name: string; class_name: string } =>
        b.type === "durable_object_namespace"
    );
    
    // Extract actual exported class names from script and update bindings
    if (durableObjectBindings.length > 0) {
      const exportedClasses = (options.scriptContent.match(/export\s+class\s+(\w+)/g) || [])
        .map(match => match.replace(/export\s+class\s+/, ''));
      
      for (const binding of durableObjectBindings) {
        const expectedClassName = binding.class_name;
        const actualClassName = exportedClasses.find(cls => cls === expectedClassName);
        
        if (!actualClassName) {
          throw new Error(
            `Durable Object class '${expectedClassName}' is not exported in the script. Found classes: ${exportedClasses.join(', ') || 'none'}`
          );
        }
        
        // Update binding with exact class name from script
        binding.class_name = actualClassName;
      }
    }
    
    progress(
      DeploymentStep.BINDINGS_TRANSFORMED,
      `Transformed ${transformedBindings.length} bindings`,
      40
    );

    progress(DeploymentStep.CREATING_VERSION, "Creating version...", 45);

    const modules: Array<{
      name: string;
      content_type: string;
      content_base64: string;
    }> = [
      {
        name: scriptFilename,
        content_type: "application/javascript+module",
        content_base64: base64Encode(options.scriptContent)
      }
    ];

    // Always include the embedded MCP/agents bundles as separate modules.
    logger.info("deployToCloudflare: embedded MCP bundle modules scan result", {
      bundleCount: MCP_EMBEDDED_MODULES.length
    });
    for (const mod of MCP_EMBEDDED_MODULES) {
      const encoded = base64Encode(mod.content);
      modules.push({
        name: mod.name,
        content_type: "application/javascript+module",
        content_base64: encoded
      });
      logger.info("deployToCloudflare: added embedded module", {
        name: mod.name,
        contentLength: mod.content.length,
        base64Length: encoded.length
      });
      // Extra console log for debugging in test scripts
      // eslint-disable-next-line no-console
      console.log("[deployToCloudflare] Module included:", {
        name: mod.name,
        contentLength: mod.content.length,
        base64Length: encoded.length
      });
    }

    logger.info("deployToCloudflare: final modules list", {
      totalModules: modules.length,
      moduleNames: modules.map(m => m.name)
    });
    // eslint-disable-next-line no-console
    console.log("[deployToCloudflare] Total modules:", modules.length);
    
    const migrations: { new_sqlite_classes?: string[]; tag?: string } | undefined = 
      durableObjectBindings.length > 0
        ? {
            new_sqlite_classes: durableObjectBindings.map(b => b.class_name),
            tag: "V1"
          }
        : undefined;
    
    // Two-step deployment required for new durable object classes:
    // 1. Deploy version with migrations (no bindings) to register classes
    // 2. Deploy version with bindings (migrations already applied)
    if (migrations && durableObjectBindings.length > 0) {
      progress(DeploymentStep.CREATING_VERSION, "Creating version with migrations...", 45);
      
      const migrationVersion = await client.workers.beta.workers.versions.create(
        worker.id,
        {
          account_id: accountId,
          main_module: scriptFilename,
          compatibility_date: CODE_GENERATION.WRANGLER_COMPATIBILITY_DATE,
          compatibility_flags: ["nodejs_compat"],
          modules,
          migrations,
          ...(options.assets && Object.keys(options.assets).length > 0 && {
            assets: options.assets
          })
        } as unknown as Parameters<
          (typeof client.workers.beta.workers.versions)["create"]
        >[1]
      );
      
      progress(DeploymentStep.DEPLOYING, "Deploying migration version...", 50);
      await client.workers.scripts.deployments.create(workerName, {
        account_id: accountId,
        strategy: CLOUDFLARE.DEPLOYMENT_STRATEGY,
        versions: [
          {
            percentage: CLOUDFLARE.DEPLOYMENT_PERCENTAGE,
            version_id: migrationVersion.id
          }
        ]
      });
      
      // Wait for migration to be applied
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    const versionConfig: Record<string, unknown> = {
      account_id: accountId,
      main_module: scriptFilename,
      compatibility_date: CODE_GENERATION.WRANGLER_COMPATIBILITY_DATE,
      compatibility_flags: ["nodejs_compat"],
      modules,
      // Ensure the workflow is bound into the Worker environment so the MCP
      // Durable Object can call env.<WORKFLOW_BINDING>.create(...)
      workflows: [
        {
          name: workflowName,
          binding: workflowBindingName,
          class_name: className
        }
      ],
      ...(transformedBindings.length > 0 && { bindings: transformedBindings }),
      ...(options.assets && Object.keys(options.assets).length > 0 && {
        assets: options.assets
      })
    };

    const version =
      await client.workers.beta.workers.versions.create(
        worker.id,
        versionConfig as unknown as Parameters<
          (typeof client.workers.beta.workers.versions)["create"]
        >[1]
      );
    logger.info("Version created", { versionId: version.id });
    progress(
      DeploymentStep.VERSION_CREATED,
      `Version created: ${version.id}`,
      60,
      { versionId: version.id }
    );

    progress(DeploymentStep.DEPLOYING, "Creating deployment...", 70);
    await client.workers.scripts.deployments.create(workerName, {
      account_id: accountId,
      strategy: CLOUDFLARE.DEPLOYMENT_STRATEGY,
      versions: [
        {
          percentage: CLOUDFLARE.DEPLOYMENT_PERCENTAGE,
          version_id: version.id
        }
      ]
    });
    logger.info("Deployment created successfully");
    progress(
      DeploymentStep.DEPLOYMENT_CREATED,
      "Deployment created successfully",
      80
    );

    progress(DeploymentStep.UPDATING_WORKFLOW, "Updating workflow...", 85);
    await client.workflows.update(workflowName, {
      account_id: accountId,
      class_name: className,
      script_name: workerName
    });
    logger.info("Workflow updated successfully");
    progress(
      DeploymentStep.WORKFLOW_UPDATED,
      "Workflow updated successfully",
      90
    );

    progress(
      DeploymentStep.CREATING_INSTANCE,
      "Creating workflow instance...",
      95
    );
    const instanceCreateResponse =
      await client.workflows.instances.create(workflowName, {
        account_id: accountId
      }) as { id?: string; instance?: { id?: string } };

    const instanceId =
      instanceCreateResponse?.id || instanceCreateResponse?.instance?.id;
    logger.info("Instance created", { instanceId: instanceId || "N/A" });

    // Construct a valid Workers.dev URL for the deployed script.
    // - If the chosenSubdomain is exactly "workers.dev", the public URL is
    //   "https://<workerName>.workers.dev/"
    // - If chosenSubdomain already ends with ".workers.dev" (for example
    //   "wishee.workers.dev"), treat it as the full account subdomain and prepend
    //   the worker name: "https://<workerName>.<subdomain>/"
    // - Otherwise, treat chosenSubdomain as the account subdomain part and append
    //   ".workers.dev".
    let workerUrl: string | undefined;
    if (chosenSubdomain) {
      if (chosenSubdomain === "workers.dev") {
        workerUrl = `https://${workerName}.workers.dev/`;
      } else if (chosenSubdomain.endsWith(".workers.dev")) {
        // e.g. "wishee.workers.dev"
        workerUrl = `https://${workerName}.${chosenSubdomain}/`;
      } else {
        // e.g. "wishee" -> "wishee.workers.dev"
        workerUrl = `https://${workerName}.${chosenSubdomain}.workers.dev/`;
      }
    }

    const hasMcpBinding =
      (options.bindings || []).some(b => b.type === BindingType.DURABLE_OBJECT) ||
      durableObjectBindings.length > 0;

    const mcpUrl =
      hasMcpBinding && workerUrl ? `${workerUrl}mcp` : undefined;

    const result: DeploymentResult = {
      workerUrl,
      mcpUrl,
      versionId: version.id,
      instanceId: instanceId || worker.id,
      deploymentId: version.id,
      status: "success",
      bindings: (options.bindings || []).map(b => ({
        name: b.name,
        type: b.type
      }))
    };

    progress(
      DeploymentStep.COMPLETED,
      "Deployment completed successfully",
      100,
      {
        workerUrl: result.workerUrl,
        versionId: result.versionId,
        instanceId: result.instanceId,
        deploymentId: result.deploymentId,
        status: result.status
      }
    );

    const duration = Date.now() - startTime;
    logger.logPerformance("deployment", duration, {
      workflowName,
      workerId: worker.id,
      versionId: version.id,
      instanceId: instanceId || worker.id
    });

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : String(error);

    progress(
      DeploymentStep.FAILED,
      `Deployment failed: ${errorMessage}`,
      100,
      { error: errorMessage }
    );
    logger.error(
      "Deployment failed",
      error instanceof Error ? error : new Error(errorMessage),
      {
        workflowName: options.workflowName,
        duration
      }
    );

    throw error;
  }
}

function base64Encode(str: string): string {
  if (
    typeof globalThis !== "undefined" &&
    (globalThis as { btoa?: (s: string) => string }).btoa
  ) {
    return (globalThis as { btoa: (s: string) => string }).btoa(
      unescape(encodeURIComponent(str))
    );
  }
  return Buffer.from(str, "utf-8").toString("base64");
}
