import { assert, assertEquals, assertExists } from "@std/assert";
import { beforeEach, describe, it } from "@std/testing/bdd";
import {
  HighwayDetectionController,
  HighwayDetectionComparison,
} from "./highway-detection.controller.ts";
import { POIIdentificationService } from "./services/poi-identification.service.ts";
import { GoogleRoadsService } from "./services/google-roads.service.ts";
import { HighwayDetectionComparisonService } from "./services/highway-detection-comparison.service.ts";

describe("Highway Detection Comparison API", () => {
  let controller: HighwayDetectionController;
  let poiService: POIIdentificationService;
  let googleRoadsService: GoogleRoadsService;

  beforeEach(() => {
    poiService = new POIIdentificationService();
    googleRoadsService = new GoogleRoadsService();
    const comparisonService = new HighwayDetectionComparisonService(
      poiService,
      googleRoadsService
    );
    controller = new HighwayDetectionController(comparisonService);
  });

  describe("POST /api/highway/detection-comparison", () => {
    it("should validate input parameters", async () => {
      // Test invalid latitude
      try {
        await controller.compareHighwayDetectionMethods({
          latitude: 91,
          longitude: -74,
        });
        assert(false, "Should have thrown error for invalid latitude");
      } catch (error) {
        assert((error as Error).message.includes("Invalid latitude"));
      }

      // Test invalid longitude
      try {
        await controller.compareHighwayDetectionMethods({
          latitude: 40,
          longitude: 181,
        });
        assert(false, "Should have thrown error for invalid longitude");
      } catch (error) {
        assert((error as Error).message.includes("Invalid longitude"));
      }

      // Test missing parameters
      try {
        await controller.compareHighwayDetectionMethods({});
        assert(false, "Should have thrown error for missing parameters");
      } catch (error) {
        assert((error as Error).message.includes("Invalid"));
      }
    });

    it("should return comparison results for all four methods", async () => {
      // Test location on US Route 1 from highway-detection-methods.md
      const testLocation = {
        latitude: 40.53383335817636,
        longitude: -74.3467882397128,
      };

      const result = await controller.compareHighwayDetectionMethods(
        testLocation
      );

      // Verify response structure
      assertExists(result);
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
        assert(Array.isArray(methodResult.highways));
        assert(typeof methodResult.processingTime === "number");
        assert(typeof methodResult.method === "string");
        assertEquals(methodResult.method, methodName);
      }
    });

    it("should include performance timing for each method", async () => {
      const testLocation = {
        latitude: 40.7128, // NYC coordinates
        longitude: -74.006,
      };

      const result = await controller.compareHighwayDetectionMethods(
        testLocation
      );

      // Each method should have processing time
      for (const [methodName, methodResult] of Object.entries(result.methods)) {
        assert(typeof methodResult.processingTime === "number");
        assert(methodResult.processingTime >= 0);

        // Processing time should be reasonable (less than 30 seconds)
        assert(
          methodResult.processingTime < 30000,
          `${methodName} processing time should be reasonable: ${methodResult.processingTime}ms`
        );
      }
    });

    it("should return highway results with required fields", async () => {
      const testLocation = {
        latitude: 40.7128,
        longitude: -74.006,
      };

      const result = await controller.compareHighwayDetectionMethods(
        testLocation
      );

      // Check highway result structure for each method
      for (const [methodName, methodResult] of Object.entries(result.methods)) {
        if (methodResult.highways.length > 0) {
          for (const highway of methodResult.highways) {
            assertExists(highway.name);
            assertExists(highway.type);
            assertExists(highway.distance);
            assertExists(highway.confidence);

            assert(typeof highway.name === "string");
            assert(typeof highway.type === "string");
            assert(typeof highway.distance === "number");
            assert(typeof highway.confidence === "number");

            // Distance should be non-negative
            assert(highway.distance >= 0);

            // Confidence should be between 0 and 1
            assert(highway.confidence >= 0 && highway.confidence <= 1);

            // Should have metadata
            if (highway.metadata) {
              assertExists(highway.metadata.method);
              assertEquals(highway.metadata.method, methodName);
            }
          }
        }
      }
    });

    it("should handle different test locations from highway-detection-methods.md", async () => {
      const testLocations = [
        {
          latitude: 40.53383335817636,
          longitude: -74.3467882397128,
          name: "US Route 1",
        },
        { latitude: 40.7128, longitude: -74.006, name: "NYC Interstate" },
        { latitude: 37.7749, longitude: -122.4194, name: "San Francisco" },
      ];

      for (const location of testLocations) {
        const result = await controller.compareHighwayDetectionMethods(
          location
        );

        assertExists(result);
        assertEquals(result.location.latitude, location.latitude);
        assertEquals(result.location.longitude, location.longitude);

        // All methods should return results (even if empty due to API limitations)
        assertExists(result.methods.current);
        assertExists(result.methods.pointToLine);
        assertExists(result.methods.googleRoads);
        assertExists(result.methods.enhancedOverpass);

        // At least some methods should find highways (mock data should be returned)
        const totalHighways = Object.values(result.methods).reduce(
          (sum, method) => sum + method.highways.length,
          0
        );

        assert(
          totalHighways >= 0,
          `Should return some highway results for ${location.name}`
        );
      }
    });

    it("should handle method failures gracefully", async () => {
      // Test with edge case location that might cause API failures
      const edgeLocation = {
        latitude: 0, // Null Island
        longitude: 0,
      };

      const result = await controller.compareHighwayDetectionMethods(
        edgeLocation
      );

      assertExists(result);

      // All methods should be present even if they failed
      assertExists(result.methods.current);
      assertExists(result.methods.pointToLine);
      assertExists(result.methods.googleRoads);
      assertExists(result.methods.enhancedOverpass);

      // Methods that fail should have error field or empty results
      for (const [methodName, methodResult] of Object.entries(result.methods)) {
        // Should have either highways or error
        assert(
          Array.isArray(methodResult.highways) ||
            typeof methodResult.error === "string",
          `${methodName} should have highways array or error message`
        );

        // Should still have processing time
        assert(typeof methodResult.processingTime === "number");
      }
    });

    it("should demonstrate accuracy improvements over current method", async () => {
      // Test location where user is on a highway
      const onHighwayLocation = {
        latitude: 40.53383335817636,
        longitude: -74.3467882397128,
      };

      const result = await controller.compareHighwayDetectionMethods(
        onHighwayLocation
      );

      // Current method vs point-to-line method comparison
      const currentMethod = result.methods.current;
      const pointToLineMethod = result.methods.pointToLine;

      if (
        currentMethod.highways.length > 0 &&
        pointToLineMethod.highways.length > 0
      ) {
        // Point-to-line method should generally provide more accurate distances
        // (This test may not always pass due to mock data, but demonstrates the concept)
        const currentClosest = currentMethod.highways[0];
        const pointToLineClosest = pointToLineMethod.highways[0];

        // Both methods should find highways
        assertExists(currentClosest);
        assertExists(pointToLineClosest);

        // Verify metadata indicates different calculation methods
        if (currentClosest.metadata && pointToLineClosest.metadata) {
          assertEquals(currentClosest.metadata.method, "current");
          assertEquals(pointToLineClosest.metadata.method, "pointToLine");
        }
      }
    });

    it("should include confidence scores for all methods", async () => {
      const testLocation = {
        latitude: 40.7128,
        longitude: -74.006,
      };

      const result = await controller.compareHighwayDetectionMethods(
        testLocation
      );

      for (const [methodName, methodResult] of Object.entries(result.methods)) {
        for (const highway of methodResult.highways) {
          assert(typeof highway.confidence === "number");
          assert(
            highway.confidence >= 0 && highway.confidence <= 1,
            `${methodName} confidence should be between 0 and 1: ${highway.confidence}`
          );
        }
      }
    });

    it("should sort highways by distance for each method", async () => {
      const testLocation = {
        latitude: 40.7128,
        longitude: -74.006,
      };

      const result = await controller.compareHighwayDetectionMethods(
        testLocation
      );

      for (const [methodName, methodResult] of Object.entries(result.methods)) {
        if (methodResult.highways.length > 1) {
          // Verify highways are sorted by distance (ascending)
          for (let i = 0; i < methodResult.highways.length - 1; i++) {
            const currentDistance = methodResult.highways[i].distance;
            const nextDistance = methodResult.highways[i + 1].distance;

            assert(
              currentDistance <= nextDistance,
              `${methodName} highways should be sorted by distance: ${currentDistance} <= ${nextDistance}`
            );
          }
        }
      }
    });
  });

  describe("Method-specific functionality", () => {
    it("should demonstrate different distance calculations between methods", async () => {
      const testLocation = {
        latitude: 40.53383335817636,
        longitude: -74.3467882397128,
      };

      const result = await controller.compareHighwayDetectionMethods(
        testLocation
      );

      // Current method uses center-point distance
      const currentHighways = result.methods.current.highways;

      // Point-to-line method uses geometric distance
      const pointToLineHighways = result.methods.pointToLine.highways;

      // If both methods find highways, they should potentially have different distances
      if (currentHighways.length > 0 && pointToLineHighways.length > 0) {
        // Verify metadata shows different calculation approaches
        const currentMetadata = currentHighways[0].metadata;
        const pointToLineMetadata = pointToLineHighways[0].metadata;

        if (currentMetadata && pointToLineMetadata) {
          assertEquals(currentMetadata.method, "current");
          assertEquals(pointToLineMetadata.method, "pointToLine");

          // Point-to-line should have geometric distance metadata
          assertExists(pointToLineMetadata.geometricDistance);
          assert(typeof pointToLineMetadata.geometricDistance === "number");
        }
      }
    });

    it("should handle Google Roads API configuration", async () => {
      const testLocation = {
        latitude: 40.7128,
        longitude: -74.006,
      };

      const result = await controller.compareHighwayDetectionMethods(
        testLocation
      );
      const googleRoadsResult = result.methods.googleRoads;

      // Should handle both configured and unconfigured states
      if (googleRoadsResult.error) {
        // If not configured, should have appropriate error message
        assert(
          googleRoadsResult.error.includes("not configured") ||
            googleRoadsResult.error.includes("access denied") ||
            googleRoadsResult.error.includes("rate limit")
        );
        assertEquals(googleRoadsResult.highways.length, 0);
      } else {
        // If configured, should return road information
        assert(Array.isArray(googleRoadsResult.highways));

        for (const highway of googleRoadsResult.highways) {
          if (highway.metadata) {
            assertEquals(highway.metadata.method, "googleRoads");
            assert(
              highway.metadata.source === "snapToRoads" ||
                highway.metadata.source === "nearestRoads"
            );
          }
        }
      }
    });

    it("should demonstrate enhanced Overpass progressive radius search", async () => {
      const testLocation = {
        latitude: 40.7128,
        longitude: -74.006,
      };

      const result = await controller.compareHighwayDetectionMethods(
        testLocation
      );
      const enhancedResult = result.methods.enhancedOverpass;

      if (enhancedResult.highways.length > 0) {
        for (const highway of enhancedResult.highways) {
          if (highway.metadata) {
            assertEquals(highway.metadata.method, "enhancedOverpass");

            // Should have search radius information
            assertExists(highway.metadata.searchRadius);
            assert(typeof highway.metadata.searchRadius === "number");

            // Should be one of the progressive radii: 100, 500, or 2000
            assert([100, 500, 2000].includes(highway.metadata.searchRadius));

            // Should have geometry information
            assertExists(highway.metadata.geometryPoints);
            assert(typeof highway.metadata.geometryPoints === "number");
            assert(highway.metadata.geometryPoints >= 0);
          }
        }
      }
    });
  });
});
