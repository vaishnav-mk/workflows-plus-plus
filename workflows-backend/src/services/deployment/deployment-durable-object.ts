import Cloudflare from "cloudflare";
import {
  DeploymentOptions,
  DeploymentProgress,
  DeploymentState,
  DeploymentResult,
  DeploymentProgressCallback,
  BindingDeploymentContext
} from "../../core/types";
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
import { getSSECorsHeaders } from "../../core/cors.config";

export class DeploymentDurableObject {
  private deploymentState: DeploymentState | null = null;
  private sseConnections: Set<ReadableStreamDefaultController> = new Set();
  private state: DurableObjectState;
  private env: { [key: string]: unknown };
  private deploymentId: string | null = null;

  constructor(state: DurableObjectState, env: { [key: string]: unknown }) {
    this.state = state;
    this.env = env;

    // Initialize state from storage to handle hibernation/eviction
    // This ensures the DO can recover its state after being evicted from memory
    state.blockConcurrencyWhile(async () => {
      try {
        logger.info("DeploymentDO constructor - loading state from storage");
        const stored = await this.state.storage.get<DeploymentState>("deploymentState");
        if (stored) {
          this.deploymentState = stored;
          this.deploymentId = stored.deploymentId;
          logger.info("Loaded deployment state from storage", {
            deploymentId: this.deploymentId,
            status: stored.status,
            workflowId: stored.workflowId
          });
        } else {
          logger.info("No deployment state found in storage - new DO instance");
        }
      } catch (error) {
        logger.error("Failed to load deployment state from storage", 
          error instanceof Error ? error : new Error(String(error)));
      }
    });
  }


  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;

    logger.info("DeploymentDO fetch called", {
      pathname,
      method: request.method,
      hasDeploymentState: !!this.deploymentState,
      deploymentId: this.deploymentId
    });

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

    if (pathname.endsWith("/list") && request.method === "GET") {
      return this.handleList();
    }

    if (pathname.endsWith("/register") && request.method === "POST") {
      return this.handleRegister(request);
    }

    if (request.method === "GET") {
      return this.handleStatus();
    }

    return new Response("Not Found", { status: 404 });
  }

  private async handleSSE(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const tokenFromQuery = url.searchParams.get("token");
    const authHeader = request.headers.get("Authorization");
    const tokenFromHeader = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;
    
    if (!tokenFromQuery && !tokenFromHeader) {
      return new Response("Unauthorized", { status: 401 });
    }

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

    const origin = request.headers.get("Origin");
    const headers: HeadersInit = {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      ...getSSECorsHeaders(origin, "GET", ["Cache-Control"])
    };
    return new Response(stream, { headers });
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

      logger.info("Deploy request received", {
        deploymentId: body.deploymentId,
        workflowId: body.workflowId,
        currentState: this.deploymentState?.status || "none"
      });

      // Check storage for existing deployment state
      const existingState = await this.state.storage.get<DeploymentState>("deploymentState");
      if (existingState && existingState.status === "in_progress") {
        logger.info("Deployment already in progress", {
          deploymentId: existingState.deploymentId
        });
        return Response.json({
          success: true,
          data: existingState
        });
      }

      // Initialize the deployment state
      this.deploymentId = body.deploymentId;
      this.deploymentState = {
        deploymentId: body.deploymentId,
        workflowId: body.workflowId,
        status: DeploymentStatus.PENDING,
        progress: [],
        startedAt: new Date().toISOString()
      };

      // Persist immediately before starting async work
      await this.state.storage.put("deploymentState", this.deploymentState);
      logger.info("Deployment state initialized and persisted", {
        deploymentId: body.deploymentId
      });
      
      this.broadcastState(this.deploymentState);

      this.runDeployment(
        body.options,
        body.apiToken,
        body.accountId,
        body.subdomain
      ).catch(async error => {
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
          
          // Persist the failed state
          await this.state.storage.put("deploymentState", this.deploymentState);
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

  private async handleList(): Promise<Response> {
    try {
      const registry = (await this.state.storage.get<string[]>("deployment_registry")) || [];
      logger.info("Listing deployments from registry", { 
        count: registry.length, 
        deployments: registry,
        storageKeys: await this.state.storage.list().then(m => Array.from(m.keys()))
      });
      return Response.json({
        success: true,
        deployments: registry
      });
    } catch (error) {
      logger.error("Failed to list deployments", error instanceof Error ? error : new Error(String(error)));
      return Response.json({
        success: false,
        error: String(error),
        deployments: []
      }, { status: 500 });
    }
  }

  private async handleRegister(request: Request): Promise<Response> {
    try {
      const body = await request.json() as { deploymentId: string };
      logger.info("Registering deployment", { deploymentId: body.deploymentId });
      
      const registry = (await this.state.storage.get<string[]>("deployment_registry")) || [];
      logger.info("Current registry", { registry, count: registry.length });
      
      if (!registry.includes(body.deploymentId)) {
        registry.push(body.deploymentId);
        await this.state.storage.put("deployment_registry", registry);
        logger.info("Deployment added to registry", { 
          deploymentId: body.deploymentId, 
          newCount: registry.length 
        });
      } else {
        logger.info("Deployment already in registry", { deploymentId: body.deploymentId });
      }
      
      return Response.json({ success: true, registered: true, count: registry.length });
    } catch (error) {
      logger.error("Failed to register deployment", error instanceof Error ? error : new Error(String(error)));
      return Response.json({ success: false, error: String(error) }, { status: 500 });
    }
  }

  private async handleStatus(): Promise<Response> {
    // Always try to load from storage first to ensure we have the latest state
    // This is critical for deployed workers where the DO might be in a different location
    const stored = await this.state.storage.get<DeploymentState>("deploymentState");
    
    if (stored) {
      this.deploymentState = stored;
      logger.info("Status check - loaded from storage", {
        deploymentId: stored.deploymentId,
        status: stored.status
      });
    } else if (!this.deploymentState) {
      logger.warn("Status check - no deployment found in storage or memory");
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
    await this.state.storage.put("deploymentState", this.deploymentState);
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
      this.state.storage.put("deploymentState", this.deploymentState).catch(err => {
        logger.error("Failed to persist progress", err);
      });
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
      
      await this.state.storage.put("deploymentState", this.deploymentState);
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
      
      await this.state.storage.put("deploymentState", this.deploymentState);
      this.broadcastState(this.deploymentState);

      throw error;
    }
  }
}

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
      client: {
        kv: client.kv,
        d1: undefined 
      }, 
      accountId,
      apiToken,
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

    if (options.mcpEnabled) {
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
        logger.debug(`[deployToCloudflare] Module included: ${mod.name}`, {
          contentLength: mod.content.length,
          base64Length: encoded.length
        });
      }
    } else {
      logger.info("deployToCloudflare: MCP disabled, skipping MCP bundle modules");
    }

    logger.info("deployToCloudflare: final modules list", {
      totalModules: modules.length,
      moduleNames: modules.map(m => m.name)
    });
    logger.debug(`[deployToCloudflare] Total modules: ${modules.length}`);
    
    const migrations: { new_sqlite_classes?: string[]; tag?: string } | undefined = 
      durableObjectBindings.length > 0
        ? {
            new_sqlite_classes: durableObjectBindings.map(b => b.class_name),
            tag: "V1"
          }
        : undefined;
    
    if (migrations && durableObjectBindings.length > 0) {
      progress(DeploymentStep.CREATING_VERSION, "Setting up Durable Objects...", 45);
      
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
      
      logger.info("Migration version created, deploying...", { versionId: migrationVersion.id });
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
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      progress(DeploymentStep.CREATING_VERSION, "Durable Objects ready, creating workflow version...", 50);
    } else {
      progress(DeploymentStep.CREATING_VERSION, "Creating version...", 45);
    }
    
    const versionConfig: Record<string, unknown> = {
      account_id: accountId,
      main_module: scriptFilename,
      compatibility_date: CODE_GENERATION.WRANGLER_COMPATIBILITY_DATE,
      compatibility_flags: ["nodejs_compat"],
      modules,
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

    let workerUrl: string | undefined;
    if (chosenSubdomain) {
      if (chosenSubdomain === "workers.dev") {
        workerUrl = `https://${workerName}.workers.dev/`;
      } else if (chosenSubdomain.endsWith(".workers.dev")) {
        workerUrl = `https://${workerName}.${chosenSubdomain}/`;
      } else {
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
