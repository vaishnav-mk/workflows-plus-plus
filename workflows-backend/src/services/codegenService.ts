import { Workflow, CodeGenerationResult } from '../types/workflow';
import { NodeRegistry } from '../nodes/registry';

export class CodegenService {
  generateWorkerCode(_workflow: Workflow, opts?: { desiredWorkflowName?: string }): CodeGenerationResult {
    const { code: workerTs, className, bindings } = this.generateWorkerJavaScript(_workflow, opts);
    const wranglerJsonc = this.generateWranglerConfig(_workflow, opts?.desiredWorkflowName);

    return {
      workerTs,
      wranglerJsonc,
      className,
      bindings
    };
  }

  generateMCPServerManifest(_workflow: Workflow): any {
    const mcpInputNode = _workflow.nodes?.find(n => n.type === 'mcp-tool-input');
    if (!mcpInputNode) {
      return null;
    }

    const config = mcpInputNode.data?.config || {};
    const workflowName = this.sanitizeName(_workflow.name || 'workflow');
    const toolName = config.toolName || `${workflowName}_tool`;
    const description = config.description || `Execute ${_workflow.name || 'workflow'} via MCP`;
    const parameters = Array.isArray(config.parameters) ? config.parameters : [];

    const properties: Record<string, any> = {};
    const required: string[] = [];

    for (const param of parameters) {
      let paramType = param.type;
      if (paramType === 'array') paramType = { type: 'array', items: { type: 'string' } };
      else if (paramType === 'object') paramType = { type: 'object', additionalProperties: true };
      else paramType = { type: paramType };

      properties[param.name] = {
        ...paramType,
        description: param.description || `${param.name} parameter`
      };

      if (param.required) {
        required.push(param.name);
      }
    }

    return {
      name: toolName,
      version: "1.0.0",
      tools: [{
        name: toolName,
        description: description,
        inputSchema: {
          type: "object",
          properties: properties,
          required: required.length > 0 ? required : undefined
        }
      }],
      resources: []
    };
  }

  generateMCPWorkerCode(_workflow: Workflow, opts?: { desiredWorkflowName?: string }): string {
    const { code: baseCode } = this.generateWorkerJavaScript(_workflow, opts);
    const manifest = this.generateMCPServerManifest(_workflow);
    
    if (!manifest) {
      return baseCode;
    }

    const _workflowName = this.sanitizeName(_workflow.name);
    const className = `${_workflowName.charAt(0).toUpperCase() + _workflowName.slice(1)}Workflow`;
    const bindingName = this.getWorkflowBindingName(_workflow);
    
    const toolName = manifest.tools[0].name;
    const toolDescription = manifest.tools[0].description;
    const toolSchema = manifest.tools[0].inputSchema;

    const mcpCode = `import { WorkflowEntrypoint } from 'cloudflare:workers';
import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export class ${className} extends WorkflowEntrypoint {
  async run(event, step) {
    // === WORKFLOW START (one-liner) ===
    console.log(JSON.stringify({type:'WF_START',timestamp:Date.now(),instanceId:event.instanceId,eventTimestamp:event.timestamp,payload:event.payload}));

    const _workflowResults = {};
      const _workflowState = {};

    ${this.generateWorkflowExecutionLogic(_workflow)}

    // === WORKFLOW END (one-liner) ===
    console.log(JSON.stringify({type:'WF_END',timestamp:Date.now(),instanceId:event.instanceId,results:_workflowResults}));
    return _workflowResults;
  }
}

export class ${className}MCP extends McpAgent {
  server = new McpServer({ 
    name: ${JSON.stringify(_workflow.name || toolName)}, 
    version: "1.0.0" 
  });

  async init() {
    const toolSchema = ${JSON.stringify(toolSchema)};
    const zodSchema: Record<string, z.ZodTypeAny> = {};
    
    if (toolSchema.properties) {
      for (const [key, prop] of Object.entries(toolSchema.properties)) {
        const propAny = prop as any;
        let zodType: z.ZodTypeAny;
        
        if (propAny.type === "string") {
          zodType = z.string();
        } else if (propAny.type === "number") {
          zodType = z.number();
        } else if (propAny.type === "boolean") {
          zodType = z.boolean();
        } else if (propAny.type === "object") {
          zodType = z.record(z.any());
        } else if (propAny.type === "array") {
          zodType = z.array(z.any());
        } else {
          zodType = z.any();
        }
        
        if (toolSchema.required && toolSchema.required.includes(key)) {
          zodSchema[key] = zodType;
        } else {
          zodSchema[key] = zodType.optional();
        }
      }
    }

    this.server.tool(
      ${JSON.stringify(toolName)},
      ${JSON.stringify(toolDescription)},
      Object.keys(zodSchema).length > 0 ? zodSchema : z.record(z.any()),
      async (args) => {
        const instance = await this.env.${bindingName}.create({
          id: crypto.randomUUID(),
          payload: args || {}
        });
        const status = await instance.status();
        return {
          content: [{
            type: "text",
            text: JSON.stringify(status)
          }]
        };
      }
    );
  }
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    
    if (url.pathname.startsWith('/sse')) {
      return ${className}MCP.serveSSE('/sse').fetch(req, env);
    }
    
    if (url.pathname.startsWith('/mcp')) {
      return ${className}MCP.serve('/mcp').fetch(req, env);
    }
    
    const instanceId = url.searchParams.get("instanceId");

    if (instanceId) {
      const instance = await env.${bindingName}.get(instanceId);
      return Response.json({
        status: await instance.status(),
      });
    }

    const newId = await crypto.randomUUID();
    let instance = await env.${bindingName}.create({
      id: newId
    });
    return Response.json({
      id: instance.id,
      details: await instance.status()
    });
  },
};`;

    return mcpCode;
  }

  private generateWorkerJavaScript(_workflow: Workflow, _opts?: { desiredWorkflowName?: string }): { code: string; className: string; bindings: any[] } {
    const _workflowName = this.sanitizeName(_workflow.name);
    const className = `${_workflowName.charAt(0).toUpperCase() + _workflowName.slice(1)}Workflow`;

    const raw = `import { WorkflowEntrypoint } from 'cloudflare:workers';

export class ${className} extends WorkflowEntrypoint {
  async run(event, step) {
    // === WORKFLOW START (one-liner) ===
    console.log(JSON.stringify({type:'WF_START',timestamp:Date.now(),instanceId:event.instanceId,eventTimestamp:event.timestamp,payload:event.payload}));

    const _workflowResults = {};
      const _workflowState = {};

    ${this.generateWorkflowExecutionLogic(_workflow)}

    // === WORKFLOW END (one-liner) ===
    console.log(JSON.stringify({type:'WF_END',timestamp:Date.now(),instanceId:event.instanceId,results:_workflowResults}));
    return _workflowResults;
  }
}

export default {
  async fetch(req, env) {
    console.log('🌐 === FETCH HANDLER STARTED ===');
    console.log('📡 Request URL:', req.url);
    console.log('📋 Request Method:', req.method);

    const instanceId = new URL(req.url).searchParams.get("instanceId");

    if (instanceId) {
      const instance = await env.${this.getWorkflowBindingName(_workflow)}.get(instanceId);
      return Response.json({
        status: await instance.status(),
      });
    }

    const newId = await crypto.randomUUID();
    let instance = await env.${this.getWorkflowBindingName(_workflow)}.create({
      id: newId
    });
    return Response.json({
      id: instance.id,
      details: await instance.status()
    });
  },
};`;
    const bindings = this.collectBindings(_workflow);
    const code = raw;
    return { code, className, bindings };
  }

  generateWranglerConfig(_workflow: Workflow, desiredWorkflowName?: string): string {
    const _workflowName = this.sanitizeName(_workflow.name);
    const className = `${_workflowName.charAt(0).toUpperCase() + _workflowName.slice(1)}Workflow`;
    const binding = this.getWorkflowBindingName(_workflow);

    const config = {
      name: `${_workflowName.toLowerCase()}-worker`,
      main: "src/index.ts",
      compatibility_date: "2024-01-01",
      observability: { enabled: true },
      _workflows: [
        {
          name: (desiredWorkflowName || _workflow.name || _workflowName).toLowerCase().replace(/[^a-z0-9-]/g, ""),
          binding,
          class_name: className
        }
      ]
    } as any;

    return JSON.stringify(config, null, 2);
  }

  private generateWorkflowExecutionLogic(_workflow: Workflow): string {
    if ((_workflow.nodes || []).length === 0) return '// No nodes to execute';

    const stepNameById = this.buildStepNameMap(_workflow);
    const nodeIdMap = this.buildNodeIdMap(_workflow, stepNameById);
    const orderedNodes = this.topologicallySortNodes(_workflow);
    if (orderedNodes.length === 0) return '// No executable nodes (cyclic or empty)';

    return orderedNodes.map((n) => this.generateSingleNodeExecution(n, _workflow, stepNameById, nodeIdMap)).join('\n\n');
  }

  private buildNodeIdMap(_workflow: Workflow, stepNameById: Map<string, string>): Map<string, string> {
    const map = new Map<string, string>();
    for (const node of _workflow.nodes || []) {
      const nodeId = (node as any).id;
      const stepName = stepNameById.get(nodeId) || this.toIdentifier(this.generateStepName(node));
      map.set(stepName, nodeId);
      map.set(nodeId, nodeId); // Also map nodeId to itself for direct access
    }
    return map;
  }

  private topologicallySortNodes(_workflow: Workflow) {
    const nodes = _workflow.nodes || [];
    const edges = _workflow.edges || [];
    const inDegree = new Map<string, number>();
    const adj = new Map<string, string[]>();

    for (const n of nodes) {
      inDegree.set(n.id, 0);
      adj.set(n.id, []);
    }
    for (const e of edges) {
      if (!inDegree.has(e.target)) inDegree.set(e.target, 0);
      inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1);
      if (!adj.has(e.source)) adj.set(e.source, []);
      adj.get(e.source)!.push(e.target);
    }

    const queue: string[] = [];
    for (const [id, deg] of inDegree.entries()) if (deg === 0) queue.push(id);

    const ordered: any[] = [];
    while (queue.length) {
      const id = queue.shift()!;
      const node = nodes.find(n => n.id === id);
      if (node) ordered.push(node);
      for (const nxt of adj.get(id) || []) {
        inDegree.set(nxt, (inDegree.get(nxt) || 0) - 1);
        if ((inDegree.get(nxt) || 0) === 0) queue.push(nxt);
      }
    }

    // If cycle, fall back to input order to avoid crashes
    return ordered.length === nodes.length ? ordered : nodes;
  }

  


  private generateEntryCode(node: any, _workflow: Workflow, nodeId: string): string {
    const params = Array.isArray(node.data?.config?.params) ? node.data.config.params : [];
    const paramNames = params.map((p: { name: string }) => p.name).join(", ");

    if (paramNames.trim()) {
      return `
    // Workflow entry point
    const { ${paramNames} } = event.payload;
    _workflowState['${nodeId}'] = {
      input: event.payload,
      output: { ${paramNames} }
    };`;
    } else {
      return `
    // Workflow entry point
    _workflowState['${nodeId}'] = {
      input: event.payload,
      output: event.payload
    };`;
    }
  }

  private generateReturnCode(node: any, stepNameById: Map<string, string>, nodeId: string, nodeIdMap: Map<string, string>, _workflow?: Workflow): string {
    const config = node.data?.config || {};
    const stepName = stepNameById.get(node.id) || this.toIdentifier(this.generateStepName(node));
    
    // Get input from previous nodes via state
    const inputData = this.getNodeInputFromState(nodeId, node, _workflow);
    
    // Handle different return value configurations
    let value = 'success';
    if (config.value) {
      // Handle template expressions like {{nodeId.output}} or {{state.nodeId.output}}
      if (typeof config.value === 'string' && config.value.includes('{{')) {
        value = this.resolveTemplateExpression(config.value, stepNameById, nodeIdMap);
      } else {
        value = JSON.stringify(config.value);
      }
    } else if (config.returnValue?.type === "expression") {
      value = config.returnValue.value;
    } else if (config.returnValue?.type === "variable") {
      value = this.resolveTemplateExpression(config.returnValue.value, stepNameById, nodeIdMap);
    } else if (config.returnValue?.value) {
      if (typeof config.returnValue.value === 'string' && config.returnValue.value.includes('{{')) {
        value = this.resolveTemplateExpression(config.returnValue.value, stepNameById, nodeIdMap);
      } else {
        value = JSON.stringify(config.returnValue.value);
      }
    }
    
    return `
    _workflowResults.${stepName} = await step.do('${stepName}', async () => {
      const result = ${value};
      _workflowState['${nodeId}'] = {
        input: ${inputData},
        output: result
      };
      return result;
    });`;
  }

  private generateConditionalCode(node: any, _workflow: Workflow): string {
    const condition = node.data?.config?.condition as { type: string; left: string; operator: string; right: string; expression?: string };
    const stepName = this.toIdentifier(this.generateStepName(node));

    return `
    _workflowResults.${stepName} = await step.do('${stepName}', async () => {
      const condition = ${this.generateConditionExpression(condition)};
      if (condition) {
        return { branch: 'true', result: true, condition: '${condition?.left} ${condition?.operator} ${condition?.right}' };
      } else {
        return { branch: 'false', result: false, condition: '${condition?.left} ${condition?.operator} ${condition?.right}' };
      }
    });`;
  }

  private generateHttpRequestCode(node: any, stepNameById: Map<string, string>, nodeId: string, nodeIdMap: Map<string, string>, _workflow: Workflow): string {
    const config = node.data?.config || {};
    const stepName = stepNameById.get(node.id) || this.toIdentifier(this.generateStepName(node));
    const inputData = this.getNodeInputFromState(nodeId, node, _workflow);

    // Resolve URL template if it contains {{}}
    let url = config?.url || 'https://api.example.com';
    if (typeof url === 'string' && url.includes('{{')) {
      url = this.resolveTemplateExpression(url, stepNameById, nodeIdMap);
    } else {
      url = JSON.stringify(url);
    }

    // Handle both object and array formats for headers
    let headersString = '';
    if (config?.headers) {
      if (Array.isArray(config.headers)) {
        headersString = config.headers.map((h: { key: string; value: string }) => {
          let headerValue = h.value;
          if (typeof headerValue === 'string' && headerValue.includes('{{')) {
            headerValue = this.resolveTemplateExpression(headerValue, stepNameById, nodeIdMap);
          } else {
            headerValue = JSON.stringify(headerValue);
          }
          return `        '${h.key}': ${headerValue}`;
        }).join(",\n");
      } else {
        headersString = Object.entries(config.headers).map(([key, value]) => {
          let headerValue = value as string;
          if (typeof headerValue === 'string' && headerValue.includes('{{')) {
            headerValue = this.resolveTemplateExpression(headerValue, stepNameById, nodeIdMap);
          } else {
            headerValue = JSON.stringify(headerValue);
          }
          return `        '${key}': ${headerValue}`;
        }).join(",\n");
      }
    }

    const method = config?.method || 'GET';
    const timeout = config?.timeout || 30000;

    // Resolve body content if it contains templates
    let bodyContent = '';
    if (config?.body?.type !== "none" && config?.body?.type) {
      const body = config.body;
      if (typeof body.content === 'string' && body.content.includes('{{')) {
        bodyContent = `body: ${this.generateBodyContent({ ...body, content: this.resolveTemplateExpression(body.content, stepNameById, nodeIdMap) })},`;
      } else {
        bodyContent = `body: ${this.generateBodyContent(body || { type: 'none', content: '' })},`;
      }
    }

    return `
    _workflowResults.${stepName} = await step.do('${stepName}', async () => {
      const inputData = ${inputData};
      const response = await fetch(${url}, {
        method: '${method}',
        headers: {
${headersString || '          // No custom headers'}
        },
        ${bodyContent}
        signal: AbortSignal.timeout(${timeout})
      });
      if (!response.ok) {
        throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
      }
      const body = await response.json();
      const result = {
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        body: body,
        message: 'HTTP request completed successfully'
      };
      _workflowState['${nodeId}'] = {
        input: inputData,
        output: result
      };
      return result;
    });`;
  }

  private generateKvGetCode(node: any, stepNameById: Map<string, string>, nodeId: string, nodeIdMap: Map<string, string>, _workflow: Workflow): string {
    const config = node.data?.config as { namespace: string; key: string; type: string };
    const stepName = stepNameById.get(node.id) || this.toIdentifier(this.generateStepName(node));
    const inputData = this.getNodeInputFromState(nodeId, node, _workflow);
    
    const defaultNamespace = this.getDefaultNamespaceFromSchema('kv-get') || 'KV';
    const resolvedNamespace = (config?.namespace && config.namespace !== 'default') ? config.namespace : defaultNamespace;
    const ns = resolvedNamespace.replace(/[^a-zA-Z0-9_]/g, '_');

    // Resolve key template if it contains {{}}
    let keyExpr = `\`${config?.key || 'default-key'}\``;
    if (config?.key && typeof config.key === 'string' && config.key.includes('{{')) {
      keyExpr = this.resolveTemplateExpression(config.key, stepNameById, nodeIdMap);
    }

    return `
    _workflowResults.${stepName} = await step.do("${stepName}", async () => {
      const inputData = ${inputData};
      const key = ${keyExpr};
      const value = await this.env["${ns}"].get(key);
      const result = {
        value,
        exists: value !== null,
        metadata: value ? { key } : null
      };
      _workflowState['${nodeId}'] = {
        input: inputData,
        output: result
      };
      return result;
    });`;
  }

  private generateKvPutCode(node: any, stepNameById: Map<string, string>, nodeId: string, nodeIdMap: Map<string, string>, _workflow: Workflow): string {
    const config = node.data?.config as any;
    const stepName = stepNameById.get(node.id) || this.toIdentifier(this.generateStepName(node));
    const inputData = this.getNodeInputFromState(nodeId, node, _workflow);
    
    const defaultNamespace = this.getDefaultNamespaceFromSchema('kv-put') || 'KV';
    const resolvedNamespace = (config?.namespace && config.namespace !== 'default') ? config.namespace : defaultNamespace;
    const ns = resolvedNamespace.replace(/[^a-zA-Z0-9_]/g, '_');

    // Resolve key template if it contains {{}}
    let keyExpr = `\`${config?.key || 'default-key'}\``;
    if (config?.key && typeof config.key === 'string' && config.key.includes('{{')) {
      keyExpr = this.resolveTemplateExpression(config.key, stepNameById, nodeIdMap);
    }

    // Resolve value content, supporting templates
    let valueContent = this.generateValueContent(config?.value || { type: 'static', content: 'default' });
    if (config?.value?.type === 'variable' && typeof config.value.content === 'string' && config.value.content.includes('{{')) {
      valueContent = this.resolveTemplateExpression(config.value.content, stepNameById, nodeIdMap);
    } else if (config?.value?.type === 'static' && typeof config.value.content === 'string' && config.value.content.includes('{{')) {
      valueContent = this.resolveTemplateExpression(config.value.content, stepNameById, nodeIdMap);
    }

    const optionLines: string[] = [];
    if (config?.options?.expirationTtl) optionLines.push(`expirationTtl: ${config.options.expirationTtl}`);
    if (config?.options?.expiration) optionLines.push(`expiration: ${config.options.expiration}`);
    if (Object.keys(config?.options?.metadata || {}).length) optionLines.push(`metadata: ${JSON.stringify(config.options.metadata)}`);
    const optionsObject = optionLines.length ? `, {\n        ${optionLines.join(',\n        ')}\n      }` : '';

    return `
    _workflowResults.${stepName} = await step.do("${stepName}", async () => {
      const inputData = ${inputData};
      const key = ${keyExpr};
      const value = ${valueContent};
      await this.env["${ns}"].put(key, value${optionsObject});
      const result = { success: true, key };
      _workflowState['${nodeId}'] = {
        input: inputData,
        output: result
      };
      return result;
    });`;
  }

  private generateD1QueryCode(node: any, stepNameById: Map<string, string>, nodeId: string, nodeIdMap: Map<string, string>, _workflow: Workflow): string {
    const config = node.data?.config as any;
    const stepName = stepNameById.get(node.id) || this.toIdentifier(this.generateStepName(node));
    const inputData = this.getNodeInputFromState(nodeId, node, _workflow);
    const db = (config?.database || 'DB').replace(/[^a-zA-Z0-9_]/g, '_');

    // Resolve query template if it contains {{}}
    let query = config?.query || 'SELECT 1';
    if (typeof query === 'string' && query.includes('{{')) {
      query = this.resolveTemplateExpression(query, stepNameById, nodeIdMap);
    } else {
      query = `\`${query}\``;
    }

    // Resolve params if they contain templates
    let paramsBinding = '';
    if (config?.params && Array.isArray(config.params)) {
      paramsBinding = config.params.map((p: { value: string }) => {
        if (typeof p.value === 'string' && p.value.includes('{{')) {
          return `.bind(${this.resolveTemplateExpression(p.value, stepNameById, nodeIdMap)})`;
        }
        return `.bind(${p.value})`;
      }).join("");
    }

    return `
    _workflowResults.${stepName} = await step.do('${stepName}', async () => {
      const inputData = ${inputData};
      try {
        const stmt = this.env["${db}"].prepare(${query});
        const result = await stmt
          ${paramsBinding}
          .${config?.returnType === "all" ? "all()" : config?.returnType === "first" ? "first()" : "run()"};
        const output = { results: JSON.stringify(result.results), meta: JSON.stringify(result.meta), success: result.success, message: 'D1 query executed successfully' };
        _workflowState['${nodeId}'] = {
          input: inputData,
          output: output
        };
        return output;
      } catch (error) {
        const output = { results: '[]', meta: '{}', success: false, error: error instanceof Error ? error.message : String(error), message: 'D1 query failed - table may not exist' };
        _workflowState['${nodeId}'] = {
          input: inputData,
          output: output
        };
        return output;
      }
    });`;
  }

  private generateTransformCode(node: any, nodeId: string, nodeIdMap: Map<string, string>, _workflow: Workflow): string {
    const config = node.data?.config as any;
    const stepName = this.toIdentifier(this.generateStepName(node));
    const inputData = this.getNodeInputFromState(nodeId, node, _workflow);
    
    let code = config?.code || 'return inputData;';
    code = code.replace(/\binput\b/g, 'inputData');
    code = code.replace(/\bdata\b/g, 'inputData');
    
    // Resolve template expressions in code
    if (code.includes('{{')) {
      code = this.resolveTemplateExpression(code, new Map(), nodeIdMap);
    }
    
    if (code.startsWith('return ')) {
      code = code.substring(7);
    }

    code = code.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    code = code.replace(/const\s+\w+\s*=\s*\w+[^;]*;\s*return/g, 'return');
    code = code.replace(/const\s+\w+\s*=\s*\w+[^;]*;\s*/g, '');
    
    let validCode = code;
    if (!code.includes('return') && !code.includes('{') && !code.includes(';')) {
      validCode = `(${code})`;
    } else if (!code.includes('return') && code.includes('{')) {
      validCode = `(() => { ${code} })()`;
    } else if (code.includes('const') && code.includes('return')) {
      validCode = `(() => { ${code} })()`;
    } else if (code.includes(';')) {
      validCode = `(() => { ${code} })()`;
    }

    return `
    _workflowResults.${stepName} = await step.do('${stepName}', async () => {
      const inputData = ${inputData};
      const result = ${validCode};
      const output = { ...result, message: 'Data transformation completed successfully' };
      _workflowState['${nodeId}'] = {
        input: inputData,
        output: output
      };
      return output;
    });`;
  }

  private generateSleepCode(node: any): string {
    const config = node.data?.config as any;
    const stepName = this.toIdentifier(this.generateStepName(node));

    const duration = config?.duration || config?.ms || 1000;
    
    if (typeof duration === 'number') {
      return `
    await step.sleep("${stepName}", ${duration});`;
    } else if (config?.duration?.type === "relative") {
      const durationMs = this.convertDurationToMs(
        config.duration.value,
        config.duration.unit
      );
      return `
    await step.sleep("${stepName}", "${durationMs}ms");`;
    } else {
      return `
    await step.sleepUntil("${stepName}", ${config?.duration?.timestamp || Date.now() + 1000});`;
    }
  }

  private generateValidateCode(node: any): string {
    const config = node.data?.config as any;
    const stepName = this.toIdentifier(this.generateStepName(node));

    return `
    _workflowResults.${stepName} = await step.do('${stepName}', async () => {
      const data = event.payload;
      const errors = [];
      ${config?.rules
        ?.map((rule: { field: string; type: string; message: string; config?: Record<string, unknown> }) => this.generateValidationRule(rule))
        .join("\n      ") || '/* no validation rules configured */'}
      const valid = errors.length === 0;
      if (!valid && '${config?.onFailure || 'error'}' === 'error') {
        throw new Error(\`Validation failed: \${errors.map(e => e.message).join(', ')}\`);
      }
      return { valid, errors, data: valid ? data : null, message: valid ? 'Validation passed' : 'Validation failed' };
    });`;
  }

  private generateMCPToolInputCode(node: any, nodeId: string, _workflow?: Workflow): string {
    const config = node.data?.config || node.config || {};
    const params = Array.isArray(config.parameters) ? config.parameters : [];
    const paramNames = params.map((p: { name: string }) => p.name).filter(Boolean);

    if (paramNames.length > 0) {
      const paramList = paramNames.join(", ");
      const paramObject = paramNames.map((name: string) => `${name}: ${name}`).join(", ");
      return `
    const { ${paramList} } = event.payload || {};
    _workflowState['${nodeId}'] = {
      input: event.payload,
      output: { ${paramObject} }
    };`;
    } else {
      return `
    _workflowState['${nodeId}'] = {
      input: event.payload,
      output: event.payload
    };`;
    }
  }

  private generateMCPToolOutputCode(node: any, stepNameById: Map<string, string>, nodeId: string, nodeIdMap: Map<string, string>, _workflow: Workflow): string {
    const config = node.data?.config || {};
    const stepName = stepNameById.get(node.id) || this.toIdentifier(this.generateStepName(node));
    const inputData = this.getNodeInputFromState(nodeId, node, _workflow);
    
    let value = inputData;
    if (config.responseStructure?.type === "expression") {
      value = config.responseStructure.value;
    } else if (config.responseStructure?.type === "variable") {
      value = this.resolveTemplateExpression(config.responseStructure.value, stepNameById, nodeIdMap);
    } else if (config.responseStructure?.value) {
      value = JSON.stringify(config.responseStructure.value);
    }

    const format = config.format || "json";
    let formattedValue = value;
    if (format === "json") {
      formattedValue = `JSON.stringify(${value})`;
    } else if (format === "text") {
      formattedValue = `String(${value})`;
    }

    return `
    _workflowResults.${stepName} = await step.do('${stepName}', async () => {
      const inputData = ${inputData};
      const result = {
        content: [{
          type: "${format}",
          ${format === "json" ? "text" : format}: ${formattedValue}
        }]
      };
      _workflowState['${nodeId}'] = {
        input: inputData,
        output: result
      };
      return result;
    });`;
  }

  private generateAIGatewayCode(node: any, stepNameById: Map<string, string>, nodeId: string, nodeIdMap: Map<string, string>, _workflow: Workflow): string {
    const config = node.data?.config || {};
    const stepName = stepNameById.get(node.id) || this.toIdentifier(this.generateStepName(node));
    const inputData = this.getNodeInputFromState(nodeId, node, _workflow);
    
    let prompt = config.prompt || "";
    if (typeof prompt === 'string' && prompt.includes('{{')) {
      prompt = this.resolveTemplateExpression(prompt, stepNameById, nodeIdMap);
    } else {
      prompt = JSON.stringify(prompt);
    }

    const model = config.model || "@cf/meta/llama-3.1-8b-instruct";
    const temperature = config.temperature || 0.7;
    const maxTokens = config.maxTokens || undefined;
    const cacheTTL = config.cacheTTL || 3600;

    const cacheCheck = cacheTTL > 0 ? `
      const cacheKey = \`ai_cache_\${${model}}_\${${prompt}}\`;
      const cached = await this.env.KV?.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }` : "";

    const cacheStore = cacheTTL > 0 ? `
      if (this.env.KV) {
        await this.env.KV.put(cacheKey, JSON.stringify(result), { expirationTtl: ${cacheTTL} });
      }` : "";

    const maxTokensParam = maxTokens ? `max_tokens: ${maxTokens},` : "";

    return `
    _workflowResults.${stepName} = await step.do('${stepName}', async () => {
      const inputData = ${inputData};
      ${cacheCheck}
      const response = await this.env.AI.run(${JSON.stringify(model)}, {
        messages: [{ role: "user", content: ${prompt} }],
        temperature: ${temperature},
        ${maxTokensParam}
      });
      const result = {
        response: response,
        text: response.response || response.text || JSON.stringify(response),
        usage: response.usage || {}
      };
      ${cacheStore}
      _workflowState['${nodeId}'] = {
        input: inputData,
        output: result
      };
      return result;
    });`;
  }


  private generateSingleNodeExecution(node: any, _workflow: Workflow, stepNameById: Map<string, string>, nodeIdMap: Map<string, string>): string {
    const nodeType = node.type || node.data?.type;
    const nodeId = node.id;
    const nodeName = node.data?.label || node.label || nodeType;
    
    const config = node.config || node.data?.config || {};
    
    let nodeCode = '';
    switch (nodeType) {
      case 'entry':
        nodeCode = this.generateEntryCode({ ...node, data: { config } }, _workflow, nodeId);
        break;
        
      case 'http-request':
        nodeCode = this.generateHttpRequestCode({ ...node, data: { config } }, stepNameById, nodeId, nodeIdMap, _workflow);
        break;
        
      case 'transform':
        nodeCode = this.generateTransformCode({ ...node, data: { config } }, nodeId, nodeIdMap, _workflow);
        break;
        
      case 'conditional':
      case 'conditional-inline':
        nodeCode = this.generateConditionalCode({ ...node, data: { config } }, _workflow);
        break;
      case 'conditional-router':
        nodeCode = this.generateConditionalCode({ ...node, data: { config } }, _workflow);
        break;
        
      case 'sleep':
        nodeCode = this.generateSleepCode({ ...node, data: { config } });
        break;
        
      case 'return':
        nodeCode = this.generateReturnCode({ ...node, data: { config } }, stepNameById, nodeId, nodeIdMap, _workflow);
        break;
        
      case 'kv-get':
        nodeCode = this.generateKvGetCode({ ...node, data: { config } }, stepNameById, nodeId, nodeIdMap, _workflow);
        break;
        
      case 'kv-put':
        nodeCode = this.generateKvPutCode({ ...node, data: { config } }, stepNameById, nodeId, nodeIdMap, _workflow);
        break;
        
      case 'd1-query':
        nodeCode = this.generateD1QueryCode({ ...node, data: { config } }, stepNameById, nodeId, nodeIdMap, _workflow);
        break;
        
      case 'validate':
        nodeCode = this.generateValidateCode({ ...node, data: { config } });
        break;
        
      case 'mcp-tool-input':
        nodeCode = this.generateMCPToolInputCode({ ...node, data: { config } }, nodeId, _workflow);
        break;
        
      case 'mcp-tool-output':
        nodeCode = this.generateMCPToolOutputCode({ ...node, data: { config } }, stepNameById, nodeId, nodeIdMap, _workflow);
        break;
        
      case 'ai-gateway':
        nodeCode = this.generateAIGatewayCode({ ...node, data: { config } }, stepNameById, nodeId, nodeIdMap, _workflow);
        break;
        
      default:
        nodeCode = `// Custom node: ${nodeId} (${nodeType})
// Implement custom logic for ${nodeType} node`;
    }
    
    return this.wrapNodeWithLogging(nodeId, nodeName, nodeType, nodeCode);
  }

  private generateStepName(node: any): string {
    if (node.data?.stepName) return node.data.stepName;

    const baseName = node.data?.label || node.label || node.type
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    return baseName || "step";
  }

  private buildStepNameMap(_workflow: Workflow): Map<string, string> {
    const map = new Map<string, string>();
    const used = new Set<string>();
    for (const node of _workflow.nodes || []) {
      const base = this.toIdentifier((node as any).data?.stepName || (node as any).data?.label || (node as any).label || (node as any).type || 'step');
      let candidate = base || 'step';
      let i = 2;
      while (used.has(candidate)) {
        candidate = `${base}${i}`;
        i += 1;
      }
      used.add(candidate);
      map.set((node as any).id, candidate);
    }
    return map;
  }

  private generateConditionExpression(condition: { type: string; left: string; operator: string; right: string; expression?: string }): string {
    if (condition?.type === "simple") {
      let left = condition.left;
      if (left.includes('.')) {
        left = `event.payload.${left}`;
      } else if (!left.startsWith('event.') && !left.startsWith('data.') && !left.startsWith('result.')) {
        left = `event.payload.${left}`;
      }
      
      return `${left} ${condition.operator} ${JSON.stringify(condition.right)}`;
    } else {
      return condition?.expression || 'true';
    }
  }

  private generateBodyContent(body: { type: string; content: string }): string {
    switch (body.type) {
      case "json":
        return `JSON.stringify(${body.content})`;
      case "form":
        return `new URLSearchParams(${body.content})`;
      case "text":
        return `'${body.content}'`;
      default:
        return body.content;
    }
  }

  private generateValueContent(value: { type: string; content: string }): string {
    switch (value.type) {
      case "static":
        return JSON.stringify(value.content);
      case "variable":
        return value.content;
      case "expression":
        return value.content;
      default:
        return JSON.stringify(value.content);
    }
  }

  private generateValidationRule(rule: { field: string; type: string; message: string; config?: Record<string, unknown> }): string {
    const field = rule.field;
    const message = rule.message;

    switch (rule.type) {
      case "required":
        return `if (!${field}) errors.push({ field: '${field}', message: '${message}' });`;
      case "email":
        return `if (${field} && !${field}.includes('@')) errors.push({ field: '${field}', message: '${message}' });`;
      case "url":
        return `if (${field} && !${field}.startsWith('http')) errors.push({ field: '${field}', message: '${message}' });`;
      case "length":
        return `if (${field} && (${field}.length < ${rule.config?.min || 0} || ${field}.length > ${rule.config?.max || 1000})) errors.push({ field: '${field}', message: '${message}' });`;
      case "range":
        return `if (${field} && (${field} < ${rule.config?.min || 0} || ${field} > ${rule.config?.max || 1000})) errors.push({ field: '${field}', message: '${message}' });`;
      case "regex":
        return `if (${field} && !/${rule.config?.pattern || '.*'}/.test(${field})) errors.push({ field: '${field}', message: '${message}' });`;
      case "custom":
        return `${rule.config?.customCode || ''}`;
      default:
        return `// Unknown validation rule: ${rule.type}`;
    }
  }


  private convertDurationToMs(value: number, unit: string): number {
    const multipliers: Record<string, number> = {
      ms: 1,
      seconds: 1000,
      minutes: 60 * 1000,
      hours: 60 * 60 * 1000,
      days: 24 * 60 * 60 * 1000,
      weeks: 7 * 24 * 60 * 60 * 1000
    };

    return value * (multipliers[unit] || 1000);
  }

  private sanitizeName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .replace(/^[0-9]/, '');
  }

  private getWorkflowBindingName(_workflow: Workflow): string {
    const _workflowName = this.sanitizeName(_workflow.name);
    return `${_workflowName.toUpperCase()}_WORKFLOW`;
  }

  private toIdentifier(name: string): string {
    const cleaned = (name || '')
      .replace(/[^a-zA-Z0-9_]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase();
    const camel = cleaned.split('-').map((seg, i) => i === 0 ? seg : (seg.charAt(0).toUpperCase() + seg.slice(1))).join('');
    if (!camel) return 'step';
    if (!/[a-zA-Z_]/.test(camel.charAt(0))) return `step${camel.charAt(0).toUpperCase()}${camel.slice(1)}`;
    return camel;
  }

  private resolveTemplateExpression(expr: string, stepNameById: Map<string, string>, nodeIdMap: Map<string, string>): string {
    // Support both {{nodeId.output}} and {{state.nodeId.output}} formats
    return expr.replace(/\{\{([^}]+)\}\}/g, (_match: string, innerExpr: string) => {
      const trimmed = innerExpr.trim();
      
      // Handle state.nodeId.path format
      if (trimmed.startsWith('state.')) {
        const path = trimmed.substring(6); // Remove 'state.'
        const [nodeId, ...rest] = path.split('.');
        const tail = rest.length ? '.' + rest.join('.') : '.output';
        return `_workflowState['${nodeId}']${tail}`;
      }
      
      // Handle nodeId.path format (legacy, but still supported)
      const [nodeRef, ...rest] = trimmed.split('.');
      const refStep = stepNameById.get(nodeRef);
      if (refStep) {
        const tail = rest.length ? '.' + rest.join('.') : '';
        return `_workflowResults.${refStep}${tail}`;
      }
      
      // Try to find by node ID directly
      const nodeId = nodeIdMap.get(nodeRef);
      if (nodeId) {
        const tail = rest.length ? '.' + rest.join('.') : '.output';
        return `_workflowState['${nodeId}']${tail}`;
      }
      
      // Fallback: assume it's a node ID
      const tail = rest.length ? '.' + rest.join('.') : '.output';
      return `_workflowState['${nodeRef}']${tail}`;
    });
  }

  private getNodeInputFromState(nodeId: string, _node: any, _workflow?: Workflow): string {
    // Get input from the first incoming edge's source node
    if (_workflow) {
      const edges = _workflow.edges || [];
      const incomingEdge = edges.find((e: any) => e.target === nodeId);
      if (incomingEdge) {
        return `_workflowState['${incomingEdge.source}']?.output || event.payload`;
      }
    }
    // Fallback to event payload if no incoming edges
    return 'event.payload';
  }

  private wrapNodeWithLogging(nodeId: string, nodeName: string, nodeType: string, nodeCode: string): string {
    const commentStart = `// === NODE START: ${nodeType.toUpperCase()} (${nodeName}) [${nodeId}] ===`;
    const commentEnd = `// === NODE END: ${nodeType.toUpperCase()} (${nodeName}) [${nodeId}] ===`;
    const startLog = `console.log(JSON.stringify({type:'WF_NODE_START',nodeId:'${nodeId}',nodeName:'${nodeName}',nodeType:'${nodeType}',timestamp:Date.now(),instanceId:event.instanceId}));`;
    const endLog = `console.log(JSON.stringify({type:'WF_NODE_END',nodeId:'${nodeId}',nodeName:'${nodeName}',nodeType:'${nodeType}',timestamp:Date.now(),instanceId:event.instanceId,success:true}));`;
    const errorLog = `console.log(JSON.stringify({type:'WF_NODE_ERROR',nodeId:'${nodeId}',nodeName:'${nodeName}',nodeType:'${nodeType}',timestamp:Date.now(),instanceId:event.instanceId,error:error.message||String(error)}));`;

    return `
    ${commentStart}
    ${startLog}
    try {
      ${nodeCode}
      ${endLog}
    } catch (error) {
      ${errorLog}
      throw error;
    }
    ${commentEnd}`;
  }

  private collectBindings(_workflow: Workflow): any[] {
    const bindingMap = new Map<string, any>();

    // Collect bindings from all nodes with detailed information
    for (const node of _workflow.nodes || []) {
      const nodeType = node.type || node.data?.type;
      const nodeId = node.id || 'unknown';
      const nodeLabel = node.data?.label || nodeType;
      const config = node.data?.config || {};
      const nodeDefinition = NodeRegistry.getNodeByType(nodeType);
      
      if (nodeDefinition?.bindings) {
        for (const binding of nodeDefinition.bindings) {
          // Determine the actual binding name used in the generated code
          let actualBindingName: string;
          let bindingDetails: any = {
            nodeId,
            nodeLabel,
            nodeType,
          };

          // Extract binding-specific details based on node type
          if (nodeType === 'kv-get' || nodeType === 'kv-put') {
            const defaultNamespace = this.getDefaultNamespaceFromSchema(nodeType) || 'KV';
            const resolvedNamespace = (config?.namespace && config?.namespace !== 'default') 
              ? config.namespace 
              : defaultNamespace;
            actualBindingName = resolvedNamespace.replace(/[^a-zA-Z0-9_]/g, '_');
            bindingDetails.namespace = {
              configured: config?.namespace || null,
              default: defaultNamespace,
              resolved: resolvedNamespace,
              finalBinding: actualBindingName
            };
            if (nodeType === 'kv-get') {
              bindingDetails.key = config?.key || 'default-key';
              bindingDetails.type = config?.type || 'text';
            } else if (nodeType === 'kv-put') {
              bindingDetails.key = config?.key || 'default-key';
              bindingDetails.valueType = config?.value?.type || 'static';
              if (config?.options) {
                bindingDetails.options = config.options;
              }
            }
          } else if (nodeType === 'd1-query') {
            actualBindingName = (config?.database || 'DB').replace(/[^a-zA-Z0-9_]/g, '_');
            bindingDetails.database = {
              configured: config?.database || null,
              default: 'DB',
              resolved: actualBindingName
            };
            bindingDetails.query = config?.query || 'SELECT 1';
            bindingDetails.returnType = config?.returnType || 'all';
            if (config?.params && config.params.length > 0) {
              bindingDetails.parameters = config.params;
            }
          } else {
            actualBindingName = binding.name || binding.type;
          }

          // Get or create binding entry
          const bindingKey = `${binding.type}:${actualBindingName}`;
          if (!bindingMap.has(bindingKey)) {
            bindingMap.set(bindingKey, {
              name: actualBindingName,
              type: binding.type,
              description: binding.description || `${binding.type} binding for ${nodeType} nodes`,
              required: binding.required || false,
              usage: [bindingDetails]
            });
          } else {
            // Add to existing binding's usage
            const existing = bindingMap.get(bindingKey);
            existing.usage.push(bindingDetails);
          }
        }
      }
    }

    // Convert map to array and add summary info
    return Array.from(bindingMap.values()).map(binding => ({
      ...binding,
      usedBy: binding.usage.map((u: any) => u.nodeType),
      nodeCount: binding.usage.length,
      nodes: binding.usage.map((u: any) => ({
        id: u.nodeId,
        label: u.nodeLabel,
        type: u.nodeType
      }))
    }));
  }

  private getDefaultNamespaceFromSchema(nodeType: string): string | null {
    const nodeDefinition = NodeRegistry.getNodeByType(nodeType);
    if (!nodeDefinition) return null;
    
    try {
      const schema = nodeDefinition.configSchema;
      const result = (schema as any).safeParse?.({});
      if (result?.success && result.data?.namespace) {
        return result.data.namespace;
      }
      
      const schemaAny = schema as any;
      if (schemaAny?._def?.shape) {
        const shape = schemaAny._def.shape();
        const namespaceField = shape?.namespace;
        if (namespaceField?._def?.defaultValue) {
          const defaultValue = namespaceField._def.defaultValue;
          return typeof defaultValue === 'function' ? defaultValue() : defaultValue;
        }
      }
    } catch (error) {
    }
    
    return null;
  }
}
