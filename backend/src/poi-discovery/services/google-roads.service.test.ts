import { assertEquals, assertRejects, assertExists } from "@std/assert";
import { describe, it, beforeEach, afterEach } from "@std/testing/bdd";
import { GoogleRoadsService } from "./google-roads.service.ts";
import { LocationData } from "../../models/location.model.ts";
import { TestUtils } from "../../shared/index.ts";

describe("GoogleRoadsService", () => {
  let service: GoogleRoadsService;
  let mockClients: ReturnType<typeof TestUtils.createMockApiClients>;

  beforeEach(() => {
    TestUtils.setupTestEnvironment();
    mockClients = TestUtils.createMockApiClients();
    service = new GoogleRoadsService(mockClients.googleMapsClient);
  });

  afterEach(() => {
    TestUtils.cleanupTestEnvironment();
  });

  describe("constructor", () => {
    it("should initialize with API key from environment", () => {
      assertEquals(service.isConfigured(), true);
    });

    it("should handle missing API key gracefully", () => {
      // Remove the API key
      Deno.env.delete("GOOGLE_ROADS_API_KEY");
      Deno.env.delete("GOOGLE_PLACES_API_KEY");

      const serviceWithoutKey = new GoogleRoadsService(
        mockClients.googleMapsClient
      );
      assertEquals(serviceWithoutKey.isConfigured(), false);
    });
  });

  describe("snapToRoads", () => {
    it("should successfully snap location to road", async () => {
      const testLocation: LocationData = {
        latitude: 40.758,
        longitude: -73.9855,
        timestamp: new Date(),
        accuracy: 10,
      };

      // Set up mock response
      mockClients.httpClient.setMockJsonResponse(
        "https://roads.googleapis.com/v1/snapToRoads*",
        {
          snappedPoints: [
            {
              location: {
                latitude: 40.758,
                longitude: -73.9855,
              },
              placeId: "test_place_id",
            },
          ],
        }
      );

      const result = await service.snapToRoads(testLocation);

      assertExists(result);
      assertEquals(result.placeId, "test_place_id");
      assertEquals(result.snappedLocation.latitude, 40.758);
      assertEquals(result.snappedLocation.longitude, -73.9855);
    });

    it("should return null when no road is found", async () => {
      const testLocation: LocationData = {
        latitude: 0,
        longitude: 0,
        timestamp: new Date(),
        accuracy: 10,
      };

      // Set up mock response with no snapped points
      mockClients.httpClient.setMockJsonResponse(
        "https://roads.googleapis.com/v1/snapToRoads*",
        {
          snappedPoints: [],
        }
      );

      const result = await service.snapToRoads(testLocation);
      assertEquals(result, null);
    });

    it("should handle API errors appropriately", async () => {
      const testLocation: LocationData = {
        latitude: 40.758,
        longitude: -73.9855,
        timestamp: new Date(),
        accuracy: 10,
      };

      // Set up error response
      mockClients.httpClient.setMockErrorResponse(
        "https://roads.googleapis.com/v1/snapToRoads*",
        500
      );

      await assertRejects(
        () => service.snapToRoads(testLocation),
        Error,
        "Google Roads API error"
      );
    });

    it("should throw error when API key is not configured", async () => {
      // Remove API key
      Deno.env.delete("GOOGLE_ROADS_API_KEY");
      Deno.env.delete("GOOGLE_PLACES_API_KEY");

      const serviceWithoutKey = new GoogleRoadsService(
        mockClients.googleMapsClient
      );

      const testLocation: LocationData = {
        latitude: 40.758,
        longitude: -73.9855,
        timestamp: new Date(),
        accuracy: 10,
      };

      await assertRejects(
        () => serviceWithoutKey.snapToRoads(testLocation),
        Error,
        "Google Roads API key not configured"
      );
    });
  });

  describe("findNearestRoads", () => {
    it("should find multiple nearest roads", async () => {
      const testLocation: LocationData = {
        latitude: 40.758,
        longitude: -73.9855,
        timestamp: new Date(),
        accuracy: 10,
      };

      // Set up mock response
      mockClients.httpClient.setMockJsonResponse(
        "https://roads.googleapis.com/v1/nearestRoads*",
        {
          snappedPoints: [
            {
              location: { latitude: 40.758, longitude: -73.9855 },
              placeId: "road1",
            },
            {
              location: { latitude: 40.7581, longitude: -73.9856 },
              placeId: "road2",
            },
          ],
        }
      );

      const results = await service.findNearestRoads(testLocation);

      assertEquals(results.length, 2);
      assertEquals(results[0].placeId, "road1");
      assertEquals(results[1].placeId, "road2");
    });

    it("should return empty array when no roads are found", async () => {
      const testLocation: LocationData = {
        latitude: 0,
        longitude: 0,
        timestamp: new Date(),
        accuracy: 10,
      };

      // Set up mock response with no roads
      mockClients.httpClient.setMockJsonResponse(
        "https://roads.googleapis.com/v1/nearestRoads*",
        {
          snappedPoints: [],
        }
      );

      const results = await service.findNearestRoads(testLocation);
      assertEquals(results.length, 0);
    });
  });

  describe("testConnection", () => {
    it("should return true for successful connection test", async () => {
      // Set up successful mock response
      mockClients.httpClient.setMockJsonResponse(
        "https://roads.googleapis.com/v1/snapToRoads*",
        {
          snappedPoints: [
            {
              location: { latitude: 40.758, longitude: -73.9855 },
              placeId: "test_place_id",
            },
          ],
        }
      );

      const result = await service.testConnection();
      assertEquals(result, true);
    });

    it("should return false when API key is not configured", async () => {
      // Remove API key
      Deno.env.delete("GOOGLE_ROADS_API_KEY");
      Deno.env.delete("GOOGLE_PLACES_API_KEY");

      const serviceWithoutKey = new GoogleRoadsService(
        mockClients.googleMapsClient
      );
      const result = await serviceWithoutKey.testConnection();
      assertEquals(result, false);
    });

    it("should return false when connection fails", async () => {
      // Set up error response
      mockClients.httpClient.setMockErrorResponse(
        "https://roads.googleapis.com/v1/snapToRoads*",
        500
      );

      const result = await service.testConnection();
      assertEquals(result, false);
    });
  });
});
