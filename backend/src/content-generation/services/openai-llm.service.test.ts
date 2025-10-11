import { assertEquals, assertExists } from '@std/assert';
import { beforeEach, describe, it } from '@std/testing/bdd';
import { OpenAILLMService } from './openai-llm.service.ts';
import { ContentRequestDto, ContentStyle } from '../dto/index.ts';
import { POIType } from '../dto/structured-poi.dto.ts';

describe('OpenAILLMService', () => {
  let service: OpenAILLMService;

  beforeEach(() => {
    service = new OpenAILLMService();
  });

  describe('generatePrompt', () => {
    it('should generate prompt for text description input', () => {
      const request = new ContentRequestDto({
        input: { description: 'The town of Metuchen, NJ' },
        contentStyle: ContentStyle.HISTORICAL,
      });

      const prompt = service.generatePrompt(request.input, request.contentStyle!);

      assertExists(prompt);
      assertEquals(typeof prompt, 'string');
      assertEquals(prompt.includes('Metuchen, NJ'), true);
      assertEquals(prompt.includes('historical events'), true);
      assertEquals(prompt.includes('3-minute'), true);
    });

    it('should generate prompt for structured POI input', () => {
      const request = new ContentRequestDto({
        input: {
          name: 'Morton Arboretum',
          type: POIType.ARBORETUM,
          location: {
            country: 'USA',
            state: 'Illinois',
            city: 'Lisle',
            coordinates: { latitude: 41.8158, longitude: -88.0702 },
          },
          description: 'Beautiful tree collections',
          context: 'Located in DuPage County',
        },
        contentStyle: ContentStyle.GEOGRAPHICAL,
      });

      const prompt = service.generatePrompt(request.input, request.contentStyle!);

      assertExists(prompt);
      assertEquals(prompt.includes('Morton Arboretum'), true);
      assertEquals(prompt.includes('arboretum'), true);
      assertEquals(prompt.includes('Lisle'), true);
      assertEquals(prompt.includes('coordinates'), true);
      assertEquals(prompt.includes('geographical features'), true);
    });

    it('should include different style instructions', () => {
      const textInput = new ContentRequestDto({
        input: { description: 'Test location' },
      });

      const historicalPrompt = service.generatePrompt(textInput.input, ContentStyle.HISTORICAL);
      const culturalPrompt = service.generatePrompt(textInput.input, ContentStyle.CULTURAL);
      const geographicalPrompt = service.generatePrompt(textInput.input, ContentStyle.GEOGRAPHICAL);
      const mixedPrompt = service.generatePrompt(textInput.input, ContentStyle.MIXED);

      assertEquals(historicalPrompt.includes('historical events'), true);
      assertEquals(culturalPrompt.includes('cultural significance'), true);
      assertEquals(geographicalPrompt.includes('geographical features'), true);
      assertEquals(mixedPrompt.includes('balanced mix'), true);
    });
  });

  describe('generateContent', () => {
    it('should throw error when API key is not configured', async () => {
      // Temporarily clear the API key
      const originalKey = Deno.env.get('OPENAI_API_KEY');
      Deno.env.delete('OPENAI_API_KEY');

      const serviceWithoutKey = new OpenAILLMService();
      const request = new ContentRequestDto({
        input: { description: 'Test location' },
      });

      try {
        await serviceWithoutKey.generateContent(request);
        throw new Error('Should have thrown an error');
      } catch (error) {
        assertEquals(error instanceof Error, true);
        assertEquals((error as Error).message.includes('API key not configured'), true);
      } finally {
        // Restore the original key
        if (originalKey) {
          Deno.env.set('OPENAI_API_KEY', originalKey);
        }
      }
    });

    // Note: This test requires a real API key and will make actual API calls
    // Uncomment and run manually when you want to test with real OpenAI API
    /*
    it('should generate content with real OpenAI API', async () => {
      const apiKey = Deno.env.get('OPENAI_API_KEY');
      if (!apiKey) {
        console.log('Skipping real API test - no API key configured');
        return;
      }

      const request = new ContentRequestDto({
        input: { description: 'The Liberty Bell in Philadelphia' },
        contentStyle: ContentStyle.HISTORICAL,
      });

      const response = await service.generateContent(request);

      assertExists(response);
      assertExists(response.content);
      assertEquals(typeof response.content, 'string');
      assertEquals(response.content.length > 100, true); // Should be substantial content
      assertEquals(typeof response.estimatedDuration, 'number');
      assertEquals(response.estimatedDuration > 0, true);
      assertExists(response.sources);
      assertEquals(response.sources!.includes('OpenAI'), true);
    });

 */
  });
});
