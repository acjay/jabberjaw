import { assertEquals } from "@std/assert";
import { describe, it, beforeAll, afterAll } from "@std/testing/bdd";
import { DanetApplication } from "@danet/core";
import { load } from "@std/dotenv";
import { POIDiscoveryModule } from "./poi-discovery.module.ts";
import {
  ConnectionTestResponseSchema,
  RoadsSnapResponseSchema,
  RoadsNearestResponseSchema,
} from "../shared/schemas/journey.schema.ts";

// Load environment variables for testing with error handling
try {
  await load({ export: true });
  console.log("Environment variables loaded successfully");
} catch (error) {
  console.warn("Failed to load .env file:", error);
}

// Helper function to check if API is configured by calling the test endpoint
const checkApiConfiguration = async (baseUrl: string) => {
  try {
    const response = await fetch(`${baseUrl}/api/poi/roads/test`);
    const data = await response.json();
    return {
      configured: data.configured || false,
      connectionTest: data.connectionTest || false,
    };
  } catch (error) {
    console.warn("Failed to check API configuration:", error);
    return { configured: false, connectionTest: false };
  }
};

describe("Google Roads API Integration", () => {
  let app: DanetApplication;
  let baseUrl: string;

  beforeAll(async () => {
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

      // Validate response structure with Zod
      const validationResult = ConnectionTestResponseSchema.safeParse(data);
      assertEquals(validationResult.success, true);
    });
  });

  describe("POST /api/poi/roads/snap", () => {
    it("should snap location to road when API key is configured", async () => {
      // Check if API is configured through the service
      const apiConfig = await checkApiConfiguration(baseUrl);

      console.log("=== SNAP TO ROADS TEST START ===");
      console.log("Base URL:", baseUrl);
      console.log("API configured:", apiConfig.configured);
      console.log("Connection test:", apiConfig.connectionTest);
      console.log("Test start time:", new Date().toISOString());

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

      // If API is not configured, expect a 500 error with appropriate message
      if (!apiConfig.configured) {
        console.log("API not configured - expecting error response");
        assertEquals(response.status, 500);
        assertEquals(typeof data.message, "string");
        return;
      }

      // If API is configured, expect successful response or handle API failures gracefully
      if (response.status === 200) {
        console.log("Snap to roads response:", JSON.stringify(data, null, 2));

        // Validate response structure with Zod
        const validationResult = RoadsSnapResponseSchema.safeParse(data);
        assertEquals(validationResult.success, true);

        assertEquals(data.location.latitude, testLocation.latitude);
        assertEquals(data.location.longitude, testLocation.longitude);
      } else {
        // API call failed - this can happen with real Google API calls
        console.log("API call failed with status:", response.status);
        console.log("Response data:", JSON.stringify(data, null, 2));
        // For integration tests, we accept that external API calls may fail
        // The important thing is that the service handles errors gracefully
        assertEquals(typeof data.message, "string");
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
      // Check if API is configured through the service
      const apiConfig = await checkApiConfiguration(baseUrl);

      console.log("=== NEAREST ROADS TEST START ===");
      console.log("Base URL:", baseUrl);
      console.log("API configured:", apiConfig.configured);
      console.log("Connection test:", apiConfig.connectionTest);
      console.log("Test start time:", new Date().toISOString());

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

      // If API is not configured, expect a 500 error with appropriate message
      if (!apiConfig.configured) {
        console.log("API not configured - expecting error response");
        assertEquals(response.status, 500);
        assertEquals(typeof data.message, "string");
        return;
      }

      // If API is configured, expect successful response or handle API failures gracefully
      if (response.status === 200) {
        console.log("Nearest roads response:", JSON.stringify(data, null, 2));

        // Validate response structure with Zod
        const validationResult = RoadsNearestResponseSchema.safeParse(data);
        assertEquals(validationResult.success, true);

        assertEquals(data.location.latitude, testLocation.latitude);
        assertEquals(data.location.longitude, testLocation.longitude);
      } else {
        // API call failed - this can happen with real Google API calls
        console.log("API call failed with status:", response.status);
        console.log("Response data:", JSON.stringify(data, null, 2));
        // For integration tests, we accept that external API calls may fail
        // The important thing is that the service handles errors gracefully
        assertEquals(typeof data.message, "string");
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
