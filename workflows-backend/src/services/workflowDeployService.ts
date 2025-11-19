export type WorkflowDeployInput = {
  workflowName?: string;
  className?: string;
  scriptName?: string;
  subdomain?: string;
  scriptContent?: string;
  bindings?: Array<Record<string, any>>;
  assets?: Record<string, any>;
};

export type WorkflowDeployResult = {
  workerUrl?: string;
  versionId?: string;
  instanceId?: string;
};
import Cloudflare from 'cloudflare';

export class WorkflowDeployService {
  constructor(private opts: { apiToken: string; accountId: string; subdomain?: string }) {}

  async deployAndTrigger(input: WorkflowDeployInput): Promise<WorkflowDeployResult> {
    console.log(`[DeployService] Initializing deployment...`);
    
    const sanitizedWorkflowName = (input.workflowName || `workflow-${Date.now()}`)
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
    const workerName = input.scriptName || `${sanitizedWorkflowName}-worker`;
    const workflowName = sanitizedWorkflowName;
    const className = input.className || `${sanitizedWorkflowName.charAt(0).toUpperCase()}${sanitizedWorkflowName.slice(1)}Workflow`;
    const scriptFilename = `${workerName}.mjs`;

    console.log(`[DeployService] Worker name: ${workerName}`);
    console.log(`[DeployService] Workflow name: ${workflowName}`);
    console.log(`[DeployService] Script filename: ${scriptFilename}`);

    const client = new Cloudflare({ apiToken: this.opts.apiToken });

    const scriptContent = input.scriptContent;
    if (!scriptContent) {
      console.log(`[DeployService] Error: Script content is required`);
      throw new Error('Script content is required');
    }
    console.log(`[DeployService] Script content length: ${scriptContent.length} characters`);
    
    console.log(`[DeployService] Creating worker: ${workerName}...`);
    const worker = await client.workers.beta.workers.create({
      account_id: this.opts.accountId,
      name: workerName,
      subdomain: { enabled: false },
      observability: { enabled: true }
    });
    console.log(`[DeployService] Worker created with ID: ${worker.id}`);

    console.log(`[DeployService] Transforming bindings...`);
    const transformedBindings = await this.transformBindingsForAPI(client, input.bindings || []);
    console.log(`[DeployService] Transformed ${transformedBindings.length} binding(s)`);

    console.log(`[DeployService] Preparing version configuration...`);
    const versionConfig: any = {
      account_id: this.opts.accountId,
      main_module: scriptFilename,
      compatibility_date: new Date().toISOString().split('T')[0]!,
      modules: [
        {
          name: scriptFilename,
          content_type: 'application/javascript+module',
          content_base64: (globalThis as any).btoa
            ? (globalThis as any).btoa(unescape(encodeURIComponent(scriptContent)))
            : btoa(unescape(encodeURIComponent(scriptContent)))
        }
      ]
    };

    if (transformedBindings.length > 0) {
      versionConfig.bindings = transformedBindings;
      console.log(`[DeployService] Added ${transformedBindings.length} binding(s) to version config`);
    }

    if (input.assets && Object.keys(input.assets).length > 0) {
      versionConfig.assets = input.assets;
      console.log(`[DeployService] Added assets to version config`);
    }

    console.log(`[DeployService] Creating worker version...`);
    const version = await client.workers.beta.workers.versions.create(worker.id, versionConfig);
    console.log(`[DeployService] Version created with ID: ${version.id}`);

    console.log(`[DeployService] Creating deployment (100% rollout)...`);
    await client.workers.scripts.deployments.create(workerName, {
      account_id: this.opts.accountId,
      strategy: 'percentage',
      versions: [
        {
          percentage: 100,
          version_id: version.id
        }
      ]
    });
    console.log(`[DeployService] Deployment created successfully`);

    console.log(`[DeployService] Updating workflow: ${workflowName}...`);
    await client.workflows.update(workflowName, {
      account_id: this.opts.accountId,
      class_name: className,
      script_name: workerName
    });
    console.log(`[DeployService] Workflow updated successfully`);

    console.log(`[DeployService] Creating workflow instance...`);
    const instanceCreateResponse = await client.workflows.instances.create(workflowName, {
      account_id: this.opts.accountId
    } as any);
    const instanceId = (instanceCreateResponse as any)?.id || (instanceCreateResponse as any)?.instance?.id;
    console.log(`[DeployService] Instance created with ID: ${instanceId || 'N/A'}`);

    const chosenSubdomain = input.subdomain || this.opts.subdomain;
    const workerUrl = chosenSubdomain
      ? `https://${workerName}.${chosenSubdomain}.workers.dev/`
      : undefined;

    if (workerUrl) {
      console.log(`[DeployService] Worker URL: ${workerUrl}`);
    }

    console.log(`[DeployService] Deployment process completed`);
    
    return {
      workerUrl,
      versionId: version.id,
      instanceId: instanceId || worker?.id
    };
  }

  private async transformBindingsForAPI(
    client: Cloudflare,
    bindings: Array<Record<string, any>>
  ): Promise<Array<Record<string, any>>> {
    console.log(`[DeployService] Processing ${bindings.length} binding(s) for transformation...`);
    
    const transformed = await Promise.all(
      bindings.map(async (binding) => {
        const bindingName = binding.name;
        const internalType = binding.type?.toUpperCase();
        console.log(`[DeployService] Transforming binding: ${bindingName} (type: ${internalType})`);

        switch (internalType) {
          case 'KV': {
            let namespaceId = binding.namespace_id;
            
            if (!namespaceId) {
              const namespaceTitle = binding.namespace_title || `${bindingName} Namespace`;
              console.log(`[DeployService] Finding or creating KV namespace: ${namespaceTitle}`);
              namespaceId = await this.findOrCreateKVNamespace(client, namespaceTitle);
            }

            return {
              type: 'kv_namespace',
              name: bindingName,
              namespace_id: namespaceId
            };
          }
          
          case 'D1': {
            const databaseId = binding.database_id;
            
            if (!databaseId) {
              console.log(`[DeployService] Skipping D1 binding ${bindingName}: no database_id provided`);
              return null;
            }

            return {
              type: 'd1_database',
              name: bindingName,
              database_id: databaseId
            };
          }

          default:
            const { usage, nodeCount, nodes, usedBy, description, ...apiBinding } = binding;
            return apiBinding;
        }
      })
    );

    const filtered = transformed.filter((b): b is Record<string, any> => b !== null);
    console.log(`[DeployService] Binding transformation complete: ${filtered.length} binding(s) ready`);
    
    return filtered;
  }

  private async findOrCreateKVNamespace(
    client: Cloudflare,
    title: string
  ): Promise<string> {
    try {
      console.log(`[DeployService] Searching for existing KV namespace: ${title}`);
      const namespaces = await client.kv.namespaces.list({
        account_id: this.opts.accountId
      });

      const existingNamespace = namespaces.result?.find(
        (ns: any) => ns.title === title
      );

      if (existingNamespace) {
        console.log(`[DeployService] Found existing KV namespace: ${existingNamespace.id}`);
        return existingNamespace.id;
      }

      console.log(`[DeployService] Creating new KV namespace: ${title}`);
      const newNamespace = await client.kv.namespaces.create({
        account_id: this.opts.accountId,
        title: title
      });
      console.log(`[DeployService] KV namespace created: ${newNamespace.id}`);

      return newNamespace.id;
    } catch (error) {
      console.log(`[DeployService] Error finding/creating KV namespace: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new Error(
        `Failed to find or create KV namespace "${title}": ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}
