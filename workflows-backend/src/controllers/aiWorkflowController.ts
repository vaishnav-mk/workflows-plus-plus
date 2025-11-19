import { Context } from "hono";
import { zodToJsonSchema } from "zod-to-json-schema";
import { AIGatewayService } from "../services/aiGatewayService";
import { NodeRegistry } from "../nodes/registry";
import { ApiResponse } from "../types/api";

interface GenerateWorkflowRequest {
  text?: string;
  image?: string;
  imageMimeType?: string;
}

interface AIGeneratedWorkflow {
  id?: string;
  name?: string;
  description?: string;
  nodes: Array<{
    id: string;
    type: string;
    position: { x: number; y: number };
    label: string;
    config: Record<string, any>;
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    type?: string;
  }>;
  entryNodeId?: string;
}

export class AIWorkflowController {
  private aiGatewayService: AIGatewayService;

  constructor(private env: any) {
    this.aiGatewayService = new AIGatewayService(this.env);
  }

  private extractRequiredFields(schema: any): string[] {
    const required: string[] = [];
    
    if (!schema.properties) {
      return required;
    }
    
    Object.keys(schema.properties).forEach(key => {
      const prop = schema.properties[key];
      
      const hasDefault = prop.default !== undefined;
      
      const isInRequiredArray = schema.required && Array.isArray(schema.required) && schema.required.includes(key);
      const isRequired = isInRequiredArray || (!schema.required && !hasDefault);
      
      if (isRequired && !hasDefault) {
        required.push(key);
      }
      
      if (prop.type === 'object' && prop.properties) {
        const nestedRequired = this.extractRequiredFields(prop);
        if (nestedRequired.length > 0) {
          const nestedPaths = nestedRequired.map(f => `${key}.${f}`);
          required.push(...nestedPaths);
        }
        
        if (isRequired && !hasDefault) {
          if (prop.properties.content !== undefined) {
            required.push(`${key}.content`);
          }
        }
      }
    });
    
    return required;
  }

  private buildPrompt(userText?: string): string {
    const registryNodes = NodeRegistry.toJSON();
    
    const simplifiedRegistry = registryNodes.map(node => {
      const requiredFields = this.extractRequiredFields(node.configSchema);
      return {
        type: node.metadata.type,
        name: node.metadata.name,
        description: node.metadata.description,
        category: node.metadata.category,
        inputPorts: node.inputPorts,
        outputPorts: node.outputPorts,
        examples: node.examples,
        requiredConfigFields: requiredFields,
        configSchema: node.configSchema
      };
    });

    const outputContract = {
      id: "string {3 words description of the workflow separated by hyphens}-{uniqueid}",
      name: "string",
      description: "string",
      nodes: [
        {
          id: "string (unique). only a to z and 0 to 9 are allowed. do not use spaces or special characters. no quotes or backticks",
          type: "string (one of registry metadata.type)",
          position: { x: "number", y: "number" },
          label: "string",
          config: {}
        }
      ],
      edges: [
        { id: "string", source: "nodeId", target: "nodeId", type: "default" }
      ],
      entryNodeId: "nodeId"
    };

    const prompt = `You are an expert workflow architect. Build a Cloudflare Workflow graph using ONLY the node types and config schemas provided.

USER INTENT:
${userText || "Create a simple workflow"}

A4LABLE NODE TYPES (STRICT - USE ONLY THESE):
${JSON.stringify(simplifiedRegistry, null, 2)}

CRITICAL RULES:
1. USE ONLY the provided node types listed above. DO NOT invent new node types.
2. Start from an \`entry\` node and produce a single connected DAG.
3. **CRITICAL: NO SAMPLE/PLACEHOLDER DATA - ZERO TOLERANCE**:
   - **FORBIDDEN**: Generating ANY URLs like "https://api.example.com", "https://example.com/api", etc.
   - **ALLOWED**: Use EXACT literal values ONLY if user explicitly provides them in their input
   - **RULE**: If user intent does NOT explicitly mention a specific value/URL/key, the field MUST be "" (empty string)
   - **EXAMPLES OF CORRECT BEHAVIOR**: 
     * User says "create workflow with KV" → key="", value.content=""
     * User says "call https://api.example.com/users" → url="https://api.example.com/users" (user provided exact URL)
     * User says "call https://api.example.com/users?name=John&age=30" → url="https://api.example.com/users?name=John&age=30" (user provided query parameters)
     * <important> Hardcode urls, dont use templates, they are not supported yet </important>
     * User says "call https://api.example.com/users/123" → url="https://api.example.com/users/123" (user provided path parameters)
   - **EXAMPLES OF FORBIDDEN BEHAVIOR**: 
     * DON'T generate key="user-data" when user didn't specify it
     * DON'T generate url="https://api.example.com" as a placeholder
     * DON'T use generic values like "name", "key", "value" as actual data
4. For HTTP requests: 
   - url: "" (empty unless user explicitly provides exact URL, provide query parameters if user provides them or path parameters if user provides them)
   Make sure all urls are valid and have a protocol, hostname, and path.
   
   - method: "GET" (default, required)
   - headers: []
   - body: { type: "none", content: "" }
5. For KV operations:
   - namespace: use schema default or ""
   - value.content: Use exact value if user provides it, otherwise "" (user will fill via form)
6. For database operations: 
   - query: "" (empty unless user explicitly provides SQL query text)
7. For return nodes: minimal structure with empty value fields
8. **GOLDEN RULE: Extract and use ONLY exact literal values that user explicitly mentions. For any field the user doesn't mention, use empty string "".**
9. Keep node labels short and descriptive.
10. Layout top-to-bottom: x=200, y increases by 140.
11. Output ONLY valid JSON matching the Output Contract. No markdown, no prose, no explanations.
12. For return result, just console.log date now, nothing else

OUTPUT CONTRACT:
${JSON.stringify(outputContract, null, 2)}

Return ONLY the JSON object – no explanations, no markdown, just pure JSON.`;

    return prompt;
  }

  private validateGeneratedWorkflow(workflow: any): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!workflow) {
      return { valid: false, errors: ["No workflow data received"] };
    }

    if (!workflow.nodes || !Array.isArray(workflow.nodes) || workflow.nodes.length === 0) {
      errors.push("Workflow must have at least one node");
    }

    if (!workflow.edges || !Array.isArray(workflow.edges)) {
      errors.push("Workflow must have edges array");
    }

    const nodeIds = new Set<string>();
    const validTypes = new Set(NodeRegistry.getAllNodes().map(n => n.metadata.type));

    workflow.nodes?.forEach((node: any, index: number) => {
      if (!node.id) {
        errors.push(`Node at index ${index} missing id`);
      } else if (nodeIds.has(node.id)) {
        errors.push(`Duplicate node id: ${node.id}`);
      } else {
        nodeIds.add(node.id);
      }

      if (!node.type) {
        errors.push(`Node ${node.id} missing type`);
      } else if (!validTypes.has(node.type)) {
        errors.push(`Node ${node.id} has invalid type: ${node.type}`);
      }

      if (!node.position || typeof node.position.x !== "number" || typeof node.position.y !== "number") {
        errors.push(`Node ${node.id} missing valid position`);
      }

      if (!node.label) {
        errors.push(`Node ${node.id} missing label`);
      }

      if (node.config === undefined) {
        errors.push(`Node ${node.id} missing config (can be empty object)`);
      }
    });

    workflow.edges?.forEach((edge: any, index: number) => {
      if (!edge.source || !nodeIds.has(edge.source)) {
        errors.push(`Edge at index ${index} has invalid source: ${edge.source}`);
      }
      if (!edge.target || !nodeIds.has(edge.target)) {
        errors.push(`Edge at index ${index} has invalid target: ${edge.target}`);
      }
    });

    if (workflow.entryNodeId && !nodeIds.has(workflow.entryNodeId)) {
      errors.push(`entryNodeId ${workflow.entryNodeId} does not reference a valid node`);
    }

    if (!workflow.entryNodeId) {
      const entryNode = workflow.nodes?.find((n: any) => n.type === "entry");
      if (entryNode) {
        workflow.entryNodeId = entryNode.id;
      } else {
        errors.push("No entry node found and entryNodeId not specified");
      }
    }

    return { valid: errors.length === 0, errors };
  }

  private validateNodeConfigs(workflow: AIGeneratedWorkflow): {
    missingFields: Array<{
      nodeId: string;
      nodeType: string;
      nodeLabel: string;
      missingFields: Array<{
        field: string;
        type: string;
        description?: string;
      }>;
    }>;
  } {
    const missingFields: Array<{
      nodeId: string;
      nodeType: string;
      nodeLabel: string;
      missingFields: Array<{
        field: string;
        type: string;
        description?: string;
      }>;
    }> = [];

    workflow.nodes.forEach(node => {
      const nodeDef = NodeRegistry.getNodeByType(node.type);
      if (!nodeDef) {
        return;
      }

      const schema = nodeDef.configSchema;
      
      const jsonSchema: any = (schema && typeof (schema as any)._def !== 'undefined')
        ? zodToJsonSchema(schema)
        : schema;
      
      const requiredFields = this.extractRequiredFields(jsonSchema);
      
      const nodeMissing: Array<{ field: string; type: string; description?: string }> = [];

      requiredFields.forEach(fieldPath => {
        const parts = fieldPath.split('.');
        let configValue: any = node.config || {};
        
        let parentExists = true;
        for (let i = 0; i < parts.length - 1; i++) {
          if (configValue && typeof configValue === 'object' && configValue[parts[i]] !== undefined) {
            configValue = configValue[parts[i]];
          } else {
            parentExists = false;
            configValue = null;
            break;
          }
        }
        
        const fieldName = parts[parts.length - 1];
        let actualValue = null;
        
        if (parentExists && configValue && typeof configValue === 'object') {
          actualValue = configValue[fieldName];
        }
        
        const isEmpty = actualValue === undefined || actualValue === null || actualValue === '';
        
        const isSampleData = typeof actualValue === 'string' && actualValue !== '' && (
          actualValue.includes('example.com') ||
          actualValue.includes('api.example') ||
          /^(my_|test_|sample_|demo_)/i.test(actualValue) ||
          /^user-\d+$/i.test(actualValue)
        );
        
        const isEmptyObject = typeof actualValue === 'object' && 
          actualValue !== null && 
          !Array.isArray(actualValue) &&
          Object.keys(actualValue).length === 0;
        
        const isMissingFromObject = parentExists && configValue !== null && typeof configValue === 'object' && !(fieldName in configValue);
        
        const shouldReport = isEmpty || isEmptyObject || isMissingFromObject || isSampleData;
        
        if (shouldReport) {
          const fieldInfo = this.getFieldInfo(jsonSchema, fieldPath);
          nodeMissing.push({
            field: fieldPath,
            type: fieldInfo.type || 'unknown',
            description: fieldInfo.description
          });
        }
      });

      if (nodeMissing.length > 0) {
        missingFields.push({
          nodeId: node.id,
          nodeType: node.type,
          nodeLabel: node.label,
          missingFields: nodeMissing
        });
      }
    });
    
    return { missingFields };
  }

  private getFieldInfo(schema: any, fieldPath: string): { type: string; description?: string } {
    const parts = fieldPath.split('.');
    let current = schema;
    
    for (const part of parts) {
      if (current.properties && current.properties[part]) {
        current = current.properties[part];
      } else {
        return { type: 'unknown' };
      }
    }
    
    return {
      type: current.type || 'unknown',
      description: current.description
    };
  }

  async generateWorkflow(c: Context): Promise<Response> {
    try {
      let requestData: GenerateWorkflowRequest;

      const contentType = c.req.header("content-type") || "";
      if (contentType.includes("multipart/form-data")) {
        const formData = await c.req.parseBody();
        requestData = {
          text: formData.text as string | undefined,
          image: formData.image as string | undefined,
          imageMimeType: formData.imageMimeType as string | undefined
        };
      } else {
        requestData = await c.req.json();
      }

      if (!requestData.text && !requestData.image) {
        return c.json(
          {
            success: false,
            error: "Either text or image must be provided"
          },
          400
        );
      }

      const prompt = this.buildPrompt(requestData.text);

      const aiResponse = await this.aiGatewayService.generateWorkflow(
        prompt,
        requestData.image,
        requestData.imageMimeType
      );
      console.log('aiResponse:', JSON.stringify(aiResponse, null, 2));

      const validation = this.validateGeneratedWorkflow(aiResponse);
      if (!validation.valid) {
        return c.json(
          {
            success: false,
            error: "Generated workflow validation failed",
            details: validation.errors
          },
          400
        );
      }

      const enrichedWorkflow = aiResponse as AIGeneratedWorkflow;

      const validationResult = this.validateNodeConfigs(enrichedWorkflow);

      const workflowId = enrichedWorkflow.id || (globalThis as any).crypto.randomUUID();

      const response: ApiResponse = {
        success: true,
        data: {
          id: workflowId,
          name: enrichedWorkflow.name || "AI Generated Workflow",
          description: enrichedWorkflow.description || "",
          nodes: enrichedWorkflow.nodes,
          edges: enrichedWorkflow.edges.map(e => ({
            id: e.id || `${e.source}-${e.target}`,
            source: e.source,
            target: e.target,
            type: e.type || "default"
          })),
          entryNodeId: enrichedWorkflow.entryNodeId,
          missingRequiredFields: validationResult.missingFields
        },
        message: "Workflow generated successfully"
      };

      return c.json(response);
    } catch (error) {
      return c.json(
        {
          success: false,
          error: "Failed to generate workflow",
          message: error instanceof Error ? error.message : "Unknown error"
        },
        500
      );
    }
  }
}
