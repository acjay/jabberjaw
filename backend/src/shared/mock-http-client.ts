import { FetchHttpClient } from "./fetch-http-client.ts";

/**
 * Mock HTTP client for testing
 * Allows tests to control HTTP responses without making real network calls
 */
export class MockHttpClient extends FetchHttpClient {
  private responses = new Map<string, Response>();
  private requestLog: Array<{ url: string; options?: RequestInit }> = [];

  /**
   * Set a mock response for a specific URL
   */
  setMockResponse(url: string, response: Response): void {
    this.responses.set(url, response);
  }

  /**
   * Set a mock response with JSON data
   */
  setMockJsonResponse(url: string, data: any, status = 200): void {
    const response = new Response(JSON.stringify(data), {
      status,
      headers: { "Content-Type": "application/json" },
    });
    this.setMockResponse(url, response);
  }

  /**
   * Set a mock error response
   */
  setMockErrorResponse(url: string, status: number, message?: string): void {
    const response = new Response(message || "Mock error", { status });
    this.setMockResponse(url, response);
  }

  /**
   * Get the log of all requests made
   */
  getRequestLog(): Array<{ url: string; options?: RequestInit }> {
    return [...this.requestLog];
  }

  /**
   * Clear all mock responses and request log
   */
  clear(): void {
    this.responses.clear();
    this.requestLog.length = 0;
  }

  override async fetch(url: string, options?: RequestInit): Promise<Response> {
    // Log the request
    this.requestLog.push({ url, options });

    // Check for exact URL match first
    if (this.responses.has(url)) {
      return this.responses.get(url)!.clone();
    }

    // Check for pattern matches (for URLs with query parameters)
    for (const [mockUrl, response] of this.responses.entries()) {
      if (this.urlMatches(url, mockUrl)) {
        return response.clone();
      }
    }

    // Default to 404 if no mock response is set
    throw new Error(`No mock response set for URL: ${url}`);
  }

  private urlMatches(actualUrl: string, mockUrl: string): boolean {
    // Simple pattern matching - can be enhanced as needed
    if (mockUrl.includes("*")) {
      const pattern = mockUrl.replace(/\*/g, ".*");
      return new RegExp(pattern).test(actualUrl);
    }

    // Check if the base URL matches (ignoring query parameters)
    try {
      const actualUrlObj = new URL(actualUrl);
      const mockUrlObj = new URL(mockUrl);
      return (
        actualUrlObj.origin + actualUrlObj.pathname ===
        mockUrlObj.origin + mockUrlObj.pathname
      );
    } catch {
      return actualUrl === mockUrl;
    }
  }
}
