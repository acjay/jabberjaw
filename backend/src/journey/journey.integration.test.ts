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

  describe("storySeedsForLocation", () => {
    it("should generate story seeds for a valid location", async () => {
      // Mock POI service to return some test POIs
      stub(mockPOIService, "discoverPOIs", () =>
        Promise.resolve([
          {
            id: "poi-1",
            name: "Test Town",
            category: POICategory.TOWN,
            location: { latitude: 40.7128, longitude: -74.006 },
            description: "A test town",
            metadata: { significanceScore: 0.8 },
          },
        ])
      );

      // Mock story service to return generated content
      stub(mockStoryService, "generateContent", () =>
        Promise.resolve({
          id: "story-1",
          content: "This is a test story about Test Town...",
          duration: 180,
          status: "ready" as const,
          generatedAt: new Date(),
        })
      );

      const request: JourneyLocationRequest = {
        latitude: 40.7128,
        longitude: -74.006,
      };

      const result = await controller.processLocation(request);

      assertExists(result.seeds);
      assertEquals(Array.isArray(result.seeds), true);
      assertEquals(result.seeds.length, 1);
      assertEquals(result.seeds[0].title, "Story for Near Test Town");
      assertExists(result.location);
      assertEquals(result.location.latitude, 40.7128);
      assertEquals(result.location.longitude, -74.006);
    });

    it("should handle locations with no POIs", async () => {
      // Mock POI service to return empty array
      stub(mockPOIService, "discoverPOIs", () => Promise.resolve([]));

      // Mock story service to return generated content
      stub(mockStoryService, "generateContent", () =>
        Promise.resolve({
          id: "story-2",
          content: "This is a fallback story...",
          duration: 60,
          status: "ready" as const,
          generatedAt: new Date(),
        })
      );

      const request: JourneyLocationRequest = {
        latitude: 0,
        longitude: 0,
      };

      const result = await controller.processLocation(request);

      assertExists(result.seeds);
      assertEquals(result.seeds.length, 1);
      assertExists(result.seeds[0].title);
    });

    it("should validate latitude bounds", async () => {
      // Don't need to stub services since validation happens first
      const request: JourneyLocationRequest = {
        latitude: 91, // Invalid latitude
        longitude: 0,
      };

      await assertRejects(
        () => controller.processLocation(request),
        HttpException,
        "Latitude must be between -90 and 90 degrees"
      );
    });

    it("should validate longitude bounds", async () => {
      // Don't need to stub services since validation happens first
      const request: JourneyLocationRequest = {
        latitude: 0,
        longitude: 181, // Invalid longitude
      };

      await assertRejects(
        () => controller.processLocation(request),
        HttpException,
        "Longitude must be between -180 and 180 degrees"
      );
    });
  });

  describe("getStory", () => {
    it("should retrieve an existing story", async () => {
      // First, create a story by calling storySeedsForLocation
      stub(mockPOIService, "discoverPOIs", () => Promise.resolve([]));
      stub(mockStoryService, "generateContent", () =>
        Promise.resolve({
          id: "test-story-id",
          content: "This is a test story content...",
          duration: 120,
          status: "ready" as const,
          generatedAt: new Date(),
        })
      );

      const locationRequest: JourneyLocationRequest = {
        latitude: 40.7128,
        longitude: -74.006,
      };

      await controller.processLocation(locationRequest);

      // Now retrieve the story
      const story = controller.getStory("test-story-id");

      assertExists(story);
      assertEquals(story.storyId, "test-story-id");
      assertEquals(story.content, "This is a test story content...");
      assertEquals(story.duration, 120);
    });

    it("should throw 404 for non-existent story", () => {
      try {
        controller.getStory("non-existent-id");
        throw new Error("Expected HttpException to be thrown");
      } catch (error) {
        if (error instanceof HttpException) {
          assertEquals(
            error.message,
            "404 - Story with ID 'non-existent-id' not found"
          );
        } else {
          throw error;
        }
      }
    });

    it("should validate story ID format", () => {
      try {
        controller.getStory("ab"); // Too short
        throw new Error("Expected HttpException to be thrown");
      } catch (error) {
        if (error instanceof HttpException) {
          assertEquals(error.message, "400 - Invalid story ID format");
        } else {
          throw error;
        }
      }
    });

    it("should reject empty story ID", () => {
      try {
        controller.getStory("");
        throw new Error("Expected HttpException to be thrown");
      } catch (error) {
        if (error instanceof HttpException) {
          assertEquals(error.message, "400 - Story ID is required");
        } else {
          throw error;
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
