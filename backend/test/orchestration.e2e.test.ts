import { assertEquals, assertExists } from "@std/assert";
import { afterAll, beforeAll, describe, it } from "@std/testing/bdd";
import { DanetApplication } from "@danet/core";
import { AppModule } from "../src/app.module.ts";

describe("Orchestration API (e2e)", () => {
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

  describe("/api/location (POST)", () => {
    it("should process location and return segment with POI data", async () => {
      const locationData = {
        latitude: 40.7128,
        longitude: -74.006,
      };

      const response = await fetch(`${baseUrl}/api/location`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(locationData),
      });

      assertEquals(response.status, 200);

      const result = await response.json();

      // Verify response structure
      assertExists(result.segmentId);
      assertExists(result.audioUrl);
      assertExists(result.status);
      assertExists(result.estimatedDuration);

      assertEquals(result.status, "ready");
      assertEquals(result.estimatedDuration, 180);
      assertEquals(typeof result.segmentId, "string");
      assertEquals(typeof result.audioUrl, "string");
    });

    it("should return 400 for invalid location data", async () => {
      const invalidData = {
        latitude: "invalid",
        longitude: -74.006,
      };

      const response = await fetch(`${baseUrl}/api/location`, {
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

  describe("/api/segment/:id (GET)", () => {
    it("should retrieve segment by ID", async () => {
      // First create a segment
      const locationData = {
        latitude: 40.7128,
        longitude: -74.006,
      };

      const createResponse = await fetch(`${baseUrl}/api/location`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(locationData),
      });

      const createResult = await createResponse.json();
      const segmentId = createResult.segmentId;

      // Now retrieve the segment
      const getResponse = await fetch(`${baseUrl}/api/segment/${segmentId}`);
      assertEquals(getResponse.status, 200);

      const segment = await getResponse.json();

      // Verify segment structure
      assertExists(segment.id);
      assertExists(segment.content);
      assertExists(segment.audioUrl);
      assertExists(segment.duration);
      assertExists(segment.status);
      assertExists(segment.location);
      assertExists(segment.generatedAt);

      assertEquals(segment.id, segmentId);
      assertEquals(segment.status, "ready");
      assertEquals(segment.duration, 180);
      assertEquals(typeof segment.content, "string");

      // Verify the content includes POI information
      // Since we're using mock POIs, the content should mention them
      const contentLower = segment.content.toLowerCase();
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

    it("should return 404 for non-existent segment", async () => {
      const response = await fetch(`${baseUrl}/api/segment/non-existent-id`);
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
      assertExists(health.segments);

      assertEquals(health.status, "healthy");
      assertEquals(health.service, "orchestration");
      assertEquals(typeof health.segments, "number");
    });
  });
});
