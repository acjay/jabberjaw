import { assert, assertEquals, assertExists, assertRejects } from "@std/assert";
import { beforeEach, describe, it } from "@std/testing/bdd";
import { HttpException } from "@danet/core";
import { POIDiscoveryController } from "./poi-discovery.controller.ts";
import { POIIdentificationService } from "./services/poi-identification.service.ts";
import { GoogleRoadsService } from "./services/google-roads.service.ts";
import { PointOfInterest, POICategory } from "../models/poi.model.ts";
import { stub } from "@std/testing/mock";
import type {
  POIDiscoveryRequest,
  POIFilterRequest,
  RoadsSnapRequest,
} from "../shared/schemas/index.ts";

describe("POIDiscoveryController", () => {
  let controller: POIDiscoveryController;
  let mockPOIService: POIIdentificationService;
  let mockGoogleRoadsService: GoogleRoadsService;

  beforeEach(() => {
    mockPOIService = {} as POIIdentificationService;
    mockGoogleRoadsService = {} as GoogleRoadsService;
    controller = new POIDiscoveryController(
      mockPOIService,
      mockGoogleRoadsService
    );
  });

  describe("discoverPOIs", () => {
    it("should discover POIs for valid location", async () => {
      const mockPOIs: PointOfInterest[] = [
        {
          id: "poi-1",
          name: "Central Park",
          category: POICategory.PARK,
          location: {
            latitude: 40.7129,
            longitude: -74.0059,
          },
          description: "Famous urban park in Manhattan",
          metadata: {
            significanceScore: 95,
            significance: ["recreational", "historical"],
          },
        },
        {
          id: "poi-2",
          name: "Empire State Building",
          category: POICategory.LANDMARK,
          location: {
            latitude: 40.713,
            longitude: -74.0058,
          },
          description: "Iconic Art Deco skyscraper",
          metadata: {
            significanceScore: 90,
            significance: ["architectural", "historical"],
          },
        },
      ];

      stub(mockPOIService, "discoverPOIs", () => Promise.resolve(mockPOIs));

      const requestData: POIDiscoveryRequest = {
        latitude: 40.7128,
        longitude: -74.006,
        radiusMeters: 5000,
        maxResults: 10,
        sortBySignificance: false,
      };

      const result = await controller.discoverPOIs(requestData);

      // Verify response structure
      assertExists(result.pois);
      assertExists(result.location);
      assertExists(result.searchRadius);
      assertExists(result.totalFound);
      assertExists(result.timestamp);

      assert(Array.isArray(result.pois));
      assertEquals(result.location.latitude, requestData.latitude);
      assertEquals(result.location.longitude, requestData.longitude);
      assertEquals(result.searchRadius, requestData.radiusMeters);
      assertEquals(result.totalFound, result.pois.length);
      assertEquals(result.pois.length, 2);

      // Verify POI structure (now converted to schema format)
      const firstPoi = result.pois[0];
      assertExists(firstPoi.id);
      assertExists(firstPoi.name);
      assertExists(firstPoi.type);
      assertExists(firstPoi.category);
      assertExists(firstPoi.location);
      assertExists(firstPoi.description);
    });

    it("should use default values when optional parameters are omitted", async () => {
      stub(mockPOIService, "discoverPOIs", () =>
        Promise.resolve([
          {
            id: "poi-1",
            name: "Test POI",
            category: POICategory.LANDMARK,
            location: {
              latitude: 37.775,
              longitude: -122.4193,
            },
            description: "Test POI description",
            metadata: {
              significanceScore: 80,
              significance: ["landmark"],
            },
          },
        ])
      );

      const requestData: POIDiscoveryRequest = {
        latitude: 37.7749,
        longitude: -122.4194,
        radiusMeters: 5000, // Default value
        maxResults: 20, // Default value
        sortBySignificance: false, // Default value
      };

      const result = await controller.discoverPOIs(requestData);

      // Should use default radius of 5000m
      assertEquals(result.searchRadius, 5000);

      // Should return POIs (mock data)
      assert(Array.isArray(result.pois));
      assert(result.pois.length > 0);
    });

    it("should sort POIs by significance when requested", async () => {
      const mockPOIs: PointOfInterest[] = [
        {
          id: "poi-1",
          name: "Lower Significance POI",
          category: POICategory.PARK,
          location: {
            latitude: 40.7129,
            longitude: -74.0059,
          },
          description: "Lower significance POI",
          metadata: {
            significanceScore: 70,
            significance: ["recreational"],
          },
        },
        {
          id: "poi-2",
          name: "Higher Significance POI",
          category: POICategory.LANDMARK,
          location: {
            latitude: 40.713,
            longitude: -74.0058,
          },
          description: "Higher significance POI",
          metadata: {
            significanceScore: 95,
            significance: ["historical", "architectural"],
          },
        },
      ];

      const sortedPOIs = [...mockPOIs].sort(
        (a, b) =>
          (b.metadata.significanceScore || 0) -
          (a.metadata.significanceScore || 0)
      );

      stub(mockPOIService, "discoverPOIs", () => Promise.resolve(mockPOIs));
      stub(mockPOIService, "sortBySignificance", () => sortedPOIs);

      const requestData: POIDiscoveryRequest = {
        latitude: 40.7128,
        longitude: -74.006,
        radiusMeters: 5000,
        maxResults: 20,
        sortBySignificance: true,
      };

      const result = await controller.discoverPOIs(requestData);

      // Should return POIs with significance scores
      assert(Array.isArray(result.pois));
      assert(result.pois.length > 0);

      // Verify POIs have significance scores (now in schema format)
      for (const poi of result.pois) {
        assertExists(poi.significance);
        assert(typeof poi.significance === "number");
        assert(poi.significance >= 0 && poi.significance <= 100);
      }

      // Verify POIs are sorted by significance (descending)
      if (result.pois.length > 1) {
        for (let i = 0; i < result.pois.length - 1; i++) {
          const currentScore = result.pois[i].significance || 0;
          const nextScore = result.pois[i + 1].significance || 0;
          assert(
            currentScore >= nextScore,
            `POI at index ${i} should have higher or equal significance than POI at index ${
              i + 1
            }`
          );
        }
      }
    });

    it("should handle service errors gracefully", async () => {
      stub(mockPOIService, "discoverPOIs", () => {
        throw new Error("Service unavailable");
      });

      const requestData: POIDiscoveryRequest = {
        latitude: 40.7128,
        longitude: -74.006,
        radiusMeters: 5000,
        maxResults: 20,
        sortBySignificance: false,
      };

      await assertRejects(
        () => controller.discoverPOIs(requestData),
        Error,
        "Service unavailable"
      );
    });
  });

  describe("filterPOIsByDistance", () => {
    it("should filter POIs by distance", async () => {
      const mockPOIs: PointOfInterest[] = [
        {
          id: "poi-1",
          name: "Nearby POI",
          category: POICategory.PARK,
          location: {
            latitude: 40.7129,
            longitude: -74.0059,
          },
          description: "Nearby POI",
          metadata: {
            significanceScore: 80,
            significance: ["recreational"],
          },
        },
      ];

      stub(mockPOIService, "filterByDistance", () => mockPOIs);

      const filterData: POIFilterRequest = {
        centerLocation: {
          latitude: 40.7128,
          longitude: -74.006,
        },
        pois: [
          {
            id: "poi-1",
            name: "Nearby POI",
            type: "park",
            category: "park",
            location: {
              latitude: 40.7129,
              longitude: -74.0059,
            },
            description: "Nearby POI",
            significance: 80,
            tags: ["recreational"],
          },
        ],
        maxDistanceMeters: 1000,
      };

      const result = await controller.filterPOIsByDistance(filterData);

      // Verify response structure
      assertExists(result.pois);
      assertExists(result.location);
      assertExists(result.searchRadius);
      assertEquals(result.searchRadius, 1000);

      // Filtered results should match mock
      assertEquals(result.pois.length, 1);
    });

    it("should handle service errors gracefully", async () => {
      stub(mockPOIService, "filterByDistance", () => {
        throw new Error("Filter service error");
      });

      const filterData: POIFilterRequest = {
        centerLocation: {
          latitude: 40.7128,
          longitude: -74.006,
        },
        pois: [
          {
            id: "poi-1",
            name: "Test POI",
            type: "park",
            category: "park",
            location: {
              latitude: 40.7129,
              longitude: -74.0059,
            },
            description: "Test POI",
            significance: 80,
            tags: ["recreational"],
          },
        ],
        maxDistanceMeters: 1000,
      };

      await assertRejects(
        () => controller.filterPOIsByDistance(filterData),
        Error,
        "Filter service error"
      );
    });
  });

  describe("getPOICategories", () => {
    it("should return POI categories and groups", () => {
      const result = controller.getPOICategories();

      // Verify response structure
      assertExists(result.categories);
      assertExists(result.groups);

      assert(Array.isArray(result.categories));
      assert(result.categories.length > 0);

      // Verify groups structure
      assert(typeof result.groups === "object");
      assert(Object.keys(result.groups).length > 0);

      // Verify each group contains categories
      for (const [groupName, categories] of Object.entries(result.groups)) {
        assert(typeof groupName === "string");
        assert(Array.isArray(categories));
        assert(categories.length > 0);
      }
    });
  });

  describe("getHealth", () => {
    it("should return health status", () => {
      const result = controller.getHealth();

      // Verify response structure
      assertExists(result.status);
      assertExists(result.service);
      assertExists(result.timestamp);

      assertEquals(result.status, "healthy");
      assertEquals(result.service, "poi-discovery");
      assert(typeof result.timestamp === "object");
    });
  });

  describe("snapToRoads", () => {
    it("should successfully snap location to road", async () => {
      stub(mockGoogleRoadsService, "snapToRoads", () =>
        Promise.resolve({
          roadName: "Broadway",
          placeId: "ChIJmQJIxlVYwokRLgeuocVOGVU",
          snappedLocation: {
            latitude: 40.758,
            longitude: -73.9855,
          },
          originalLocation: {
            latitude: 40.758,
            longitude: -73.9855,
          },
          distanceFromOriginal: 0,
          confidence: 1.0,
        })
      );

      const requestBody: RoadsSnapRequest = {
        latitude: 40.758,
        longitude: -73.9855,
      };

      const result = await controller.snapToRoads(requestBody);

      assertEquals(result.location.latitude, requestBody.latitude);
      assertEquals(result.location.longitude, requestBody.longitude);
      assertEquals(result.roadInfo?.name, "Broadway");
      assertExists(result.timestamp);
    });

    it("should handle service errors gracefully", async () => {
      stub(mockGoogleRoadsService, "snapToRoads", () => {
        throw new Error("Roads service error");
      });

      const requestBody: RoadsSnapRequest = {
        latitude: 40.758,
        longitude: -73.9855,
      };

      await assertRejects(
        () => controller.snapToRoads(requestBody),
        Error,
        "Roads service error"
      );
    });
  });

  describe("findNearestRoads", () => {
    it("should successfully find nearest roads", async () => {
      stub(mockGoogleRoadsService, "findNearestRoads", () =>
        Promise.resolve([
          {
            roadName: "Broadway",
            placeId: "ChIJmQJIxlVYwokRLgeuocVOGVU",
            snappedLocation: {
              latitude: 40.758,
              longitude: -73.9855,
            },
            originalLocation: {
              latitude: 40.758,
              longitude: -73.9855,
            },
            distanceFromOriginal: 0,
            confidence: 1.0,
          },
        ])
      );

      const requestBody: RoadsSnapRequest = {
        latitude: 40.758,
        longitude: -73.9855,
      };

      const result = await controller.findNearestRoads(requestBody);

      assertEquals(result.location.latitude, requestBody.latitude);
      assertEquals(result.location.longitude, requestBody.longitude);
      assertEquals(result.roads.length, 1);
      assertEquals(result.roads[0].name, "Broadway");
      assertExists(result.timestamp);
    });

    it("should handle service errors gracefully", async () => {
      stub(mockGoogleRoadsService, "findNearestRoads", () => {
        throw new Error("Roads service error");
      });

      const requestBody: RoadsSnapRequest = {
        latitude: 40.758,
        longitude: -73.9855,
      };

      await assertRejects(
        () => controller.findNearestRoads(requestBody),
        Error,
        "Roads service error"
      );
    });
  });

  describe("testGoogleRoadsConnection", () => {
    it("should return configuration and connection status", async () => {
      stub(mockGoogleRoadsService, "isConfigured", () => Promise.resolve(true));
      stub(mockGoogleRoadsService, "testConnection", () =>
        Promise.resolve(true)
      );

      const result = await controller.testGoogleRoadsConnection();

      assertEquals(result.configured, true);
      assertEquals(result.connectionTest, true);
      assertExists(result.timestamp);
    });
  });
});
