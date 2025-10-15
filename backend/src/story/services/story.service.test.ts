import { assertEquals, assertExists } from "@std/assert";
import { beforeEach, describe, it } from "@std/testing/bdd";
import { stub } from "@std/testing/mock";
import { StoryService } from "./story.service.ts";
import { MockLLMService } from "./llm.service.ts";
import { OpenAILLMService } from "./openai-llm.service.ts";
import { OpenAIClient } from "../../shared/clients/openai-client.ts";
import { ContentStorageService } from "./content-storage.service.ts";
import { ConfigurationService } from "../../configuration/index.ts";
import type { ContentRequest } from "../../shared/schemas/index.ts";

describe("StoryService", () => {
  let service: StoryService;
  let llmService: MockLLMService;
  let storageService: ContentStorageService;
  let configService: ConfigurationService;

  beforeEach(() => {
    llmService = new MockLLMService();
    storageService = new ContentStorageService();
    configService = new ConfigurationService();

    // Create mock OpenAI client
    const mockOpenAIClient = new OpenAIClient();
    stub(mockOpenAIClient, "chatCompletion", () =>
      Promise.resolve({
        choices: [
          {
            message: {
              content:
                "This is a mock response from OpenAI for testing purposes. It provides engaging travel content about the requested location with historical context, cultural significance, and interesting facts that would be perfect for road trip travelers. The content is designed to be informative yet entertaining, suitable for a 3-minute podcast-style narration.",
            },
            finish_reason: "stop",
          },
        ],
        usage: {
          prompt_tokens: 150,
          completion_tokens: 200,
          total_tokens: 350,
        },
      })
    );

    const openAIService = new OpenAILLMService(mockOpenAIClient, configService);
    service = new StoryService(
      llmService,
      openAIService,
      storageService,
      configService
    );
  });

  describe("generateContent", () => {
    it("should generate content for text description", async () => {
      const request: ContentRequest = {
        input: {
          type: "TextPOIDescription",
          description: "The town of Metuchen, NJ, USA",
        },
        targetDuration: 180,
        contentStyle: "mixed",
      };

      const result = await service.generateContent(request);

      assertExists(result.id);
      assertExists(result.content);
      assertEquals(typeof result.duration, "number");
      assertExists(result.generatedAt);
      assertEquals(result.status, "ready");
    });

    it("should generate content for structured POI", async () => {
      const request: ContentRequest = {
        input: {
          name: "Morton Arboretum",
          poiType: "arboretum",
          location: {
            latitude: 41.8158,
            longitude: -88.0705,
          },
          description: "A beautiful arboretum in Lisle, Illinois",
        },
        targetDuration: 180,
        contentStyle: "geographical",
      };

      const result = await service.generateContent(request);

      assertExists(result.id);
      assertExists(result.content);
      assertEquals(result.status, "ready");
    });

    it("should return cached content for similar requests", async () => {
      const request1: ContentRequest = {
        input: {
          type: "TextPOIDescription",
          description: "The town of Metuchen, NJ, USA",
        },
        targetDuration: 180,
        contentStyle: "mixed",
      };

      const request2: ContentRequest = {
        input: {
          type: "TextPOIDescription",
          description: "The town of Metuchen, NJ, USA",
        },
        targetDuration: 180,
        contentStyle: "mixed",
      };

      const result1 = await service.generateContent(request1);
      const result2 = await service.generateContent(request2);

      assertEquals(result1.id, result2.id);
      assertEquals(result1.content, result2.content);
    });
  });

  describe("getContent", () => {
    it("should retrieve stored content by ID", async () => {
      const request: ContentRequest = {
        input: {
          type: "TextPOIDescription",
          description: "Test location",
        },
        targetDuration: 180,
        contentStyle: "mixed",
      };

      const generated = await service.generateContent(request);
      const retrieved = service.getContent(generated.id); // No longer async

      assertExists(retrieved);
      assertEquals(retrieved.id, generated.id);
      assertEquals(retrieved.content, generated.content);
      assertExists(retrieved.prompt);
    });

    it("should return null for non-existent content", () => {
      const result = service.getContent("non-existent-id"); // No longer async
      assertEquals(result, null);
    });
  });

  describe("getStats", () => {
    it("should return service statistics", () => {
      const stats = service.getStats();

      assertEquals(stats.service, "story");
      assertEquals(stats.status, "healthy");
      assertExists(stats.storage);
      assertEquals(typeof stats.storage.total, "number");
    });
  });
});
