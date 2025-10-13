/**
 * HTTP client interface for making external API requests
 * This abstraction allows for easy mocking in tests
 */
export interface HttpClient {
  /**
   * Make a GET request
   */
  get(url: string, options?: RequestInit): Promise<Response>;

  /**
   * Make a POST request
   */
  post(url: string, options?: RequestInit): Promise<Response>;

  /**
   * Make a generic fetch request
   */
  fetch(url: string, options?: RequestInit): Promise<Response>;
}

/**
 * HTTP request options with common configurations
 */
export interface HttpRequestOptions extends RequestInit {
  timeout?: number;
  retries?: number;
}
