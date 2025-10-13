import { MockHttpClient } from "./mock-http-client.ts";
import { HttpClient } from "./http-client.interface.ts";
import { OverpassClient } from "./clients/overpass-client.ts";
import { GoogleMapsClient } from "./clients/google-maps-client.ts";
import { NominatimClient } from "./clients/nominatim-client.ts";
import { OpenAIClient } from "./clients/openai-client.ts";

/**
 * Test utilities for creating mock HTTP clients and API clients
 */
export class TestUtils {
  /**
   * Create a mock HTTP client with common test responses
   */
  static createMockHttpClient(): MockHttpClient {
    const mockClient = new MockHttpClient();

    // Set up common mock responses
    TestUtils.setupCommonMockResponses(mockClient);

    return mockClient;
  }

  /**
   * Create mock API clients for testing
   */
  static createMockApiClients(mockHttpClient?: MockHttpClient) {
    const httpClient = mockHttpClient || TestUtils.createMockHttpClient();

    return {
      httpClient,
      overpassClient: new OverpassClient(httpClient),
      googleMapsClient: new GoogleMapsClient(httpClient),
      nominatimClient: new NominatimClient(httpClient),
      openaiClient: new OpenAIClient(httpClient),
    };
  }

  /**
   * Set up common mock responses for external APIs
   */
  private static setupCommonMockResponses(mockClient: MockHttpClient) {
    // Mock Overpass API responses
    mockClient.setMockJsonResponse("https://overpass-api.de/api/interpreter", {
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
    });

    // Mock Google Places API responses
    mockClient.setMockJsonResponse(
      "https://maps.googleapis.com/maps/api/place/nearbysearch/json*",
      {
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
      }
    );

    // Mock Google Geocoding API responses
    mockClient.setMockJsonResponse(
      "https://maps.googleapis.com/maps/api/geocode/json*",
      {
        results: [
          {
            address_components: [
              {
                long_name: "San Francisco",
                short_name: "SF",
                types: ["locality"],
              },
              {
                long_name: "San Francisco County",
                short_name: "SF County",
                types: ["administrative_area_level_2"],
              },
              {
                long_name: "California",
                short_name: "CA",
                types: ["administrative_area_level_1"],
              },
            ],
          },
        ],
      }
    );

    // Mock Google Roads API responses
    mockClient.setMockJsonResponse(
      "https://roads.googleapis.com/v1/snapToRoads*",
      {
        snappedPoints: [
          {
            location: {
              latitude: 37.7749,
              longitude: -122.4194,
            },
            placeId: "test_road_place_id",
          },
        ],
      }
    );

    mockClient.setMockJsonResponse(
      "https://roads.googleapis.com/v1/nearestRoads*",
      {
        snappedPoints: [
          {
            location: {
              latitude: 37.7749,
              longitude: -122.4194,
            },
            placeId: "test_road_place_id",
          },
        ],
      }
    );

    // Mock Google Place Details API responses
    mockClient.setMockJsonResponse(
      "https://maps.googleapis.com/maps/api/place/details/json*",
      {
        result: {
          name: "Test Road",
          formatted_address: "Test Road, San Francisco, CA",
          types: ["route"],
        },
      }
    );

    // Mock Nominatim API responses
    mockClient.setMockJsonResponse(
      "https://nominatim.openstreetmap.org/reverse*",
      {
        address: {
          city: "San Francisco",
          county: "San Francisco County",
          state: "California",
          country: "United States",
        },
      }
    );

    // Mock OpenAI API responses
    mockClient.setMockJsonResponse(
      "https://api.openai.com/v1/chat/completions",
      {
        choices: [
          {
            message: {
              content:
                "This is a mock response from OpenAI for testing purposes. It provides engaging travel content about the requested location with historical context, cultural significance, and interesting facts that would be perfect for road trip travelers. The content is designed to be informative yet entertaining, suitable for a 3-minute podcast-style narration.",
            },
            finish_reason: "stop",
          },
        ],
        usage: {
          prompt_tokens: 150,
          completion_tokens: 200,
          total_tokens: 350,
        },
      }
    );
  }

  /**
   * Create a test environment variable setup
   */
  static setupTestEnvironment() {
    // Set test API keys if not already set
    if (!Deno.env.get("GOOGLE_PLACES_API_KEY")) {
      Deno.env.set("GOOGLE_PLACES_API_KEY", "test_google_key");
    }
    if (!Deno.env.get("OPENAI_API_KEY")) {
      Deno.env.set("OPENAI_API_KEY", "test_openai_key");
    }
  }

  /**
   * Clean up test environment
   */
  static cleanupTestEnvironment() {
    // Remove test environment variables if they were test values
    if (Deno.env.get("GOOGLE_PLACES_API_KEY") === "test_google_key") {
      Deno.env.delete("GOOGLE_PLACES_API_KEY");
    }
    if (Deno.env.get("OPENAI_API_KEY") === "test_openai_key") {
      Deno.env.delete("OPENAI_API_KEY");
    }
  }

  /**
   * Create a complete mock environment for testing
   */
  static createMockEnvironment() {
    TestUtils.setupTestEnvironment();
    const mockHttpClient = TestUtils.createMockHttpClient();
    const mockClients = TestUtils.createMockApiClients(mockHttpClient);

    return {
      mockHttpClient: mockClients,
      cleanup: () => TestUtils.cleanupTestEnvironment(),
    };
  }
}
