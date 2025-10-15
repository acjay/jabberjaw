import { assertEquals, assertExists, assertRejects } from "@std/assert";
import { beforeEach, describe, it } from "@std/testing/bdd";
import { HttpException } from "@danet/core";
import { JourneyController } from "./journey.controller.ts";
import { JourneyService } from "./journey.service.ts";
import { POIIdentificationService } from "../poi-discovery/services/poi-identification.service.ts";
import { StoryService } from "../story/services/story.service.ts";
import { POICategory } from "../models/poi.model.ts";
import { stub } from "@std/testing/mock";
import type { JourneyLocationRequest } from "../shared/schemas/index.ts";

describe("Journey Integration", () => {
  let controller: JourneyController;
  let journeyService: JourneyService;
  let mockPOIService: POIIdentificationService;
  let mockStoryService: StoryService;

  beforeEach(() => {
    mockPOIService = {} as POIIdentificationService;
    mockStoryService = {} as StoryService;
    journeyService = new JourneyService(mockPOIService, mockStoryService);
    controller = new JourneyController(journeyService);
  });

  describe("processLocation", () => {
    it("should process location and return story seeds with POI data", async () => {
      // Stub POI service to return mock POIs
      stub(mockPOIService, "discoverPOIs", () =>
        Promise.resolve([
          {
            id: "poi-1",
            name: "Historic Downtown",
            category: POICategory.NEIGHBORHOOD,
            location: {
              latitude: 40.7128,
              longitude: -74.006,
            },
            description: "Historic downtown area with rich cultural heritage",
            metadata: {
              significanceScore: 85,
              significance: ["historical", "cultural"],
            },
          },
          {
            id: "poi-2",
            name: "Riverside Park",
            category: POICategory.PARK,
            location: {
              latitude: 40.7129,
              longitude: -74.0061,
            },
            description: "Beautiful waterfront park with walking trails",
            metadata: {
              significanceScore: 75,
              significance: ["recreational", "natural"],
            },
          },
        ])
      );

      // Stub story service to return mock content
      stub(mockStoryService, "generateContent", () =>
        Promise.resolve({
          id: "story-123",
          content:
            "Welcome to this historic downtown area, where centuries of history come alive. The nearby Riverside Park offers a peaceful retreat with stunning waterfront views...",
          duration: 180,
          status: "ready" as const,
        })
      );

      const locationData: JourneyLocationRequest = {
        latitude: 40.7128,
        longitude: -74.006,
      };

      const result = await controller.processLocation(locationData);

      // Verify response structure - now returns story seeds, not direct story
      assertExists(result.seeds);
      assertExists(result.location);
      assertExists(result.timestamp);

      assertEquals(Array.isArray(result.seeds), true);
      assertEquals(result.seeds.length > 0, true);
      assertEquals(typeof result.seeds[0].id, "string");
      assertEquals(typeof result.seeds[0].title, "string");
      assertEquals(typeof result.seeds[0].targetDuration, "number");
    });

    it("should handle service errors gracefully", async () => {
      // Stub POI service to throw an error
      stub(mockPOIService, "discoverPOIs", () => {
        throw new Error("Service unavailable");
      });

      const locationData: JourneyLocationRequest = {
        latitude: 40.7128,
        longitude: -74.006,
      };

      // Should not throw, but return fallback content
      const result = await controller.processLocation(locationData);

      // Verify fallback response structure
      assertExists(result.seeds);
      assertExists(result.location);
      assertExists(result.timestamp);
      assertEquals(Array.isArray(result.seeds), true);
      assertEquals(result.seeds.length > 0, true);
    });
  });

  describe("getStory", () => {
    it("should retrieve story by ID", async () => {
      // First create a story seed by processing a location
      stub(mockPOIService, "discoverPOIs", () =>
        Promise.resolve([
          {
            id: "poi-1",
            name: "Historic Downtown",
            category: POICategory.NEIGHBORHOOD,
            location: {
              latitude: 40.7128,
              longitude: -74.006,
            },
            description: "Historic downtown area with rich cultural heritage",
            metadata: {
              significanceScore: 85,
              significance: ["historical", "cultural"],
            },
          },
        ])
      );

      stub(mockStoryService, "generateContent", () =>
        Promise.resolve({
          id: "story-123",
          content:
            "Welcome to this historic downtown area, where centuries of history come alive. The nearby Riverside Park offers a peaceful retreat with stunning waterfront views...",
          duration: 180,
          status: "ready" as const,
        })
      );

      const locationData: JourneyLocationRequest = {
        latitude: 40.7128,
        longitude: -74.006,
      };

      const createResult = await controller.processLocation(locationData);
      const storyId = createResult.seeds[0].id; // Get ID from first seed

      // Now retrieve the story
      const story = controller.getStory(storyId);

      // Verify story structure
      assertExists(story.storyId);
      assertExists(story.content);
      assertExists(story.audioUrl);
      assertExists(story.duration);
      assertExists(story.status);
      assertExists(story.location);
      assertExists(story.generatedAt);

      assertEquals(story.storyId, storyId);
      assertEquals(story.status, "ready");
      assertEquals(typeof story.duration, "number");
      assertEquals(story.duration > 0, true);
      assertEquals(typeof story.content, "string");

      // Verify the content includes POI information
      const contentLower = story.content.toLowerCase();
      const hasPOIContent =
        contentLower.includes("historic downtown") ||
        contentLower.includes("riverside park") ||
        contentLower.includes("history") ||
        contentLower.includes("downtown");

      assertEquals(
        hasPOIContent,
        true,
        "Content should include POI information"
      );
    });

    it("should throw HttpException for non-existent story", () => {
      // Note: getStory is synchronous, not async
      try {
        controller.getStory("non-existent-id");
        throw new Error("Expected HttpException to be thrown");
      } catch (error) {
        assertEquals(error instanceof HttpException, true);
        if (error instanceof HttpException) {
          assertEquals(error.message.includes("Story not found"), true);
        }
      }
    });
  });

  describe("getHealth", () => {
    it("should return health status", () => {
      const health = controller.getHealth();

      assertExists(health.status);
      assertExists(health.service);
      assertExists(health.stories);

      assertEquals(health.status, "healthy");
      assertEquals(health.service, "journey");
      assertEquals(typeof health.stories, "number");
    });
  });
});
