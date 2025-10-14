import { assert, assertEquals, assertExists } from "@std/assert";
import { beforeEach, describe, it } from "@std/testing/bdd";
import { stub } from "@std/testing/mock";
import { POIIdentificationService } from "./poi-identification.service.ts";
import { LocationData } from "../../models/location.model.ts";
import { POICategory } from "../../models/poi.model.ts";
import { OverpassClient } from "../../shared/clients/overpass-client.ts";
import { GoogleMapsClient } from "../../shared/clients/google-maps-client.ts";
import { NominatimClient } from "../../shared/clients/nominatim-client.ts";
import { ConfigurationService } from "../../shared/configuration/index.ts";

describe("POIIdentificationService", () => {
  let service: POIIdentificationService;
  let mockLocation: LocationData;
  let mockOverpassClient: OverpassClient;
  let mockGoogleMapsClient: GoogleMapsClient;
  let mockNominatimClient: NominatimClient;

  beforeEach(() => {
    // Create mock clients
    mockOverpassClient = new OverpassClient();
    mockGoogleMapsClient = new GoogleMapsClient();
    mockNominatimClient = new NominatimClient();

    // Stub the client methods with mock responses
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
              { lat: 37.7749, lon: -122.4194 },
              { lat: 37.775, lon: -122.4195 },
            ],
          },
        ],
      })
    );

    stub(mockGoogleMapsClient, "placesNearbySearch", () =>
      Promise.resolve({
        results: [
          {
            place_id: "test_place_id",
            name: "Test POI",
            types: ["tourist_attraction"],
            geometry: {
              location: {
                lat: 37.7749,
                lng: -122.4194,
              },
            },
            vicinity: "San Francisco, CA",
          },
        ],
      })
    );

    stub(mockNominatimClient, "reverse", () =>
      Promise.resolve({
        address: {
          city: "San Francisco",
          county: "San Francisco County",
          state: "California",
          country: "United States",
        },
      })
    );

    const configService = new ConfigurationService();
    configService.setForTesting("GOOGLE_PLACES_API_KEY", "test-api-key");

    service = new POIIdentificationService(
      mockOverpassClient,
      mockGoogleMapsClient,
      mockNominatimClient,
      configService
    );

    mockLocation = {
      latitude: 40.7128,
      longitude: -74.006,
      timestamp: new Date(),
      accuracy: 10,
    };
  });

  describe("discoverPOIs", () => {
    it("should return POIs using mock clients", async () => {
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

    it("should handle different POI categories", async () => {
      // Test that the service can handle different types of POIs
      const pois = await service.discoverPOIs(mockLocation, {
        radiusMeters: 1000,
        maxResults: 10,
      });

      assertExists(pois);
      assert(Array.isArray(pois));
      // The mock will return at least one POI
      if (pois.length > 0) {
        const firstPoi = pois[0];
        assertExists(firstPoi.id);
        assertExists(firstPoi.name);
        assertExists(firstPoi.category);
        assertExists(firstPoi.location);
      }
    });

    it("should handle empty results gracefully", async () => {
      // Override the stub to return empty results
      mockOverpassClient.query.restore?.();
      stub(mockOverpassClient, "query", () =>
        Promise.resolve({
          elements: [],
        })
      );

      const pois = await service.discoverPOIs(mockLocation);

      assertExists(pois);
      assert(Array.isArray(pois));
      // Should handle empty results without throwing
    });
  });
});
