import { assertEquals, assertExists } from "@std/assert";
import { afterAll, beforeAll, describe, it } from "@std/testing/bdd";
import { DanetApplication } from "@danet/core";
import { AppModule } from "../src/app.module.ts";

describe("Journey API (e2e)", () => {
  let app: DanetApplication;
  let baseUrl: string;

  beforeAll(async () => {
    app = new DanetApplication();
    await app.init(AppModule);
    const port = 3001;
    await app.listen(port);
    baseUrl = `http://localhost:${port}`;
  });

  afterAll(async () => {
    await app.close();
  });

  describe("/api/story-seeds-for-location (POST)", () => {
    it("should process location and return story seeds with POI data", async () => {
      const locationData = {
        latitude: 40.7128,
        longitude: -74.006,
      };

      const response = await fetch(`${baseUrl}/api/story-seeds-for-location`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(locationData),
      });

      assertEquals(response.status, 200);

      const result = await response.json();

      // Verify response structure
      assertExists(result.storyId);
      assertExists(result.audioUrl);
      assertExists(result.status);
      assertExists(result.estimatedDuration);

      assertEquals(result.status, "ready");
      // Duration should be a positive number (varies based on content generation)
      assertEquals(typeof result.estimatedDuration, "number");
      assertEquals(result.estimatedDuration > 0, true);
      assertEquals(typeof result.storyId, "string");
      assertEquals(typeof result.audioUrl, "string");
    });

    it("should return 400 for invalid location data", async () => {
      const invalidData = {
        latitude: "invalid",
        longitude: -74.006,
      };

      const response = await fetch(`${baseUrl}/api/story-seeds-for-location`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(invalidData),
      });

      assertEquals(response.status, 400);
      await response.text(); // Consume response body to prevent leak
    });
  });

  describe("/api/story/:id (GET)", () => {
    it("should retrieve story by ID", async () => {
      // First create a story seed
      const locationData = {
        latitude: 40.7128,
        longitude: -74.006,
      };

      const createResponse = await fetch(
        `${baseUrl}/api/story-seeds-for-location`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(locationData),
        }
      );

      const createResult = await createResponse.json();
      const storyId = createResult.storyId;

      // Now retrieve the story
      const getResponse = await fetch(`${baseUrl}/api/story/${storyId}`);
      assertEquals(getResponse.status, 200);

      const story = await getResponse.json();

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
      // Duration should be a positive number (varies based on content generation)
      assertEquals(typeof story.duration, "number");
      assertEquals(story.duration > 0, true);
      assertEquals(typeof story.content, "string");

      // Verify the content includes POI information
      // Since we're using mock POIs, the content should mention them
      const contentLower = story.content.toLowerCase();
      const hasPOIContent =
        contentLower.includes("historic downtown") ||
        contentLower.includes("riverside park") ||
        contentLower.includes("history museum") ||
        contentLower.includes("enhanced narration") ||
        contentLower.includes("poi data");

      assertEquals(
        hasPOIContent,
        true,
        "Content should include POI information"
      );
    });

    it("should return 404 for non-existent story", async () => {
      const response = await fetch(`${baseUrl}/api/story/non-existent-id`);
      assertEquals(response.status, 404);
      await response.text(); // Consume response body to prevent leak
    });
  });

  describe("/api/health (GET)", () => {
    it("should return health status", async () => {
      const response = await fetch(`${baseUrl}/api/health`);
      assertEquals(response.status, 200);

      const health = await response.json();
      assertExists(health.status);
      assertExists(health.service);
      assertExists(health.stories);

      assertEquals(health.status, "healthy");
      assertEquals(health.service, "journey");
      assertEquals(typeof health.stories, "number");
    });
  });
});
