import { assertEquals, assertExists, assertRejects } from "@std/assert";
import { beforeEach, describe, it } from "@std/testing/bdd";
import { HttpException } from "@danet/core";
import { JourneyController } from "./journey.controller.ts";
import { JourneyService } from "./journey.service.ts";
import { POIIdentificationService } from "../poi-discovery/services/poi-identification.service.ts";
import { StoryService } from "../story/services/story.service.ts";
import { POICategory } from "../models/poi.model.ts";
import { ContentStyle } from "../story/dto/content-request.dto.ts";
import { stub } from "@std/testing/mock";

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
              address: "Downtown Manhattan, NY",
            },
            description: "Historic downtown area with rich cultural heritage",
            metadata: {
              significanceScore: 85,
              source: "overpass",
              lastUpdated: new Date(),
            },
          },
          {
            id: "poi-2",
            name: "Riverside Park",
            category: POICategory.PARK,
            location: {
              latitude: 40.7129,
              longitude: -74.0061,
              address: "Riverside Park, NY",
            },
            description: "Beautiful waterfront park with walking trails",
            metadata: {
              significanceScore: 75,
              source: "overpass",
              lastUpdated: new Date(),
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
          estimatedDuration: 180,
          contentStyle: ContentStyle.MIXED,
          generatedAt: new Date().toISOString(),
        })
      );

      const locationData = {
        latitude: 40.7128,
        longitude: -74.006,
      };

      const result = await controller.processLocation(locationData);

      // Verify response structure
      assertExists(result.storyId);
      assertExists(result.audioUrl);
      assertExists(result.status);
      assertExists(result.estimatedDuration);

      assertEquals(result.status, "ready");
      assertEquals(typeof result.estimatedDuration, "number");
      assertEquals(result.estimatedDuration > 0, true);
      assertEquals(typeof result.storyId, "string");
      assertEquals(typeof result.audioUrl, "string");
    });

    it("should throw HttpException for invalid location data", async () => {
      const invalidData = {
        latitude: "invalid",
        longitude: -74.006,
      };

      await assertRejects(
        () => controller.processLocation(invalidData as any),
        HttpException,
        "Invalid location data"
      );
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
              address: "Downtown Manhattan, NY",
            },
            description: "Historic downtown area with rich cultural heritage",
            metadata: {
              significanceScore: 85,
              source: "overpass",
              lastUpdated: new Date(),
            },
          },
        ])
      );

      stub(mockStoryService, "generateContent", () =>
        Promise.resolve({
          id: "story-123",
          content:
            "Welcome to this historic downtown area, where centuries of history come alive. The nearby Riverside Park offers a peaceful retreat with stunning waterfront views...",
          estimatedDuration: 180,
          contentStyle: ContentStyle.MIXED,
          generatedAt: new Date().toISOString(),
        })
      );

      const locationData = {
        latitude: 40.7128,
        longitude: -74.006,
      };

      const createResult = await controller.processLocation(locationData);
      const storyId = createResult.storyId;

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
        assertEquals(error.message.includes("Story not found"), true);
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
