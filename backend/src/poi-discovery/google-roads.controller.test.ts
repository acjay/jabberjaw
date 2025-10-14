import { assertEquals, assertRejects } from "@std/assert";
import { describe, it, beforeEach } from "@std/testing/bdd";
import { GoogleRoadsController } from "./google-roads.controller.ts";
import { GoogleRoadsService } from "./services/google-roads.service.ts";
import { HttpException } from "@danet/core";
import { stub } from "@std/testing/mock";

describe("GoogleRoadsController", () => {
  let controller: GoogleRoadsController;
  let mockService: GoogleRoadsService;

  beforeEach(() => {
    mockService = {} as GoogleRoadsService;
    controller = new GoogleRoadsController(mockService);
  });

  describe("testConnection", () => {
    it("should return configuration and connection status", async () => {
      stub(mockService, "isConfigured", () => true);
      stub(mockService, "testConnection", () => Promise.resolve(true));

      const result = await controller.testConnection();

      assertEquals(result.configured, true);
      assertEquals(result.connectionTest, true);
      assertEquals(typeof result.timestamp, "string");
    });

    it("should handle unconfigured service", async () => {
      stub(mockService, "isConfigured", () => false);

      const result = await controller.testConnection();

      assertEquals(result.configured, false);
      assertEquals(result.connectionTest, false);
      assertEquals(typeof result.timestamp, "string");
    });

    it("should handle connection test failure", async () => {
      stub(mockService, "isConfigured", () => true);
      stub(mockService, "testConnection", () => Promise.resolve(false));

      const result = await controller.testConnection();

      assertEquals(result.configured, true);
      assertEquals(result.connectionTest, false);
      assertEquals(typeof result.timestamp, "string");
    });
  });

  describe("snapToRoads", () => {
    it("should successfully snap location to road", async () => {
      stub(mockService, "isConfigured", () => true);
      stub(mockService, "snapToRoads", () =>
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

      const requestBody = {
        latitude: 40.758,
        longitude: -73.9855,
      };

      const result = await controller.snapToRoads(requestBody);

      assertEquals(result.location.latitude, requestBody.latitude);
      assertEquals(result.location.longitude, requestBody.longitude);
      assertEquals(result.roadInfo?.roadName, "Broadway");
      assertEquals(result.roadInfo?.placeId, "ChIJmQJIxlVYwokRLgeuocVOGVU");
      assertEquals(typeof result.timestamp, "string");
    });

    it("should validate latitude range", async () => {
      const requestBody = {
        latitude: 91, // Invalid latitude
        longitude: -73.9855,
      };

      await assertRejects(
        () => controller.snapToRoads(requestBody),
        HttpException,
        "Invalid latitude"
      );
    });

    it("should validate longitude range", async () => {
      const requestBody = {
        latitude: 40.758,
        longitude: 181, // Invalid longitude
      };

      await assertRejects(
        () => controller.snapToRoads(requestBody),
        HttpException,
        "Invalid longitude"
      );
    });

    it("should handle missing latitude", async () => {
      const requestBody = {
        longitude: -73.9855,
      };

      await assertRejects(
        () => controller.snapToRoads(requestBody),
        HttpException,
        "Invalid latitude"
      );
    });

    it("should handle missing longitude", async () => {
      const requestBody = {
        latitude: 40.758,
      };

      await assertRejects(
        () => controller.snapToRoads(requestBody),
        HttpException,
        "Invalid longitude"
      );
    });

    it("should handle unconfigured API key", async () => {
      stub(mockService, "snapToRoads", () => {
        throw new Error("API key not configured");
      });

      const requestBody = {
        latitude: 40.758,
        longitude: -73.9855,
      };

      await assertRejects(
        () => controller.snapToRoads(requestBody),
        HttpException,
        "Google Roads API is not configured"
      );
    });
  });

  describe("findNearestRoads", () => {
    it("should successfully find nearest roads", async () => {
      stub(mockService, "isConfigured", () => true);
      stub(mockService, "findNearestRoads", () =>
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
          {
            roadName: "7th Avenue",
            placeId: "ChIJmQJIxlVYwokRLgeuocVOGVV",
            snappedLocation: {
              latitude: 40.759,
              longitude: -73.9855,
            },
            originalLocation: {
              latitude: 40.758,
              longitude: -73.9855,
            },
            distanceFromOriginal: 111,
            confidence: 0.89,
          },
        ])
      );

      const requestBody = {
        latitude: 40.758,
        longitude: -73.9855,
      };

      const result = await controller.findNearestRoads(requestBody);

      assertEquals(result.location.latitude, requestBody.latitude);
      assertEquals(result.location.longitude, requestBody.longitude);
      assertEquals(result.roads.length, 2);
      assertEquals(result.roads[0].roadName, "Broadway");
      assertEquals(result.roads[1].roadName, "7th Avenue");
      assertEquals(typeof result.timestamp, "string");
    });

    it("should validate latitude range", async () => {
      const requestBody = {
        latitude: -91, // Invalid latitude
        longitude: -73.9855,
      };

      await assertRejects(
        () => controller.findNearestRoads(requestBody),
        HttpException,
        "Invalid latitude"
      );
    });

    it("should validate longitude range", async () => {
      const requestBody = {
        latitude: 40.758,
        longitude: -181, // Invalid longitude
      };

      await assertRejects(
        () => controller.findNearestRoads(requestBody),
        HttpException,
        "Invalid longitude"
      );
    });

    it("should handle missing coordinates", async () => {
      const requestBody = {};

      await assertRejects(
        () => controller.findNearestRoads(requestBody),
        HttpException,
        "Invalid latitude"
      );
    });

    it("should handle unconfigured API key", async () => {
      stub(mockService, "findNearestRoads", () => {
        throw new Error("API key not configured");
      });

      const requestBody = {
        latitude: 40.758,
        longitude: -73.9855,
      };

      await assertRejects(
        () => controller.findNearestRoads(requestBody),
        HttpException,
        "Google Roads API is not configured"
      );
    });
  });
});
