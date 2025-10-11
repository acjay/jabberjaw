import { Injectable } from "@danet/core";

@Injectable()
export class AppService {
  getHello(): string {
    return "Jabberjaw Backend API is running with Deno and Danet!";
  }

  getHealth() {
    return {
      status: "healthy",
      timestamp: new Date().toISOString(),
      service: "road-trip-narrator-backend",
      version: "1.0.0",
      runtime: "Deno",
      environment: Deno.env.get("NODE_ENV") || "development",
    };
  }
}
