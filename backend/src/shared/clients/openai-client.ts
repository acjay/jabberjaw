import { Injectable } from "@danet/core";
import { FetchHttpClient } from "../fetch-http-client.ts";

/**
 * Client for OpenAI API
 */
@Injectable()
export class OpenAIClient {
  private readonly baseUrl = "https://api.openai.com/v1";

  constructor(private readonly httpClient: FetchHttpClient) {}

  /**
   * Make a chat completion request
   */
  async chatCompletion(
    params: {
      model: string;
      messages: Array<{ role: string; content: string }>;
      temperature?: number;
      max_tokens?: number;
      top_p?: number;
      frequency_penalty?: number;
      presence_penalty?: number;
    },
    apiKey: string
  ): Promise<any> {
    const response = await this.httpClient.post(
      `${this.baseUrl}/chat/completions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(params),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `OpenAI API error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    return await response.json();
  }

  /**
   * Make a completion request (legacy endpoint)
   */
  async completion(
    params: {
      model: string;
      prompt: string;
      temperature?: number;
      max_tokens?: number;
      top_p?: number;
      frequency_penalty?: number;
      presence_penalty?: number;
    },
    apiKey: string
  ): Promise<any> {
    const response = await this.httpClient.post(`${this.baseUrl}/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `OpenAI API error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    return await response.json();
  }
}
