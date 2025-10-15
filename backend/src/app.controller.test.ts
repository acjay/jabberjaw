import { assertObjectMatch } from "@std/assert";
import { describe, it, beforeEach } from "@std/testing/bdd";
import { AppController } from "./app.controller.ts";
import { AppService } from "./app.service.ts";
import { ConfigurationService } from "./configuration/index.ts";

describe("AppController", () => {
  let appController: AppController;
  let appService: AppService;
  let configService: ConfigurationService;

  beforeEach(() => {
    configService = new ConfigurationService();
    configService.setForTesting("NODE_ENV", "test");
    appService = new AppService(configService);
    appController = new AppController(appService);
  });

  describe("root", () => {
    it("should return health status", async () => {
      const health = await appController.getHealth();
      assertObjectMatch(health, {
        status: "healthy",
        service: "road-trip-narrator-backend",
        version: "1.0.0",
        runtime: "Deno",
        environment: "test",
      });
    });
  });
});
