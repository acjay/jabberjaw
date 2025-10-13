import { assert, assertEquals, assertExists } from "@std/assert";
import { beforeEach, describe, it } from "@std/testing/bdd";
import { POIIdentificationService } from "./poi-identification.service.ts";
import { LocationData } from "../../models/location.model.ts";
import { POICategory } from "../../models/poi.model.ts";
import { TestUtils } from "../../shared/index.ts";

describe("POIIdentificationService", () => {
  let service: POIIdentificationService;
  let mockLocation: LocationData;
  let mockClients: ReturnType<typeof TestUtils.createMockApiClients>;

  beforeEach(() => {
    TestUtils.setupTestEnvironment();
    mockClients = TestUtils.createMockApiClients();
    service = new POIIdentificationService(
      mockClients.overpassClient,
      mockClients.googleMapsClient,
      mockClients.nominatimClient
    );
    mockLocation = {
      latitude: 40.7128,
      longitude: -74.006,
      timestamp: new Date(),
      accuracy: 10,
    };
  });

  describe("discoverPOIs", () => {
    it("should return POIs using mock HTTP client", async () => {
      // The service will use mock responses from TestUtils.setupCommonMockResponses
      const pois = await service.discoverPOIs(mockLocation);

      assertExists(pois);
      assert(Array.isArray(pois));
      assert(pois.length > 0);

      // Verify POI structure
      const firstPoi = pois[0];
      assertExists(firstPoi.id);
      assertExists(firstPoi.name);
      assertExists(firstPoi.category);
      assertExists(firstPoi.location);
      assertExists(firstPoi.description);
      assertExists(firstPoi.metadata);
    });

    it("should handle custom mock responses", async () => {
      // Set up custom mock response for this test
      mockClients.httpClient.setMockJsonResponse(
        "https://overpass-api.de/api/interpreter",
        {
          elements: [
            {
              type: "way",
              id: 999999,
              tags: {
                highway: "motorway",
                name: "Test Highway",
                ref: "I-999",
              },
              geometry: [
                { lat: mockLocation.latitude, lon: mockLocation.longitude },
                {
                  lat: mockLocation.latitude + 0.001,
                  lon: mockLocation.longitude + 0.001,
                },
              ],
            },
          ],
        }
      );

      const pois = await service.discoverPOIs(mockLocation);

      assertExists(pois);
      assert(pois.length > 0);

      // Find the highway POI we mocked
      const highwayPoi = pois.find((poi) => poi.name.includes("Test Highway"));
      assertExists(highwayPoi);
      assertEquals(highwayPoi.category, POICategory.MAJOR_ROAD);
    });

    it("should handle API errors gracefully", async () => {
      // Set up error responses
      mockClients.httpClient.setMockErrorResponse(
        "https://overpass-api.de/api/interpreter",
        500
      );
      mockClients.httpClient.setMockErrorResponse(
        "https://maps.googleapis.com/maps/api/geocode/json*",
        403
      );

      // Should still return results (fallback to mock data)
      const pois = await service.discoverPOIs(mockLocation);

      assertExists(pois);
      assert(Array.isArray(pois));
      // Should have fallback mock POIs
      assert(pois.length > 0);
    });
  });

  describe("HTTP client integration", () => {
    it("should log all HTTP requests made during POI discovery", async () => {
      await service.discoverPOIs(mockLocation);

      const requestLog = mockClients.httpClient.getRequestLog();
      assert(requestLog.length > 0);

      // Should have made requests to external APIs
      const overpassRequests = requestLog.filter((req) =>
        req.url.includes("overpass-api.de")
      );
      const googleRequests = requestLog.filter((req) =>
        req.url.includes("googleapis.com")
      );

      assert(
        overpassRequests.length > 0,
        "Should have made Overpass API requests"
      );
      // Google requests might be 0 if API key is not set, which is fine for tests
    });
  });
});
