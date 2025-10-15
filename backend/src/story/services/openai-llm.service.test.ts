import { assertEquals, assertExists } from "@std/assert";
import { beforeEach, describe, it } from "@std/testing/bdd";
import { stub, restore } from "@std/testing/mock";
import { OpenAILLMService } from "./openai-llm.service.ts";
import { OpenAIClient } from "../../shared/clients/openai-client.ts";
import { ConfigurationService } from "../../configuration/index.ts";
import {
  ContentRequest,
  ContentStyle,
  type ContentStyleType,
} from "../../shared/schemas/index.ts";

describe("OpenAILLMService", () => {
  let service: OpenAILLMService;
  let mockOpenAIClient: OpenAIClient;

  beforeEach(() => {
    // Restore all stubs before each test
    restore();

    // Create mock OpenAI client
    mockOpenAIClient = new OpenAIClient();

    const mockConfigService = {
      get: () => undefined,
      getOpenAIApiKey: () => Promise.resolve("test-api-key"),
      getOpenAIModel: () => "gpt-3.5-turbo",
      getGoogleMapsApiKey: () => Promise.resolve(undefined),
      getGoogleRoadsApiKey: () => Promise.resolve(undefined),
      getGooglePlacesApiKey: () => Promise.resolve(undefined),
    } as unknown as ConfigurationService;
    service = new OpenAILLMService(mockOpenAIClient, mockConfigService);
  });

  describe("generatePrompt", () => {
    it("should generate prompt for text description input", () => {
      // Stub the chatCompletion method for generatePrompt tests
      stub(mockOpenAIClient, "chatCompletion", () =>
        Promise.resolve({
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
        })
      );
      const request: ContentRequest = {
        input: {
          type: "TextPOIDescription",
          description: "The town of Metuchen, NJ",
        },
        contentStyle: ContentStyle.HISTORICAL,
        targetDuration: 180,
      };

      const prompt = service.generatePrompt(
        request.input,
        request.contentStyle!
      );

      assertExists(prompt);
      assertEquals(typeof prompt, "string");
      assertEquals(prompt.includes("Metuchen, NJ"), true);
      assertEquals(prompt.includes("historical events"), true);
      assertEquals(prompt.includes("3-minute"), true);
    });

    it("should generate prompt for structured POI input", () => {
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

      const prompt = service.generatePrompt(
        request.input,
        request.contentStyle!
      );

      assertExists(prompt);
      assertEquals(prompt.includes("Morton Arboretum"), true);
      assertEquals(prompt.includes("arboretum"), true);
      assertEquals(prompt.includes("Lisle"), true);
      assertEquals(prompt.includes("coordinates"), true);
      assertEquals(prompt.includes("geographical features"), true);
    });

    it("should include different style instructions", () => {
      const textInput: ContentRequest = {
        input: { type: "TextPOIDescription", description: "Test location" },
        targetDuration: 180,
        contentStyle: "mixed",
      };

      const historicalPrompt = service.generatePrompt(
        textInput.input,
        ContentStyle.HISTORICAL
      );
      const culturalPrompt = service.generatePrompt(
        textInput.input,
        ContentStyle.CULTURAL
      );
      const geographicalPrompt = service.generatePrompt(
        textInput.input,
        ContentStyle.GEOGRAPHICAL
      );
      const mixedPrompt = service.generatePrompt(
        textInput.input,
        ContentStyle.MIXED
      );

      assertEquals(historicalPrompt.includes("historical events"), true);
      assertEquals(culturalPrompt.includes("cultural significance"), true);
      assertEquals(geographicalPrompt.includes("geographical features"), true);
      assertEquals(mixedPrompt.includes("balanced mix"), true);
    });
  });

  describe("generateStorySeedsForPOI", () => {
    it("should generate story seeds for a POI", async () => {
      // Mock the OpenAI response for story seeds
      stub(mockOpenAIClient, "chatCompletion", () =>
        Promise.resolve({
          choices: [
            {
              message: {
                content: `SUMMARY: This historic courthouse was built in 1892 and served as the center of justice for the county for over a century. The building features beautiful Victorian architecture and has witnessed countless trials and legal proceedings that shaped the local community.
TITLE: Historic Courthouse Construction and Legacy

SUMMARY: A famous author once lived in this town and drew inspiration from the local landscape for several of their most celebrated novels. The connection between the writer and this place continues to attract literary enthusiasts from around the world.
TITLE: Famous Author's Local Connection

SUMMARY: The area was once home to a thriving railroad junction that connected multiple major cities. The old train station, though no longer in use, stands as a testament to the town's important role in regional transportation history.
TITLE: Railroad Junction Historical Significance`,
              },
              finish_reason: "stop",
            },
          ],
          usage: {
            prompt_tokens: 200,
            completion_tokens: 150,
            total_tokens: 350,
          },
        })
      );

      const result = await service.generateStorySeedsForPOI(
        "Historic downtown courthouse in Springfield"
      );

      assertExists(result);
      assertEquals(result.seeds.length, 3);
      assertEquals(result.sources?.includes("OpenAI"), true);

      // Check first seed
      assertEquals(
        result.seeds[0].title,
        "Historic Courthouse Construction and Legacy"
      );
      assertEquals(
        result.seeds[0].summary.includes("courthouse was built in 1892"),
        true
      );

      // Check second seed
      assertEquals(result.seeds[1].title, "Famous Author's Local Connection");
      assertEquals(result.seeds[1].summary.includes("famous author"), true);

      // Check third seed
      assertEquals(
        result.seeds[2].title,
        "Railroad Junction Historical Significance"
      );
      assertEquals(result.seeds[2].summary.includes("railroad junction"), true);
    });

    it("should handle 'no story ideas' response", async () => {
      // Mock the OpenAI response for no story ideas
      stub(mockOpenAIClient, "chatCompletion", () =>
        Promise.resolve({
          choices: [
            {
              message: {
                content: "no story ideas",
              },
              finish_reason: "stop",
            },
          ],
          usage: {
            prompt_tokens: 50,
            completion_tokens: 5,
            total_tokens: 55,
          },
        })
      );

      const result = await service.generateStorySeedsForPOI(
        "Generic parking lot"
      );

      assertExists(result);
      assertEquals(result.seeds.length, 0);
      assertEquals(result.sources?.includes("OpenAI"), true);
    });

    it("should handle malformed response gracefully", async () => {
      // Mock the OpenAI response with malformed content
      stub(mockOpenAIClient, "chatCompletion", () =>
        Promise.resolve({
          choices: [
            {
              message: {
                content:
                  "This is not properly formatted content without SUMMARY or TITLE markers",
              },
              finish_reason: "stop",
            },
          ],
          usage: {
            prompt_tokens: 50,
            completion_tokens: 20,
            total_tokens: 70,
          },
        })
      );

      const result = await service.generateStorySeedsForPOI("Some location");

      assertExists(result);
      assertEquals(result.seeds.length, 0);
      assertEquals(result.sources?.includes("OpenAI"), true);
    });
  });
});
