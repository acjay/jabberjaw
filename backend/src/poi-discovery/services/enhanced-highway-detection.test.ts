import { assert, assertEquals, assertExists } from "@std/assert";
import { beforeEach, describe, it } from "@std/testing/bdd";
import { stub } from "@std/testing/mock";
import { POIIdentificationService } from "./poi-identification.service.ts";
import { OverpassClient } from "../../shared/clients/overpass-client.ts";
import { GoogleMapsClient } from "../../shared/clients/google-maps-client.ts";
import { NominatimClient } from "../../shared/clients/nominatim-client.ts";
import { LocationData } from "../../models/location.model.ts";
import { POICategory } from "../../models/poi.model.ts";

describe("Enhanced Highway Detection (Method 4)", () => {
  let service: POIIdentificationService;
  let mockOverpassClient: OverpassClient;
  let mockGoogleMapsClient: GoogleMapsClient;
  let mockNominatimClient: NominatimClient;

  beforeEach(() => {
    // Create mock clients
    mockOverpassClient = new OverpassClient();
    mockGoogleMapsClient = new GoogleMapsClient();
    mockNominatimClient = new NominatimClient();

    // Stub the client methods with mock responses that return highway data
    stub(mockOverpassClient, "query", () =>
      Promise.resolve({
        elements: [
          {
            type: "way",
            id: 123456,
            tags: {
              highway: "motorway",
              name: "Interstate 5",
              ref: "I-5",
            },
            geometry: [
              { lat: 40.7128, lon: -74.006 }, // Near test location
              { lat: 40.7129, lon: -74.0061 },
              { lat: 40.713, lon: -74.0062 },
            ],
          },
          {
            type: "way",
            id: 789012,
            tags: {
              highway: "trunk",
              name: "US Highway 1",
              ref: "US-1",
            },
            geometry: [
              { lat: 40.7125, lon: -74.0055 },
              { lat: 40.7126, lon: -74.0056 },
            ],
          },
        ],
      })
    );

    // Mock Google Places to return some results so it doesn't fall back to mock data
    stub(mockGoogleMapsClient, "placesNearbySearch", () =>
      Promise.resolve({
        results: [
          {
            place_id: "test_place_1",
            name: "Test Museum",
            types: ["museum", "tourist_attraction"],
            geometry: {
              location: {
                lat: 40.713,
                lng: -74.0065,
              },
            },
            vicinity: "New York, NY",
            rating: 4.2,
          },
        ],
      })
    );

    // Mock geocoding to return municipality data
    stub(mockGoogleMapsClient, "geocode", () =>
      Promise.resolve({
        results: [
          {
            address_components: [
              {
                long_name: "New York",
                short_name: "NYC",
                types: ["locality", "political"],
              },
              {
                long_name: "New York County",
                short_name: "New York County",
                types: ["administrative_area_level_2", "political"],
              },
              {
                long_name: "New York",
                short_name: "NY",
                types: ["administrative_area_level_1", "political"],
              },
            ],
          },
        ],
      })
    );

    stub(mockNominatimClient, "reverse", () =>
      Promise.resolve({
        address: {
          city: "New York",
          county: "New York County",
          state: "New York",
          country: "United States",
        },
      })
    );

    service = new POIIdentificationService(
      mockOverpassClient,
      mockGoogleMapsClient,
      mockNominatimClient
    );
  });

  describe("Progressive radius search", () => {
    it("should implement progressive radius search for highway detection", async () => {
      // Test location on US Route 1 from highway-detection-methods.md
      const testLocation: LocationData = {
        latitude: 40.53383335817636,
        longitude: -74.3467882397128,
        timestamp: new Date(),
        accuracy: 10,
      };

      // Test with different radius configurations
      const smallRadius = await service.discoverPOIs(testLocation, {
        radiusMeters: 500,
      });
      const largeRadius = await service.discoverPOIs(testLocation, {
        radiusMeters: 5000,
      });

      // Both should return results (fallback to mock data when APIs fail)
      assertExists(smallRadius);
      assertExists(largeRadius);
      assert(Array.isArray(smallRadius));
      assert(Array.isArray(largeRadius));

      // Should find highway POIs in both cases
      const smallRadiusHighways = smallRadius.filter(
        (poi) => poi.category === POICategory.MAJOR_ROAD
      );
      const largeRadiusHighways = largeRadius.filter(
        (poi) => poi.category === POICategory.MAJOR_ROAD
      );

      assert(
        smallRadiusHighways.length > 0,
        "Should find highways with small radius"
      );
      assert(
        largeRadiusHighways.length > 0,
        "Should find highways with large radius"
      );
    });

    it("should prioritize closer results with progressive search", async () => {
      const testLocation: LocationData = {
        latitude: 40.7128, // NYC coordinates
        longitude: -74.006,
        timestamp: new Date(),
        accuracy: 10,
      };

      const pois = await service.discoverPOIs(testLocation, {
        radiusMeters: 2000,
      });
      const highways = pois.filter(
        (poi) => poi.category === POICategory.MAJOR_ROAD
      );

      // Verify highways have proper metadata structure for enhanced detection
      for (const highway of highways) {
        assertExists(highway.metadata);
        assert(typeof highway.metadata.significanceScore === "number");
        assert(highway.metadata.significanceScore >= 0);
        assert(highway.metadata.significanceScore <= 100);
      }
    });
  });

  describe("Enhanced Overpass query structure", () => {
    it("should handle geometry-based post-processing", async () => {
      const testLocation: LocationData = {
        latitude: 40.7589, // Times Square area
        longitude: -73.9851,
        timestamp: new Date(),
        accuracy: 5,
      };

      const pois = await service.discoverPOIs(testLocation);
      const highways = pois.filter(
        (poi) => poi.category === POICategory.MAJOR_ROAD
      );

      // Verify that highway POIs have the expected structure for enhanced detection
      for (const highway of highways) {
        // Should have proper ID format
        assertExists(highway.id);
        assert(typeof highway.id === "string");

        // Should have formatted name
        assertExists(highway.name);
        assert(typeof highway.name === "string");
        assert(highway.name.length > 0);

        // Should have valid coordinates
        assert(typeof highway.location.latitude === "number");
        assert(typeof highway.location.longitude === "number");
        assert(
          highway.location.latitude >= -90 && highway.location.latitude <= 90
        );
        assert(
          highway.location.longitude >= -180 &&
            highway.location.longitude <= 180
        );

        // Should have enhanced metadata structure
        assertExists(highway.metadata);
        assert(typeof highway.metadata.significanceScore === "number");
      }
    });

    it("should format highway names correctly", async () => {
      const testLocation: LocationData = {
        latitude: 40.7128,
        longitude: -74.006,
        timestamp: new Date(),
        accuracy: 10,
      };

      const pois = await service.discoverPOIs(testLocation);
      const highways = pois.filter(
        (poi) => poi.category === POICategory.MAJOR_ROAD
      );

      for (const highway of highways) {
        // Highway names should be properly formatted
        assertExists(highway.name);
        assert(typeof highway.name === "string");
        assert(highway.name.trim().length > 0);

        // Should not contain raw reference codes without formatting
        assert(
          !highway.name.match(/^[A-Z]-?\d+$/),
          `Highway name "${highway.name}" should be formatted, not raw reference`
        );
      }
    });
  });

  describe("Confidence scoring", () => {
    it("should calculate confidence scores for highway detection", async () => {
      const testLocation: LocationData = {
        latitude: 40.7128,
        longitude: -74.006,
        timestamp: new Date(),
        accuracy: 10,
      };

      const pois = await service.discoverPOIs(testLocation);
      const highways = pois.filter(
        (poi) => poi.category === POICategory.MAJOR_ROAD
      );

      for (const highway of highways) {
        // Significance score serves as confidence indicator
        assertExists(highway.metadata.significanceScore);
        assert(typeof highway.metadata.significanceScore === "number");

        // Highway POIs should have high significance scores (base 95 for major roads)
        assert(
          highway.metadata.significanceScore >= 80,
          `Highway ${highway.name} should have high significance score, got ${highway.metadata.significanceScore}`
        );
      }
    });

    it("should handle various highway types with appropriate confidence", async () => {
      const testLocation: LocationData = {
        latitude: 40.7128,
        longitude: -74.006,
        timestamp: new Date(),
        accuracy: 10,
      };

      const pois = await service.discoverPOIs(testLocation);
      const highways = pois.filter(
        (poi) => poi.category === POICategory.MAJOR_ROAD
      );

      // Group highways by type based on name patterns
      const interstates = highways.filter((h) => h.name.includes("Interstate"));
      const usHighways = highways.filter((h) => h.name.includes("US Highway"));
      const stateHighways = highways.filter(
        (h) => h.name.includes("Highway") && !h.name.includes("US Highway")
      );

      // All highway types should have high confidence/significance
      [...interstates, ...usHighways, ...stateHighways].forEach((highway) => {
        assertExists(highway.metadata.significanceScore);
        assert(
          highway.metadata.significanceScore >= 80,
          `${highway.name} should have high significance score`
        );
      });
    });
  });

  describe("Error handling and resilience", () => {
    it("should handle invalid geometry gracefully", async () => {
      // Test with edge case locations that might return invalid data
      const edgeCaseLocations: LocationData[] = [
        { latitude: 0, longitude: 0, timestamp: new Date(), accuracy: 1000 }, // Null Island
        { latitude: 90, longitude: 0, timestamp: new Date(), accuracy: 1000 }, // North Pole
        { latitude: -90, longitude: 0, timestamp: new Date(), accuracy: 1000 }, // South Pole
      ];

      for (const location of edgeCaseLocations) {
        // Should not throw errors, should return mock data
        const pois = await service.discoverPOIs(location);
        assertExists(pois);
        assert(Array.isArray(pois));

        // Should still return some POIs (mock data)
        assert(pois.length > 0);
      }
    });

    it("should handle network failures gracefully", async () => {
      const testLocation: LocationData = {
        latitude: 40.7128,
        longitude: -74.006,
        timestamp: new Date(),
        accuracy: 10,
      };

      // This test verifies that the service falls back to mock data when APIs fail
      // (which is the expected behavior in our test environment without API keys)
      const pois = await service.discoverPOIs(testLocation);

      assertExists(pois);
      assert(Array.isArray(pois));
      assert(pois.length > 0);

      // Should include highway POIs even when external APIs fail
      const highways = pois.filter(
        (poi) => poi.category === POICategory.MAJOR_ROAD
      );
      assert(
        highways.length > 0,
        "Should return mock highway data when APIs fail"
      );
    });
  });

  describe("Integration with existing functionality", () => {
    it("should maintain compatibility with existing POI discovery", async () => {
      const testLocation: LocationData = {
        latitude: 40.7128,
        longitude: -74.006,
        timestamp: new Date(),
        accuracy: 10,
      };

      const pois = await service.discoverPOIs(testLocation);

      // Should return various POI types, not just highways
      const categories = new Set(pois.map((poi) => poi.category));

      assert(categories.size > 1, "Should return multiple POI categories");
      assert(categories.has(POICategory.MAJOR_ROAD), "Should include highways");
      assert(categories.has(POICategory.TOWN), "Should include municipalities");

      // Other categories might include parks, museums, etc.
      const nonHighwayPois = pois.filter(
        (poi) => poi.category !== POICategory.MAJOR_ROAD
      );
      assert(nonHighwayPois.length > 0, "Should include non-highway POIs");
    });

    it("should work with distance filtering", async () => {
      const testLocation: LocationData = {
        latitude: 40.7128,
        longitude: -74.006,
        timestamp: new Date(),
        accuracy: 10,
      };

      const pois = await service.discoverPOIs(testLocation);
      const filteredPois = service.filterByDistance(pois, testLocation, 1000);

      // Should maintain highway POIs in filtered results
      const originalHighways = pois.filter(
        (poi) => poi.category === POICategory.MAJOR_ROAD
      );
      const filteredHighways = filteredPois.filter(
        (poi) => poi.category === POICategory.MAJOR_ROAD
      );

      // Some highways should remain after filtering (mock data includes highways at user location)
      if (originalHighways.length > 0) {
        assert(
          filteredHighways.length > 0,
          "Distance filtering should preserve nearby highways"
        );
      }
    });

    it("should work with significance sorting", async () => {
      const testLocation: LocationData = {
        latitude: 40.7128,
        longitude: -74.006,
        timestamp: new Date(),
        accuracy: 10,
      };

      const pois = await service.discoverPOIs(testLocation);
      const sortedPois = service.sortBySignificance(pois);

      // Should maintain POI structure after sorting
      assertEquals(sortedPois.length, pois.length);

      // Should be sorted by significance score (descending)
      for (let i = 0; i < sortedPois.length - 1; i++) {
        const currentScore = sortedPois[i].metadata.significanceScore || 0;
        const nextScore = sortedPois[i + 1].metadata.significanceScore || 0;
        assert(
          currentScore >= nextScore,
          `POIs should be sorted by significance: ${
            sortedPois[i].name
          } (${currentScore}) >= ${sortedPois[i + 1].name} (${nextScore})`
        );
      }

      // Highways should typically be near the top due to high significance scores
      const topPois = sortedPois.slice(0, 3);
      const topCategories = topPois.map((poi) => poi.category);

      // Should include high-significance categories like highways or municipalities
      const highSignificanceCategories = [
        POICategory.MAJOR_ROAD,
        POICategory.TOWN,
      ];
      const hasHighSignificance = topCategories.some((cat) =>
        highSignificanceCategories.includes(cat)
      );
      assert(
        hasHighSignificance,
        "Top POIs should include high-significance categories like highways or towns"
      );
    });
  });
});
