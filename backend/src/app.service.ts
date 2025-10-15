import { Injectable } from "@danet/core";
import { ConfigurationService } from "./configuration/index.ts";

@Injectable()
export class AppService {
  constructor(private readonly configService: ConfigurationService) {}

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
