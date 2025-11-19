import { BaseNodeHandler } from "./base.handler";
import { ExecutionContext, ExecutionResult } from "../schemas/types";

export class HttpRequestHandler extends BaseNodeHandler {
  async execute(context: ExecutionContext): Promise<ExecutionResult> {
    this.log(context, "Executing HTTP request");

    const config = context.config || {};
    const url = config.url || "https://api.example.com";
    const method = config.method || "GET";
    const headers = this.extractHeaders(config.headers);
    const body = this.prepareBody(config.body);

    this.log(context, `Making ${method} request to ${url}`);

    try {
      const response = await fetch(url, {
        method,
        headers,
        ...(body && { body })
      });

      const responseText = await response.text();
      let responseBody: any;
      try {
        responseBody = JSON.parse(responseText);
      } catch {
        responseBody = responseText;
      }

      const headersObj: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headersObj[key] = value;
      });

      const result = {
        status: response.status,
        statusText: response.statusText,
        headers: headersObj,
        body: responseBody
      };

      this.log(context, `Response status: ${response.status}`);

      return {
        success: response.ok,
        output: result,
        logs: context.logs
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Request failed";
      this.log(context, `HTTP request failed: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
        logs: context.logs
      };
    }
  }

  private extractHeaders(headers: any): Record<string, string> {
    if (!headers) return {};
    if (Array.isArray(headers)) {
      return headers.reduce((acc, h) => ({ ...acc, [h.key]: h.value }), {});
    }
    return headers;
  }

  private prepareBody(body: any): string | undefined {
    if (!body || body.type === "none") return undefined;

    if (body.type === "json") {
      return JSON.stringify(body.content);
    }
    if (body.type === "text") {
      return body.content;
    }
    if (body.type === "form") {
      const params = new URLSearchParams(body.content);
      return params.toString();
    }

    return body.content;
  }
}

