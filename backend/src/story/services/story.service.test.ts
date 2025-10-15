import { assertEquals, assertExists } from "@std/assert";
import { beforeEach, describe, it } from "@std/testing/bdd";
import { stub } from "@std/testing/mock";
import { StoryService } from "./story.service.ts";
import { MockLLMService } from "./llm.service.ts";
import { OpenAILLMService } from "./openai-llm.service.ts";
import { OpenAIClient } from "../../shared/clients/openai-client.ts";
import { ContentStorageService } from "./content-storage.service.ts";
import { ConfigurationService } from "../../configuration/index.ts";
import type { FullStoryRequest } from "../../shared/schemas/index.ts";

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

    // Force the service to use the mock LLM service by making getOpenAIApiKey throw
    stub(configService, "getOpenAIApiKey", () => {
      throw new Error("No API key configured - use mock service");
    });

    service = new StoryService(
      llmService,
      openAIService,
      storageService,
      configService
    );
  });

  describe("generateContent", () => {
    it("should generate content for text description", async () => {
      const request: FullStoryRequest = {
        input: {
          type: "TextPOIDescription",
          description: "The town of Metuchen, NJ, USA",
        },
        targetDuration: 180,
        contentStyle: "mixed",
      };

      const result = await service.generateFullStory(request);

      assertExists(result.storyId);
      assertExists(result.content);
      assertEquals(typeof result.duration, "number");
      assertExists(result.generatedAt);
      assertEquals(result.status, "ready");
    });

    it("should generate content for structured POI", async () => {
      const request: FullStoryRequest = {
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

      const result = await service.generateFullStory(request);

      assertExists(result.storyId);
      assertExists(result.content);
      assertEquals(result.status, "ready");
    });

    it("should return cached content for similar requests", async () => {
      const request1: FullStoryRequest = {
        input: {
          type: "TextPOIDescription",
          description: "The town of Metuchen, NJ, USA",
        },
        targetDuration: 180,
        contentStyle: "mixed",
      };

      const request2: FullStoryRequest = {
        input: {
          type: "TextPOIDescription",
          description: "The town of Metuchen, NJ, USA",
        },
        targetDuration: 180,
        contentStyle: "mixed",
      };

      const result1 = await service.generateFullStory(request1);
      const result2 = await service.generateFullStory(request2);

      assertEquals(result1.storyId, result2.storyId);
      assertEquals(result1.content, result2.content);
    });
  });

  describe("getContent", () => {
    it("should retrieve stored content by ID", async () => {
      const request: FullStoryRequest = {
        input: {
          type: "TextPOIDescription",
          description: "Test location",
        },
        targetDuration: 180,
        contentStyle: "mixed",
      };

      const generated = await service.generateFullStory(request);
      const retrieved = service.getContent(generated.storyId); // No longer async

      assertExists(retrieved);
      assertEquals(retrieved.id, generated.storyId);
      assertEquals(retrieved.content, generated.content);
      assertExists(retrieved.prompt);
    });

    it("should return null for non-existent content", () => {
      const result = service.getContent("non-existent-id"); // No longer async
      assertEquals(result, null);
    });
  });

  describe("generateStorySeeds", () => {
    it("should generate story seeds for a structured POI", async () => {
      const poi = {
        type: "StructuredPOI" as const,
        name: "Morton Arboretum",
        poiType: "arboretum",
        location: {
          latitude: 41.8158,
          longitude: -88.0705,
        },
        description: "A beautiful arboretum in Lisle, Illinois",
        locationDescription: "Lisle, Illinois",
        category: "nature",
        tags: ["trees", "gardens", "nature"],
      };

      const result = await service.generateStorySeeds(poi);

      assertExists(result);
      assertEquals(Array.isArray(result), true);
      assertEquals(result.length > 0, true);

      // Check the structure of the first story seed
      const firstSeed = result[0];
      assertExists(firstSeed.storyId);
      assertExists(firstSeed.title);
      assertExists(firstSeed.summary);
      assertEquals(firstSeed.location.latitude, poi.location.latitude);
      assertEquals(firstSeed.location.longitude, poi.location.longitude);
      assertExists(firstSeed.createdAt);
    });

    it("should return cached story seeds for the same POI", async () => {
      const poi = {
        type: "StructuredPOI" as const,
        name: "Test Museum",
        poiType: "museum",
        location: {
          latitude: 42.3601,
          longitude: -71.0589,
        },
        description: "A test museum for caching",
        category: "culture",
      };

      // First call - should generate new seeds
      const result1 = await service.generateStorySeeds(poi);

      // Second call - should return cached seeds
      const result2 = await service.generateStorySeeds(poi);

      assertExists(result1);
      assertExists(result2);
      assertEquals(result1.length, result2.length);

      // The seeds should be the same (cached)
      assertEquals(result1[0].title, result2[0].title);
      assertEquals(result1[0].summary, result2[0].summary);
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
