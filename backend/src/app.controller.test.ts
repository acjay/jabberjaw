import { assertEquals, assertObjectMatch } from "@std/assert";
import { describe, it, beforeEach } from "@std/testing/bdd";
import { AppController } from "./app.controller.ts";
import { AppService } from "./app.service.ts";

describe("AppController", () => {
  let appController: AppController;
  let appService: AppService;

  beforeEach(() => {
    appService = new AppService();
    appController = new AppController(appService);
  });

  describe("root", () => {
    it("should return welcome message", () => {
      const result = appController.getHello();
      assertEquals(
        result,
        "Jabberjaw Backend API is running with Deno and Danet!"
      );
    });

    it("should return health status", () => {
      const health = appController.getHealth();
      assertObjectMatch(health, {
        status: "healthy",
        service: "road-trip-narrator-backend",
        version: "1.0.0",
        runtime: "Deno",
      });
    });
  });
});
