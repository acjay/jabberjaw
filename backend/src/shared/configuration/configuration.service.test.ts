import { assertEquals } from "@std/assert";
import { describe, it, beforeEach } from "@std/testing/bdd";
import { ConfigurationService } from "./configuration.service.ts";

describe("ConfigurationService", () => {
  let configService: ConfigurationService;

  beforeEach(() => {
    configService = new ConfigurationService();
  });

  describe("basic functionality", () => {
    it("should return undefined for non-existent keys", async () => {
      const value = await configService.get("NON_EXISTENT_KEY");
      assertEquals(value, undefined);
    });

    it("should throw error for required non-existent keys", async () => {
      try {
        await configService.getRequired("NON_EXISTENT_KEY");
        throw new Error("Should have thrown");
      } catch (error) {
        assertEquals(
          (error as Error).message,
          "Required environment variable NON_EXISTENT_KEY is not set"
        );
      }
    });

    it("should return default port when PORT is not set", async () => {
      const port = await configService.getPort();
      assertEquals(port, 3000);
    });

    it("should return default OpenAI model when not set", async () => {
      const model = await configService.getOpenAIModel();
      assertEquals(model, "gpt-4o-mini");
    });
  });

  describe("testing functionality", () => {
    it("should allow setting values for testing", async () => {
      configService.setForTesting("TEST_KEY", "test_value");
      const value = await configService.get("TEST_KEY");
      assertEquals(value, "test_value");
    });

    it("should allow clearing config for testing", async () => {
      configService.setForTesting("TEST_KEY", "test_value");
      configService.clearForTesting();
      const value = await configService.get("TEST_KEY");
      assertEquals(value, undefined);
    });

    it("should parse port correctly", async () => {
      configService.setForTesting("PORT", "8080");
      const port = await configService.getPort();
      assertEquals(port, 8080);
    });
  });
});
