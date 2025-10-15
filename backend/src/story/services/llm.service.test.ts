import { assertEquals, assertExists } from "@std/assert";
import { beforeEach, describe, it } from "@std/testing/bdd";
import { MockLLMService } from "./llm.service.ts";
import { ContentRequest, ContentStyle } from "../../shared/schemas/index.ts";

describe("MockLLMService", () => {
  let service: MockLLMService;

  beforeEach(() => {
    service = new MockLLMService();
  });

  describe("generateStorySeedsForPOI", () => {
    it("should generate mock story seeds", async () => {
      const result = await service.generateStorySeedsForPOI(
        "Historic downtown courthouse"
      );

      assertExists(result);
      assertEquals(result.seeds.length, 3);
      assertEquals(result.sources?.includes("Mock LLM Service"), true);

      // Check that all seeds have titles and summaries
      for (const seed of result.seeds) {
        assertExists(seed.title);
        assertExists(seed.summary);
        assertEquals(typeof seed.title, "string");
        assertEquals(typeof seed.summary, "string");
        assertEquals(seed.title.length > 0, true);
        assertEquals(seed.summary.length > 0, true);
      }

      // Check specific mock content
      assertEquals(result.seeds[0].title, "Historic Founding Story");
      assertEquals(
        result.seeds[1].title,
        "Notable Historical Figure Connection"
      );
      assertEquals(result.seeds[2].title, "Architectural Significance");
    });
  });

  describe("generateFullStory", () => {
    it("should generate mock content for text description", async () => {
      const request: ContentRequest = {
        input: {
          type: "TextPOIDescription",
          description: "The town of Metuchen, NJ",
        },
        contentStyle: ContentStyle.HISTORICAL,
        targetDuration: 180,
      };

      const result = await service.generateFullStory(request);

      assertExists(result);
      assertEquals(typeof result.content, "string");
      assertEquals(result.content.length > 0, true);
      assertEquals(result.estimatedDuration > 0, true);
      assertEquals(result.sources?.includes("Mock LLM Service"), true);
    });

    it("should generate mock content for structured POI", async () => {
      const request: ContentRequest = {
        input: {
          type: "StructuredPOI",
          name: "Morton Arboretum",
          poiType: "arboretum",
          location: { latitude: 41.8158, longitude: -88.0702 },
          description: "Beautiful tree collections",
          locationDescription: "Lisle, DuPage County, Illinois, United States",
        },
        contentStyle: ContentStyle.GEOGRAPHICAL,
        targetDuration: 180,
      };

      const result = await service.generateFullStory(request);

      assertExists(result);
      assertEquals(typeof result.content, "string");
      assertEquals(result.content.includes("Morton Arboretum"), true);
      assertEquals(result.estimatedDuration > 0, true);
    });
  });
});
