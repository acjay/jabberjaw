import { assertEquals, assertExists } from '@std/assert';
import { beforeEach, describe, it } from '@std/testing/bdd';
import { ContentGenerationService } from './content-generation.service.ts';
import { MockLLMService } from './llm.service.ts';
import { OpenAILLMService } from './openai-llm.service.ts';
import { ContentStorageService } from './content-storage.service.ts';
import { ContentRequestDto, ContentStyle } from '../dto/index.ts';
import { POIType } from '../dto/structured-poi.dto.ts';

describe('ContentGenerationService', () => {
  let service: ContentGenerationService;
  let llmService: MockLLMService;
  let storageService: ContentStorageService;

  beforeEach(() => {
    llmService = new MockLLMService();
    storageService = new ContentStorageService();
    const openAIService = new OpenAILLMService(); // Mock OpenAI service
    service = new ContentGenerationService(llmService, openAIService, storageService);
  });

  describe('generateContent', () => {
    it('should generate content for text description', async () => {
      const request = new ContentRequestDto({
        input: { description: 'The town of Metuchen, NJ, USA' },
      });

      const result = await service.generateContent(request);

      assertExists(result.id);
      assertExists(result.content);
      assertEquals(typeof result.estimatedDuration, 'number');
      assertExists(result.generatedAt);
      assertEquals(result.contentStyle, ContentStyle.MIXED);
    });

    it('should generate content for structured POI', async () => {
      const request = new ContentRequestDto({
        input: {
          name: 'Morton Arboretum',
          type: POIType.ARBORETUM,
          location: {
            country: 'USA',
            state: 'Illinois',
            city: 'Lisle',
          },
        },
        contentStyle: ContentStyle.GEOGRAPHICAL,
      });

      const result = await service.generateContent(request);

      assertExists(result.id);
      assertExists(result.content);
      assertEquals(result.contentStyle, ContentStyle.GEOGRAPHICAL);
    });

    it('should return cached content for similar requests', async () => {
      const request1 = new ContentRequestDto({
        input: { description: 'The town of Metuchen, NJ, USA' },
      });

      const request2 = new ContentRequestDto({
        input: { description: 'The town of Metuchen, NJ, USA' },
      });

      const result1 = await service.generateContent(request1);
      const result2 = await service.generateContent(request2);

      assertEquals(result1.id, result2.id);
      assertEquals(result1.content, result2.content);
    });
  });

  describe('getContent', () => {
    it('should retrieve stored content by ID', async () => {
      const request = new ContentRequestDto({
        input: { description: 'Test location' },
      });

      const generated = await service.generateContent(request);
      const retrieved = await service.getContent(generated.id);

      assertExists(retrieved);
      assertEquals(retrieved.id, generated.id);
      assertEquals(retrieved.content, generated.content);
      assertExists(retrieved.prompt);
    });

    it('should return null for non-existent content', async () => {
      const result = await service.getContent('non-existent-id');
      assertEquals(result, null);
    });
  });

  describe('getStats', () => {
    it('should return service statistics', () => {
      const stats = service.getStats();

      assertEquals(stats.service, 'content-generation');
      assertEquals(stats.status, 'healthy');
      assertExists(stats.storage);
      assertEquals(typeof stats.storage.total, 'number');
    });
  });
});
