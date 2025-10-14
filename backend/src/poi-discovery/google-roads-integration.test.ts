import { assertEquals } from "@std/assert";
import { describe, it, beforeAll, afterAll } from "@std/testing/bdd";
import { DanetApplication } from "@danet/core";
import { load } from "@std/dotenv";
import { POIDiscoveryModule } from "./poi-discovery.module.ts";

// Load environment variables for testing with error handling
try {
  await load({ export: true });
  console.log("Environment variables loaded successfully");
} catch (error) {
  console.warn("Failed to load .env file:", error);
}

// Ensure API keys are available before running tests
const ensureApiKeysLoaded = () => {
  const googleRoadsKey = Deno.env.get("GOOGLE_ROADS_API_KEY");
  const googlePlacesKey = Deno.env.get("GOOGLE_PLACES_API_KEY");

  console.log("=== API KEY STATUS CHECK ===");
  console.log("GOOGLE_ROADS_API_KEY:", googleRoadsKey ? "present" : "missing");
  console.log(
    "GOOGLE_PLACES_API_KEY:",
    googlePlacesKey ? "present" : "missing"
  );

  if (!googleRoadsKey && !googlePlacesKey) {
    console.warn("No Google API keys found - tests may fail");
  }
};

describe("Google Roads API Integration", () => {
  let app: DanetApplication;
  let baseUrl: string;

  beforeAll(async () => {
    // Ensure environment variables are loaded before initializing the app
    ensureApiKeysLoaded();

    // Add a small delay to ensure environment variables are fully loaded
    await new Promise((resolve) => setTimeout(resolve, 100));

    app = new DanetApplication();
    await app.init(POIDiscoveryModule);

    const server = await app.listen(0);
    baseUrl = `http://localhost:${server.port}`;

    console.log("Test server started at:", baseUrl);
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe("GET /api/poi/roads/test", () => {
    it("should return configuration status", async () => {
      const response = await fetch(`${baseUrl}/api/poi/roads/test`);
      const data = await response.json();

      // Log configuration status for debugging
      console.log("=== CONFIGURATION TEST ===");
      console.log("Configuration response:", JSON.stringify(data, null, 2));
      console.log("API configured:", data.configured);
      console.log("Connection test result:", data.connectionTest);

      assertEquals(response.status, 200);
      assertEquals(typeof data.configured, "boolean");
      assertEquals(typeof data.connectionTest, "boolean");
      assertEquals(typeof data.timestamp, "string");
    });
  });

  describe("POST /api/poi/roads/snap", () => {
    it("should snap location to road when API key is configured", async () => {
      // Re-check environment variables to handle race conditions
      await new Promise((resolve) => setTimeout(resolve, 50));

      const googleRoadsKey = Deno.env.get("GOOGLE_ROADS_API_KEY");
      const googlePlacesKey = Deno.env.get("GOOGLE_PLACES_API_KEY");

      // Check for valid Google API keys (must start with "AIza" and not be test values)
      const isValidApiKey = (key: string | undefined) =>
        key &&
        key !== "test-key" &&
        key.startsWith("AIza") &&
        !key.includes("test");

      const hasRealApiKey =
        isValidApiKey(googleRoadsKey) || isValidApiKey(googlePlacesKey);

      // Debug logging for test environment
      console.log("=== SNAP TO ROADS TEST START ===");
      console.log("Base URL:", baseUrl);
      console.log("GOOGLE_ROADS_API_KEY present:", !!googleRoadsKey);
      console.log("GOOGLE_PLACES_API_KEY present:", !!googlePlacesKey);
      console.log(
        "GOOGLE_ROADS_API_KEY value:",
        googleRoadsKey ? `${googleRoadsKey.substring(0, 10)}...` : "undefined"
      );
      console.log(
        "GOOGLE_PLACES_API_KEY value:",
        googlePlacesKey ? `${googlePlacesKey.substring(0, 10)}...` : "undefined"
      );
      console.log("Test start time:", new Date().toISOString());

      if (!hasRealApiKey) {
        console.log("Skipping real API test - no valid API key configured");
        return;
      }

      const testLocation = {
        latitude: 40.758, // Times Square, NYC - known location
        longitude: -73.9855,
      };

      // Add small delay to avoid potential rate limiting issues
      await new Promise((resolve) => setTimeout(resolve, 100));

      const response = await fetch(`${baseUrl}/api/poi/roads/snap`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(testLocation),
      });

      const data = await response.json();

      // Enhanced logging for debugging sporadic failures
      if (response.status !== 200) {
        const currentRoadsKey = Deno.env.get("GOOGLE_ROADS_API_KEY");
        const currentPlacesKey = Deno.env.get("GOOGLE_PLACES_API_KEY");

        console.log("=== GOOGLE ROADS SNAP API FAILURE DEBUG ===");
        console.log("Request URL:", `${baseUrl}/api/poi/roads/snap`);
        console.log("Request body:", JSON.stringify(testLocation, null, 2));
        console.log("Response status:", response.status);
        console.log(
          "Response headers:",
          Object.fromEntries(response.headers.entries())
        );
        console.log("Response data:", JSON.stringify(data, null, 2));
        console.log("GOOGLE_ROADS_API_KEY configured:", !!currentRoadsKey);
        console.log("GOOGLE_PLACES_API_KEY configured:", !!currentPlacesKey);
        console.log(
          "GOOGLE_ROADS_API_KEY format valid:",
          currentRoadsKey?.startsWith("AIza") || false
        );
        console.log(
          "GOOGLE_PLACES_API_KEY format valid:",
          currentPlacesKey?.startsWith("AIza") || false
        );
        console.log(
          "Using API key:",
          currentRoadsKey || currentPlacesKey || "none"
        );
        console.log("Timestamp:", new Date().toISOString());
        console.log("=== END DEBUG INFO ===");
      }

      assertEquals(response.status, 200);
      assertEquals(data.location.latitude, testLocation.latitude);
      assertEquals(data.location.longitude, testLocation.longitude);
      assertEquals(typeof data.timestamp, "string");

      // If roadInfo is not null, it should have the expected structure
      if (data.roadInfo) {
        assertEquals(typeof data.roadInfo.placeId, "string");
        assertEquals(typeof data.roadInfo.snappedLocation.latitude, "number");
        assertEquals(typeof data.roadInfo.snappedLocation.longitude, "number");
        assertEquals(typeof data.roadInfo.distanceFromOriginal, "number");
        assertEquals(typeof data.roadInfo.confidence, "number");
      }
    });

    it("should handle invalid coordinates", async () => {
      const invalidLocation = {
        latitude: 91, // Invalid latitude
        longitude: -73.9855,
      };

      const response = await fetch(`${baseUrl}/api/poi/roads/snap`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(invalidLocation),
      });
      await response.body?.cancel();

      assertEquals(response.status, 400);
    });

    it("should handle missing coordinates", async () => {
      const response = await fetch(`${baseUrl}/api/poi/roads/snap`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });
      await response.body?.cancel();

      assertEquals(response.status, 400);
    });
  });

  describe("POST /api/poi/roads/nearest", () => {
    it("should find nearest roads when API key is configured", async () => {
      // Re-check environment variables to handle race conditions
      await new Promise((resolve) => setTimeout(resolve, 50));

      const googleRoadsKey = Deno.env.get("GOOGLE_ROADS_API_KEY");
      const googlePlacesKey = Deno.env.get("GOOGLE_PLACES_API_KEY");

      // Check for valid Google API keys (must start with "AIza" and not be test values)
      const isValidApiKey = (key: string | undefined) =>
        key &&
        key !== "test-key" &&
        key.startsWith("AIza") &&
        !key.includes("test");

      const hasRealApiKey =
        isValidApiKey(googleRoadsKey) || isValidApiKey(googlePlacesKey);

      // Debug logging for test environment
      console.log("=== NEAREST ROADS TEST START ===");
      console.log("Base URL:", baseUrl);
      console.log("GOOGLE_ROADS_API_KEY present:", !!googleRoadsKey);
      console.log("GOOGLE_PLACES_API_KEY present:", !!googlePlacesKey);
      console.log(
        "GOOGLE_ROADS_API_KEY value:",
        googleRoadsKey ? `${googleRoadsKey.substring(0, 10)}...` : "undefined"
      );
      console.log(
        "GOOGLE_PLACES_API_KEY value:",
        googlePlacesKey ? `${googlePlacesKey.substring(0, 10)}...` : "undefined"
      );
      console.log("Test start time:", new Date().toISOString());

      if (!hasRealApiKey) {
        console.log("Skipping real API test - no valid API key configured");
        return;
      }

      const testLocation = {
        latitude: 40.758, // Times Square, NYC - known location
        longitude: -73.9855,
      };

      // Add small delay to avoid potential rate limiting issues
      await new Promise((resolve) => setTimeout(resolve, 150));

      const response = await fetch(`${baseUrl}/api/poi/roads/nearest`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(testLocation),
      });

      const data = await response.json();

      // Enhanced logging for debugging sporadic failures
      if (response.status !== 200) {
        const currentRoadsKey = Deno.env.get("GOOGLE_ROADS_API_KEY");
        const currentPlacesKey = Deno.env.get("GOOGLE_PLACES_API_KEY");

        console.log("=== GOOGLE ROADS NEAREST API FAILURE DEBUG ===");
        console.log("Request URL:", `${baseUrl}/api/poi/roads/nearest`);
        console.log("Request body:", JSON.stringify(testLocation, null, 2));
        console.log("Response status:", response.status);
        console.log(
          "Response headers:",
          Object.fromEntries(response.headers.entries())
        );
        console.log("Response data:", JSON.stringify(data, null, 2));
        console.log("GOOGLE_ROADS_API_KEY configured:", !!currentRoadsKey);
        console.log("GOOGLE_PLACES_API_KEY configured:", !!currentPlacesKey);
        console.log(
          "GOOGLE_ROADS_API_KEY format valid:",
          currentRoadsKey?.startsWith("AIza") || false
        );
        console.log(
          "GOOGLE_PLACES_API_KEY format valid:",
          currentPlacesKey?.startsWith("AIza") || false
        );
        console.log(
          "Using API key:",
          currentRoadsKey || currentPlacesKey || "none"
        );
        console.log("Timestamp:", new Date().toISOString());
        console.log("=== END DEBUG INFO ===");
      }

      assertEquals(response.status, 200);
      assertEquals(data.location.latitude, testLocation.latitude);
      assertEquals(data.location.longitude, testLocation.longitude);
      assertEquals(typeof data.timestamp, "string");
      assertEquals(Array.isArray(data.roads), true);

      // If roads are found, they should have the expected structure
      if (data.roads.length > 0) {
        const road = data.roads[0];
        assertEquals(typeof road.placeId, "string");
        assertEquals(typeof road.snappedLocation.latitude, "number");
        assertEquals(typeof road.snappedLocation.longitude, "number");
        assertEquals(typeof road.distanceFromOriginal, "number");
        assertEquals(typeof road.confidence, "number");
      }
    });

    it("should handle invalid coordinates", async () => {
      const invalidLocation = {
        latitude: -91, // Invalid latitude
        longitude: -73.9855,
      };

      const response = await fetch(`${baseUrl}/api/poi/roads/nearest`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(invalidLocation),
      });
      await response.body?.cancel();

      assertEquals(response.status, 400);
    });
  });
});
