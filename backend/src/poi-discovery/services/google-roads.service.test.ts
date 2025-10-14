import {
  assertEquals,
  assertRejects,
  assertExists,
  assertFalse,
  assert,
} from "@std/assert";
import { describe, it, beforeEach } from "@std/testing/bdd";
import { stub } from "@std/testing/mock";
import { GoogleRoadsService } from "./google-roads.service.ts";
import { GoogleMapsClient } from "../../shared/clients/google-maps-client.ts";
import { LocationData } from "../../models/location.model.ts";
import { ConfigurationService } from "../../shared/configuration/index.ts";

describe("GoogleRoadsService", () => {
  let service: GoogleRoadsService;
  let mockGoogleMapsClient: GoogleMapsClient;
  let configService: ConfigurationService;

  beforeEach(() => {
    // Create mock client - no pre-configured stubs
    mockGoogleMapsClient = {} as GoogleMapsClient;
    configService = new ConfigurationService();
    configService.setForTesting("GOOGLE_MAPS_API_KEY", "test-api-key");
    service = new GoogleRoadsService(mockGoogleMapsClient, configService);
  });

  describe("constructor", () => {
    it("should initialize with API key from environment", async () => {
      assertEquals(await service.isConfigured(), true);
    });
  });

  describe("snapToRoads", () => {
    it("should successfully snap location to road", async () => {
      // Stub the client methods for this specific test
      stub(mockGoogleMapsClient, "snapToRoads", () =>
        Promise.resolve({
          snappedPoints: [
            {
              location: {
                latitude: 40.758,
                longitude: -73.9855,
              },
              placeId: "test_place_id",
            },
          ],
        })
      );

      stub(mockGoogleMapsClient, "placeDetails", () =>
        Promise.resolve({
          result: {
            name: "Broadway",
          },
        })
      );

      const testLocation: LocationData = {
        latitude: 40.758,
        longitude: -73.9855,
        timestamp: new Date(),
        accuracy: 10,
      };

      const result = await service.snapToRoads(testLocation);

      assertExists(result);
      assertEquals(result.placeId, "test_place_id");
      assertEquals(result.snappedLocation.latitude, 40.758);
      assertEquals(result.snappedLocation.longitude, -73.9855);
      assertEquals(result.roadName, "Broadway");
    });

    it("should return null when no road is found", async () => {
      // Stub to return empty snapped points
      stub(mockGoogleMapsClient, "snapToRoads", () =>
        Promise.resolve({
          snappedPoints: [],
        })
      );

      const testLocation: LocationData = {
        latitude: 0,
        longitude: 0,
        timestamp: new Date(),
        accuracy: 10,
      };

      const result = await service.snapToRoads(testLocation);
      assertEquals(result, null);
    });

    it("should handle API errors appropriately", async () => {
      // Stub to throw an error
      stub(mockGoogleMapsClient, "snapToRoads", () => {
        throw new Error("Google Roads API error: 500");
      });

      const testLocation: LocationData = {
        latitude: 40.758,
        longitude: -73.9855,
        timestamp: new Date(),
        accuracy: 10,
      };

      await assertRejects(
        () => service.snapToRoads(testLocation),
        Error,
        "Google Roads API error"
      );
    });
  });

  describe("findNearestRoads", () => {
    it("should find multiple nearest roads", async () => {
      // Stub to return multiple roads
      stub(mockGoogleMapsClient, "nearestRoads", () =>
        Promise.resolve({
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
        })
      );

      // Stub place details for road names
      let callCount = 0;
      stub(mockGoogleMapsClient, "placeDetails", () => {
        const names = ["Broadway", "7th Avenue"];
        return Promise.resolve({
          result: {
            name: names[callCount++] || "Unknown Road",
          },
        });
      });

      const testLocation: LocationData = {
        latitude: 40.758,
        longitude: -73.9855,
        timestamp: new Date(),
        accuracy: 10,
      };

      const results = await service.findNearestRoads(testLocation);

      assertEquals(results.length, 2);
      assertEquals(results[0].placeId, "road1");
      assertEquals(results[0].roadName, "Broadway");
      assertEquals(results[1].placeId, "road2");
      assertEquals(results[1].roadName, "7th Avenue");
    });

    it("should return empty array when no roads are found", async () => {
      // Stub to return no roads
      stub(mockGoogleMapsClient, "nearestRoads", () =>
        Promise.resolve({
          snappedPoints: [],
        })
      );

      const testLocation: LocationData = {
        latitude: 0,
        longitude: 0,
        timestamp: new Date(),
        accuracy: 10,
      };

      const results = await service.findNearestRoads(testLocation);
      assertEquals(results.length, 0);
    });
  });

  describe("testConnection", () => {
    it("should return true for successful connection test", async () => {
      // Stub successful response
      stub(mockGoogleMapsClient, "snapToRoads", () =>
        Promise.resolve({
          snappedPoints: [
            {
              location: { latitude: 40.758, longitude: -73.9855 },
              placeId: "test_place_id",
            },
          ],
        })
      );

      stub(mockGoogleMapsClient, "placeDetails", () =>
        Promise.resolve({
          result: {
            name: "Test Road",
          },
        })
      );

      const result = await service.testConnection();
      assert(result);
    });

    it("should return false when connection fails", async () => {
      // Stub to throw an error
      stub(mockGoogleMapsClient, "snapToRoads", () => {
        throw new Error("Connection failed");
      });

      const result = await service.testConnection();
      assertFalse(result);
    });
  });
});
