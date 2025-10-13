import { assertEquals, assertExists } from "@std/assert";
import { beforeEach, describe, it } from "@std/testing/bdd";
import { HighwayDetectionComparisonService } from "./highway-detection-comparison.service.ts";
import { POIIdentificationService } from "./poi-identification.service.ts";
import { GoogleRoadsService } from "./google-roads.service.ts";
import { LocationData } from "../../models/location.model.ts";
import { TestUtils } from "../../shared/index.ts";

describe("HighwayDetectionComparisonService", () => {
  let service: HighwayDetectionComparisonService;
  let poiService: POIIdentificationService;
  let googleRoadsService: GoogleRoadsService;
  let mockClients: ReturnType<typeof TestUtils.createMockApiClients>;

  beforeEach(() => {
    TestUtils.setupTestEnvironment();
    mockClients = TestUtils.createMockApiClients();

    poiService = new POIIdentificationService(
      mockClients.overpassClient,
      mockClients.googleMapsClient,
      mockClients.nominatimClient
    );
    googleRoadsService = new GoogleRoadsService(mockClients.googleMapsClient);
    service = new HighwayDetectionComparisonService(
      poiService,
      googleRoadsService,
      mockClients.overpassClient
    );
  });

  describe("compareDetectionMethods", () => {
    it("should return comparison results for all four methods", async () => {
      const testLocation: LocationData = {
        latitude: 40.53383335817636,
        longitude: -74.3467882397128,
        timestamp: new Date(),
        accuracy: 10,
      };

      const result = await service.compareDetectionMethods(testLocation);

      // Verify response structure
      assertExists(result.location);
      assertExists(result.methods);
      assertExists(result.timestamp);

      assertEquals(result.location.latitude, testLocation.latitude);
      assertEquals(result.location.longitude, testLocation.longitude);

      // Verify all four methods are present
      assertExists(result.methods.current);
      assertExists(result.methods.pointToLine);
      assertExists(result.methods.googleRoads);
      assertExists(result.methods.enhancedOverpass);

      // Verify each method has the required structure
      for (const [methodName, methodResult] of Object.entries(result.methods)) {
        assertExists(methodResult.highways);
        assertExists(methodResult.processingTime);
        assertExists(methodResult.method);
        assertEquals(typeof methodResult.processingTime, "number");
        assertEquals(typeof methodResult.method, "string");
        assertEquals(methodResult.method, methodName);
      }
    });

    it("should handle different test locations", async () => {
      const testLocations = [
        { latitude: 40.7128, longitude: -74.006, name: "NYC" },
        { latitude: 37.7749, longitude: -122.4194, name: "San Francisco" },
      ];

      for (const location of testLocations) {
        const testLocation: LocationData = {
          latitude: location.latitude,
          longitude: location.longitude,
          timestamp: new Date(),
          accuracy: 10,
        };

        const result = await service.compareDetectionMethods(testLocation);

        assertExists(result);
        assertEquals(result.location.latitude, location.latitude);
        assertEquals(result.location.longitude, location.longitude);

        // All methods should return results (even if empty due to API limitations)
        assertExists(result.methods.current);
        assertExists(result.methods.pointToLine);
        assertExists(result.methods.googleRoads);
        assertExists(result.methods.enhancedOverpass);
      }
    });

    it("should include performance timing for each method", async () => {
      const testLocation: LocationData = {
        latitude: 40.7128,
        longitude: -74.006,
        timestamp: new Date(),
        accuracy: 10,
      };

      const result = await service.compareDetectionMethods(testLocation);

      // Each method should have processing time
      for (const [methodName, methodResult] of Object.entries(result.methods)) {
        assertEquals(typeof methodResult.processingTime, "number");
        assertEquals(methodResult.processingTime >= 0, true);

        // Processing time should be reasonable (less than 30 seconds)
        assertEquals(methodResult.processingTime < 30000, true);
      }
    });

    it("should handle method failures gracefully", async () => {
      // Test with edge case location that might cause API failures
      const edgeLocation: LocationData = {
        latitude: 0, // Null Island
        longitude: 0,
        timestamp: new Date(),
        accuracy: 10,
      };

      const result = await service.compareDetectionMethods(edgeLocation);

      assertExists(result);

      // All methods should be present even if they failed
      assertExists(result.methods.current);
      assertExists(result.methods.pointToLine);
      assertExists(result.methods.googleRoads);
      assertExists(result.methods.enhancedOverpass);

      // Methods that fail should have error field or empty results
      for (const [methodName, methodResult] of Object.entries(result.methods)) {
        // Should have either highways or error
        const hasResults = Array.isArray(methodResult.highways);
        const hasError = typeof methodResult.error === "string";

        assertEquals(hasResults || hasError, true);

        // Should still have processing time
        assertEquals(typeof methodResult.processingTime, "number");
      }
    });
  });
});
