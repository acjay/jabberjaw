import { assertEquals, assertExists } from '@std/assert';
import { beforeEach, describe, it } from '@std/testing/bdd';
import { ContentInputData, ContentStorageService } from './content-storage.service.ts';
import { GeneratedContentDto } from '../dto/index.ts';
import { TextPOIDescriptionDto } from '../dto/text-poi-description.dto.ts';
import { POIType, StructuredPOIDto } from '../dto/structured-poi.dto.ts';

describe('ContentStorageService', () => {
  let service: ContentStorageService;
  let sampleContent: GeneratedContentDto;
  let samplePrompt: string;
  let sampleInputData: ContentInputData;

  beforeEach(() => {
    service = new ContentStorageService();

    sampleContent = new GeneratedContentDto({
      id: 'test-id-1',
      content: 'This is a test narrative about a historical landmark.',
      estimatedDuration: 180,
      sources: ['Test Source'],
      contentStyle: 'historical',
    });

    samplePrompt = 'Generate a 3-minute narrative about the following location...';
    sampleInputData = new TextPOIDescriptionDto({ description: 'The town of Metuchen, NJ, USA' });
  });

  describe('store', () => {
    it('should store content with metadata', () => {
      const stored = service.store(sampleContent, samplePrompt, sampleInputData);

      assertEquals(stored.id, sampleContent.id);
      assertEquals(stored.content, sampleContent.content);
      assertEquals(stored.prompt, samplePrompt);
      assertEquals(stored.inputData, sampleInputData);
      assertEquals(stored.accessCount, 0);
      assertExists(stored.storedAt);
      assertExists(stored.lastAccessedAt);
    });

    it('should handle multiple content items', () => {
      const content1 = new GeneratedContentDto({
        id: 'test-1',
        content: 'Content 1',
        estimatedDuration: 180,
      });

      const content2 = new GeneratedContentDto({
        id: 'test-2',
        content: 'Content 2',
        estimatedDuration: 180,
      });

      service.store(content1, 'prompt1', sampleInputData);
      service.store(content2, 'prompt2', sampleInputData);

      const stats = service.getStats();
      assertEquals(stats.total, 2);
    });
  });

  describe('retrieve', () => {
    it('should retrieve stored content and update access statistics', () => {
      service.store(sampleContent, samplePrompt, sampleInputData);

      const retrieved = service.retrieve(sampleContent.id);
      assertExists(retrieved);
      assertEquals(retrieved.id, sampleContent.id);
      assertEquals(retrieved.accessCount, 1);

      // Retrieve again to test access count increment
      const retrievedAgain = service.retrieve(sampleContent.id);
      assertExists(retrievedAgain);
      assertEquals(retrievedAgain.accessCount, 2);
    });

    it('should return null for non-existent content', () => {
      const retrieved = service.retrieve('non-existent-id');
      assertEquals(retrieved, null);
    });
  });

  describe('list', () => {
    it('should list content with pagination', () => {
      // Store multiple items
      for (let i = 0; i < 15; i++) {
        const content = new GeneratedContentDto({
          id: `test-${i}`,
          content: `Content ${i}`,
          estimatedDuration: 180,
        });
        service.store(content, `prompt-${i}`, sampleInputData);
      }

      const firstPage = service.list(10, 0);
      assertEquals(firstPage.length, 10);

      const secondPage = service.list(10, 10);
      assertEquals(secondPage.length, 5);
    });

    it('should sort by stored date (newest first)', async () => {
      const content1 = new GeneratedContentDto({
        id: 'old',
        content: 'Old content',
        estimatedDuration: 180,
      });

      service.store(content1, 'prompt1', sampleInputData);

      // Add small delay to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 10));

      const content2 = new GeneratedContentDto({
        id: 'new',
        content: 'New content',
        estimatedDuration: 180,
      });

      service.store(content2, 'prompt2', sampleInputData);

      const list = service.list(2, 0);
      assertEquals(list[0].id, 'new');
      assertEquals(list[1].id, 'old');
    });
  });

  describe('delete', () => {
    it('should delete existing content', () => {
      service.store(sampleContent, samplePrompt, sampleInputData);

      const deleted = service.delete(sampleContent.id);
      assertEquals(deleted, true);

      const retrieved = service.retrieve(sampleContent.id);
      assertEquals(retrieved, null);
    });

    it('should return false for non-existent content', () => {
      const deleted = service.delete('non-existent-id');
      assertEquals(deleted, false);
    });
  });

  describe('clear', () => {
    it('should clear all content', () => {
      service.store(sampleContent, samplePrompt, sampleInputData);

      let stats = service.getStats();
      assertEquals(stats.total, 1);

      service.clear();

      stats = service.getStats();
      assertEquals(stats.total, 0);
    });
  });

  describe('getStats', () => {
    it('should return comprehensive statistics', () => {
      const content1 = new GeneratedContentDto({
        id: 'test-1',
        content: 'Short',
        estimatedDuration: 180,
      });

      const content2 = new GeneratedContentDto({
        id: 'test-2',
        content: 'Much longer content for testing',
        estimatedDuration: 180,
      });

      service.store(content1, 'prompt1', sampleInputData);
      service.store(content2, 'prompt2', sampleInputData);

      // Access content to generate statistics
      service.retrieve('test-1');
      service.retrieve('test-1');
      service.retrieve('test-2');

      const stats = service.getStats();
      assertEquals(stats.total, 2);
      assertEquals(stats.totalSize, content1.content.length + content2.content.length);
      assertEquals(
        stats.averageSize,
        Math.round((content1.content.length + content2.content.length) / 2),
      );
      assertEquals(stats.mostAccessedId, 'test-1');
      assertEquals(stats.totalAccesses, 3);
    });
  });

  describe('findSimilar', () => {
    it('should find exact matches', () => {
      const inputData = new TextPOIDescriptionDto({ description: 'Test location' });
      service.store(sampleContent, samplePrompt, inputData);

      const similar = service.findSimilar(inputData, 5);
      assertEquals(similar.length, 1);
      assertEquals(similar[0].id, sampleContent.id);
    });

    it('should find similar text descriptions', () => {
      const inputData1 = new TextPOIDescriptionDto({
        description: 'The historic town of Princeton',
      });
      const inputData2 = new TextPOIDescriptionDto({ description: 'Princeton historic district' });

      const content1 = new GeneratedContentDto({
        id: 'princeton-1',
        content: 'Content about Princeton',
        estimatedDuration: 180,
      });

      service.store(content1, 'prompt', inputData1);

      const similar = service.findSimilar(inputData2, 5);
      assertEquals(similar.length, 1);
      assertEquals(similar[0].id, 'princeton-1');
    });

    it('should find similar structured POI data', () => {
      const structuredPOI1 = new StructuredPOIDto({
        name: 'Central Park',
        type: POIType.PARK,
        location: {
          country: 'USA',
          state: 'NY',
          city: 'New York',
        },
      });

      const structuredPOI2 = new StructuredPOIDto({
        name: 'Central Park Zoo',
        type: POIType.PARK,
        location: {
          country: 'USA',
          state: 'NY',
          city: 'New York',
        },
      });

      const content = new GeneratedContentDto({
        id: 'central-park',
        content: 'Content about Central Park',
        estimatedDuration: 180,
      });

      service.store(content, 'prompt', structuredPOI1);

      const similar = service.findSimilar(structuredPOI2, 5);
      assertEquals(similar.length, 1);
      assertEquals(similar[0].id, 'central-park');
    });
  });

  describe('findByLocation', () => {
    it('should find content by geographic proximity', () => {
      const structuredPOI = new StructuredPOIDto({
        name: 'Times Square',
        type: POIType.LANDMARK,
        location: {
          country: 'USA',
          state: 'NY',
          city: 'New York',
          coordinates: {
            latitude: 40.7580,
            longitude: -73.9855,
          },
        },
      });

      const content = new GeneratedContentDto({
        id: 'times-square',
        content: 'Content about Times Square',
        estimatedDuration: 180,
      });

      service.store(content, 'prompt', structuredPOI);

      // Search near Times Square (within 1km)
      const nearby = service.findByLocation(40.7589, -73.9851, 1, 5);
      assertEquals(nearby.length, 1);
      assertEquals(nearby[0].id, 'times-square');

      // Search far away (should find nothing)
      const farAway = service.findByLocation(34.0522, -118.2437, 1, 5); // Los Angeles
      assertEquals(farAway.length, 0);
    });
  });

  describe('getRecentlyAccessed', () => {
    it('should return recently accessed content', async () => {
      const content1 = new GeneratedContentDto({
        id: 'test-1',
        content: 'Content 1',
        estimatedDuration: 180,
      });

      const content2 = new GeneratedContentDto({
        id: 'test-2',
        content: 'Content 2',
        estimatedDuration: 180,
      });

      service.store(content1, 'prompt1', sampleInputData);
      service.store(content2, 'prompt2', sampleInputData);

      // Access content in specific order
      service.retrieve('test-1');

      await new Promise((resolve) => setTimeout(resolve, 10));

      service.retrieve('test-2');

      const recent = service.getRecentlyAccessed(5);
      assertEquals(recent.length, 2);
      assertEquals(recent[0].id, 'test-2'); // Most recently accessed first
      assertEquals(recent[1].id, 'test-1');
    });
  });

  describe('getMostPopular', () => {
    it('should return most popular content by access count', () => {
      const content1 = new GeneratedContentDto({
        id: 'popular',
        content: 'Popular content',
        estimatedDuration: 180,
      });

      const content2 = new GeneratedContentDto({
        id: 'less-popular',
        content: 'Less popular content',
        estimatedDuration: 180,
      });

      service.store(content1, 'prompt1', sampleInputData);
      service.store(content2, 'prompt2', sampleInputData);

      // Access content1 more times
      service.retrieve('popular');
      service.retrieve('popular');
      service.retrieve('popular');
      service.retrieve('less-popular');

      const popular = service.getMostPopular(5);
      assertEquals(popular.length, 2);
      assertEquals(popular[0].id, 'popular');
      assertEquals(popular[1].id, 'less-popular');
    });
  });

  describe('cache configuration', () => {
    it('should allow updating cache configuration', () => {
      const newConfig = {
        maxItems: 500,
        maxAge: 12 * 60 * 60 * 1000, // 12 hours
        enableSimilarityMatching: false,
      };

      service.updateCacheConfig(newConfig);

      const config = service.getCacheConfig();
      assertEquals(config.maxItems, 500);
      assertEquals(config.maxAge, 12 * 60 * 60 * 1000);
      assertEquals(config.enableSimilarityMatching, false);
    });

    it('should respect similarity matching configuration', () => {
      service.updateCacheConfig({ enableSimilarityMatching: false });

      service.store(sampleContent, samplePrompt, sampleInputData);

      const similar = service.findSimilar(sampleInputData, 5);
      assertEquals(similar.length, 0); // Should return empty when disabled
    });
  });
});
