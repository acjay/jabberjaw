import { Injectable } from "@danet/core";
import { load } from "@std/dotenv";

@Injectable()
export class ConfigurationService {
  private config: Record<string, string> = {};
  private initialized = false;

  constructor() {
    this.initializeConfig();
  }

  private async initializeConfig(): Promise<void> {
    if (this.initialized) return;

    try {
      // Load environment variables from .env file
      const envVars = await load();

      // Merge with system environment variables (system takes precedence)
      this.config = {
        ...envVars,
        ...Deno.env.toObject(),
      };

      this.initialized = true;
    } catch (error) {
      // If .env file doesn't exist, just use system environment
      this.config = Deno.env.toObject();
      this.initialized = true;
    }
  }

  async get(key: string): Promise<string | undefined> {
    await this.initializeConfig();
    return this.config[key];
  }

  async getRequired(key: string): Promise<string> {
    const value = await this.get(key);
    if (value === undefined) {
      throw new Error(`Required environment variable ${key} is not set`);
    }
    return value;
  }

  async getPort(): Promise<number> {
    const port = await this.get("PORT");
    return port ? parseInt(port, 10) : 3000;
  }

  async getOpenAIApiKey(): Promise<string> {
    return await this.getRequired("OPENAI_API_KEY");
  }

  async getOpenAIModel(): Promise<string> {
    const model = await this.get("OPENAI_MODEL");
    return model || "gpt-4o-mini";
  }

  async getGoogleMapsApiKey(): Promise<string> {
    return await this.getRequired("GOOGLE_MAPS_API_KEY");
  }

  // For testing purposes - allows overriding config values
  setForTesting(key: string, value: string): void {
    this.config[key] = value;
    this.initialized = true; // Mark as initialized to prevent loading from env
  }

  // For testing purposes - clears all config
  clearForTesting(): void {
    this.config = {};
    this.initialized = false;
  }
}
