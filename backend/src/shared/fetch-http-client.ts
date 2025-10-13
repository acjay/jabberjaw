import { Injectable } from "@danet/core";
import { HttpClient, HttpRequestOptions } from "./http-client.interface.ts";

/**
 * Default HTTP client implementation using the native fetch API
 */
@Injectable()
export class FetchHttpClient implements HttpClient {
  private readonly defaultTimeout = 30000; // 30 seconds

  async get(url: string, options?: HttpRequestOptions): Promise<Response> {
    return this.fetch(url, { ...options, method: "GET" });
  }

  async post(url: string, options?: HttpRequestOptions): Promise<Response> {
    return this.fetch(url, { ...options, method: "POST" });
  }

  async fetch(url: string, options?: HttpRequestOptions): Promise<Response> {
    const timeout = options?.timeout ?? this.defaultTimeout;
    const retries = options?.retries ?? 0;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const requestOptions: RequestInit = {
      ...options,
      signal: controller.signal,
    };

    try {
      const response = await this.executeWithRetries(
        url,
        requestOptions,
        retries
      );
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  private async executeWithRetries(
    url: string,
    options: RequestInit,
    retries: number
  ): Promise<Response> {
    let lastError: Error;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await fetch(url, options);
      } catch (error) {
        lastError = error as Error;

        // Don't retry on the last attempt
        if (attempt === retries) {
          break;
        }

        // Wait before retrying (exponential backoff)
        const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }
}
