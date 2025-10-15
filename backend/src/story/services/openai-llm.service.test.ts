import { assertEquals, assertExists } from "@std/assert";
import { beforeEach, describe, it } from "@std/testing/bdd";
import { stub } from "@std/testing/mock";
import { OpenAILLMService } from "./openai-llm.service.ts";
import { OpenAIClient } from "../../shared/clients/openai-client.ts";
import { ConfigurationService } from "../../shared/configuration/index.ts";
import { ContentRequestDto, ContentStyle } from "../dto/index.ts";
import { POIType } from "../dto/structured-poi.dto.ts";

describe("OpenAILLMService", () => {
  let service: OpenAILLMService;
  let mockOpenAIClient: OpenAIClient;

  beforeEach(() => {
    // Create mock OpenAI client
    mockOpenAIClient = new OpenAIClient();

    // Stub the chatCompletion method to return mock data
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
      const request = new ContentRequestDto({
        input: { description: "The town of Metuchen, NJ" },
        contentStyle: ContentStyle.HISTORICAL,
      });

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
      const request = new ContentRequestDto({
        input: {
          name: "Morton Arboretum",
          type: POIType.ARBORETUM,
          location: {
            country: "USA",
            state: "Illinois",
            city: "Lisle",
            coordinates: { latitude: 41.8158, longitude: -88.0702 },
          },
          description: "Beautiful tree collections",
          context: "Located in DuPage County",
        },
        contentStyle: ContentStyle.GEOGRAPHICAL,
      });

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
      const textInput = new ContentRequestDto({
        input: { description: "Test location" },
      });

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
});
