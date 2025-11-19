import { Env } from "../types/env";

interface GeminiPart {
  text?: string;
  inline_data?: {
    mime_type: string;
    data: string;
  };
}

interface GeminiRequest {
  contents: Array<{
    role: string;
    parts: GeminiPart[];
  }>;
  generationConfig: {
    maxOutputTokens: number;
    temperature: number;
  };
}

interface GeminiCandidate {
  content: {
    parts: Array<{
      text: string;
    }>;
  };
}

interface GeminiResponse {
  candidates?: GeminiCandidate[];
}

export class AIGatewayService {
  constructor(private env: Env) {}

  private extractJsonFromMarkdown(content: string): string {
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      return jsonMatch[1].trim();
    }
    
    const jsonStart = content.indexOf('{');
    const jsonEnd = content.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      return content.substring(jsonStart, jsonEnd + 1);
    }
    
    return content.trim();
  }

  async generateWorkflow(
    prompt: string,
    imageBase64?: string,
    imageMimeType?: string
  ): Promise<any> {
    try {
      const parts: GeminiPart[] = [];
      
      if (prompt) {
        parts.push({ text: prompt });
      }
      
      if (imageBase64 && imageMimeType) {
        parts.push({
          inline_data: {
            mime_type: imageMimeType,
            data: imageBase64
          }
        });
      }

      if (parts.length === 0) {
        throw new Error("At least text or image must be provided");
      }

      const requestBody: GeminiRequest = {
        contents: [
          {
            role: "user",
            parts
          }
        ],
        generationConfig: {
          maxOutputTokens: 8192,
          temperature: 0.7
        }
      };

      console.log({token: this.env.AI_GATEWAY_TOKEN, url: this.env.AI_GATEWAY_URL});

      const response = await fetch(this.env.AI_GATEWAY_URL, {
        method: "POST",
        headers: {
          "x-goog-api-key": this.env.AI_GATEWAY_TOKEN,
          "content-type": "application/json"
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("AI Gateway error:", errorText);
        throw new Error(
          `AI Gateway error: ${response.status} ${response.statusText} - ${errorText}`
        );
      }

      const data = (await response.json()) as GeminiResponse;

      if (data.candidates && data.candidates[0] && data.candidates[0].content) {
        const content = data.candidates[0].content.parts[0]?.text;
        if (!content) {
          throw new Error("No text content in AI response");
        }

        const cleanedContent = this.extractJsonFromMarkdown(content);

        try {
          return JSON.parse(cleanedContent);
        } catch (parseError) {
          throw new Error(
            `Failed to parse AI response as JSON: ${parseError instanceof Error ? parseError.message : "Unknown error"}`
          );
        }
      } else {
        throw new Error("Invalid AI response structure");
      }
    } catch (error) {
      throw error;
    }
  }
}
