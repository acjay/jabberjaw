import { assertEquals, assertExists, assertRejects } from "@std/assert";
import { beforeEach, describe, it } from "@std/testing/bdd";
import { HttpException } from "@danet/core";
import { StoryController } from "./story.controller.ts";
import { StoryService } from "./services/story.service.ts";
import { stub } from "@std/testing/mock";
import type { FullStoryRequest } from "../shared/schemas/index.ts";

describe("StoryController", () => {
  let controller: StoryController;
  let mockService: StoryService;

  beforeEach(() => {
    // Only create the empty mock service - no stubs here
    mockService = {} as StoryService;
    controller = new StoryController(mockService);
  });

  describe("generateContent", () => {
    it("should generate content with text description input", async () => {
      // Stub only what this test needs
      stub(mockService, "generateContent", () =>
        Promise.resolve({
          id: "test-content-id-123",
          content: "Mock generated story content",
          duration: 180,
          status: "ready" as const,
          generatedAt: new Date(),
        })
      );

      const requestBody: FullStoryRequest = {
        input: {
          description: "The town of Metuchen, NJ, USA",
        },
        targetDuration: 180,
        contentStyle: "historical",
      };

      const result = await controller.generateContent(requestBody);

      assertExists(result.storyId);
      assertExists(result.content);
      assertExists(result.duration);
      assertEquals(result.status, "ready");
    });

    it("should generate content with structured POI input", async () => {
      // Different stub behavior for this test
      stub(mockService, "generateContent", () =>
        Promise.resolve({
          id: "poi-content-id-456",
          content: "Mock POI story content",
          duration: 240,
          status: "ready" as const,
          generatedAt: new Date(),
        })
      );

      const requestBody: FullStoryRequest = {
        input: {
          name: "Morton Arboretum",
          poiType: "arboretum",
          location: {
            latitude: 50,
            longitude: 50,
          },
          description: "A beautiful arboretum",
        },
        targetDuration: 180,
        contentStyle: "cultural",
      };

      const result = await controller.generateContent(requestBody);

      assertExists(result.storyId);
      assertExists(result.content);
      assertEquals(result.status, "ready");
    });

    it("should handle service errors gracefully", async () => {
      // Stub service to throw an error
      stub(mockService, "generateContent", () => {
        throw new Error("Service error");
      });

      const requestBody: FullStoryRequest = {
        input: {
          description: "Test location",
        },
        targetDuration: 180,
        contentStyle: "mixed",
      };

      await assertRejects(
        () => controller.generateContent(requestBody),
        Error,
        "Service error"
      );
    });
  });

  describe("getContent", () => {
    it("should retrieve content by ID", async () => {
      // Stub with specific return value for this test (getContent is now synchronous)
      stub(mockService, "getContent", () => ({
        id: "test-id",
        content: "Retrieved story content",
        prompt: "Test prompt",
        generatedAt: new Date(),
        estimatedDuration: 180,
        contentStyle: "mixed",
        inputData: { description: "test" },
        storedAt: new Date(),
        accessCount: 1,
        lastAccessedAt: new Date(),
        sources: ["test"],
      }));

      const result = await controller.getContent("test-id");

      assertExists(result.id);
      assertExists(result.content);
      assertExists(result.prompt);
      assertEquals(result.id, "test-id");
    });

    it("should throw HttpException for non-existent content ID", async () => {
      // Stub to return null for non-existent content (getContent is now synchronous)
      stub(mockService, "getContent", () => null);

      await assertRejects(
        () => controller.getContent("non-existent-id"),
        HttpException,
        "Content not found"
      );
    });

    it("should throw HttpException for empty content ID", async () => {
      // This test doesn't need stubs - validation happens before service call
      await assertRejects(
        () => controller.getContent(""),
        HttpException,
        "Content ID is required"
      );
    });
  });

  describe("listContent", () => {
    it("should return array of stored content", async () => {
      // Stub with mock content list (listContent is now synchronous)
      stub(mockService, "listContent", () => [
        {
          id: "content-1",
          content: "First story",
          prompt: "Prompt 1",
          generatedAt: new Date(),
          estimatedDuration: 120,
          contentStyle: "historical",
          inputData: { description: "location 1" },
          storedAt: new Date(),
          accessCount: 2,
          lastAccessedAt: new Date(),
          sources: ["test"],
        },
        {
          id: "content-2",
          content: "Second story",
          prompt: "Prompt 2",
          generatedAt: new Date(),
          estimatedDuration: 150,
          contentStyle: "cultural",
          inputData: { description: "location 2" },
          storedAt: new Date(),
          accessCount: 1,
          lastAccessedAt: new Date(),
          sources: ["test"],
        },
      ]);

      const result = await controller.listContent();

      assertEquals(Array.isArray(result), true);
      assertEquals(result.length, 2);
      assertEquals(result[0].id, "content-1");
      assertEquals(result[1].id, "content-2");
    });

    it("should return empty array when no content exists", async () => {
      // Stub with empty array
      stub(mockService, "listContent", () => []);

      const result = await controller.listContent();

      assertEquals(Array.isArray(result), true);
      assertEquals(result.length, 0);
    });
  });

  describe("deleteContent", () => {
    it("should delete existing content", async () => {
      // Stub successful deletion (deleteContent is now synchronous)
      stub(mockService, "deleteContent", () => true);

      const result = await controller.deleteContent("test-id");
      assertEquals(result.success, true);
    });

    it("should throw HttpException for non-existent content ID", async () => {
      // Stub failed deletion
      stub(mockService, "deleteContent", () => false);

      await assertRejects(
        () => controller.deleteContent("non-existent-id"),
        HttpException,
        "Content not found"
      );
    });

    it("should throw HttpException for empty content ID", async () => {
      // No stub needed - validation happens before service call
      await assertRejects(
        () => controller.deleteContent(""),
        HttpException,
        "Content ID is required"
      );
    });
  });

  describe("getStats", () => {
    it("should return service statistics", () => {
      // Stub with specific stats
      stub(mockService, "getStats", () => ({
        service: "story",
        status: "healthy",
        storage: {
          total: 5,
          totalSize: 2048,
          averageSize: 409,
          totalAccesses: 15,
          mostAccessedId: "popular-content-123",
        },
      }));

      const result = controller.getStats();

      assertEquals(result.service, "story");
      assertEquals(result.status, "healthy");
      assertEquals(result.storage.total, 5);
      assertEquals(result.storage.mostAccessedId, "popular-content-123");
    });
  });

  describe("clearCache", () => {
    it("should clear cache successfully", async () => {
      // Stub cache clearing (clearCache is now synchronous)
      stub(mockService, "clearCache", () => undefined);

      const result = await controller.clearCache();
      assertEquals(result.success, true);
    });
  });

  describe("findSimilarContent", () => {
    it("should return similar content", () => {
      // Stub with similar content results
      stub(mockService, "findSimilarContent", () => [
        {
          id: "similar-1",
          content: "Similar story 1",
          prompt: "Similar prompt 1",
          generatedAt: new Date(),
          estimatedDuration: 160,
          contentStyle: "geographical",
          inputData: { description: "similar location" },
          storedAt: new Date(),
          accessCount: 3,
          lastAccessedAt: new Date(),
          sources: ["test"],
        },
      ]);

      const inputData = { description: "test location" };
      const result = controller.findSimilarContent(inputData);

      assertEquals(Array.isArray(result), true);
      assertEquals(result.length, 1);
      assertEquals(result[0].id, "similar-1");
    });
  });

  describe("getRecentContent", () => {
    it("should return recent content", () => {
      // Stub with recent content
      stub(mockService, "getRecentContent", () => [
        {
          id: "recent-1",
          content: "Recent story",
          prompt: "Recent prompt",
          generatedAt: new Date(),
          estimatedDuration: 140,
          contentStyle: "mixed",
          inputData: { description: "recent location" },
          storedAt: new Date(),
          accessCount: 1,
          lastAccessedAt: new Date(),
          sources: ["test"],
        },
      ]);

      const result = controller.getRecentContent();

      assertEquals(Array.isArray(result), true);
      assertEquals(result.length, 1);
      assertEquals(result[0].id, "recent-1");
    });
  });

  describe("getPopularContent", () => {
    it("should return popular content", () => {
      // Stub with popular content
      stub(mockService, "getPopularContent", () => [
        {
          id: "popular-1",
          content: "Popular story",
          prompt: "Popular prompt",
          generatedAt: new Date(),
          estimatedDuration: 200,
          contentStyle: "historical",
          inputData: { description: "popular location" },
          storedAt: new Date(),
          accessCount: 10,
          lastAccessedAt: new Date(),
          sources: ["test"],
        },
      ]);

      const result = controller.getPopularContent();

      assertEquals(Array.isArray(result), true);
      assertEquals(result.length, 1);
      assertEquals(result[0].accessCount, 10);
    });
  });
});
