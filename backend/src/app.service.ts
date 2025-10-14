import { Injectable } from "@danet/core";
import { ConfigurationService } from "./shared/configuration/index.ts";

@Injectable()
export class AppService {
  constructor(private readonly configService: ConfigurationService) {}

  getHello(): string {
    return "Jabberjaw Backend API is running with Deno and Danet!";
  }

  async getHealth() {
    const environment =
      (await this.configService.get("NODE_ENV")) || "development";

    return {
      status: "healthy",
      timestamp: new Date().toISOString(),
      service: "road-trip-narrator-backend",
      version: "1.0.0",
      runtime: "Deno",
      environment,
    };
  }
}
