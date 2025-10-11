import { assert, assertEquals, assertFalse } from '@std/assert';
import { beforeEach, describe, it } from '@std/testing/bdd';
import {
  type ContentRequest,
  createContentRequest,
  type GeneratedContent,
  generatedContentToStoredContent,
  isContentRequest,
  isGeneratedContent,
  isStoredContent,
  type StoredContent,
  validateContentRequest,
  validateGeneratedContent,
  validateStoredContent,
} from './content.model.ts';
import { type LocationData } from './location.model.ts';
import { POICategory, type PointOfInterest } from './poi.model.ts';

describe('Content Generation Models', () => {
  let mockLocation: LocationData;
  let mockPOI: PointOfInterest;
  let mockContentRequest: ContentRequest;
  let mockGeneratedContent: GeneratedContent;
  let mockStoredContent: StoredContent;

  beforeEach(() => {
    mockLocation = {
      latitude: 40.7128,
      longitude: -74.0060,
      timestamp: new Date('2024-01-01T12:00:00Z'),
      accuracy: 10,
    };

    mockPOI = {
      id: 'poi-1',
      name: 'Test Town',
      category: POICategory.TOWN,
      location: {
        latitude: 40.7128,
        longitude: -74.0060,
      },
      description: 'A test town for unit testing',
      metadata: {
        population: 50000,
        foundedYear: 1850,
        significance: ['historical', 'cultural'],
      },
    };

    mockContentRequest = {
      pois: [mockPOI],
      userLocation: mockLocation,
      previousSegments: ['segment-1', 'segment-2'],
      targetDuration: 180,
    };

    mockGeneratedContent = {
      id: 'content-1',
      narrative: 'This is a test narrative about the location.',
      estimatedDuration: 175,
      sources: ['source1.com', 'source2.com'],
      poiReferences: ['poi-1'],
      prompt: 'Generate content about Test Town',
      generatedAt: new Date('2024-01-01T12:00:00Z'),
      location: mockLocation,
    };

    mockStoredContent = {
      id: 'content-1',
      narrative: 'This is a test narrative about the location.',
      prompt: 'Generate content about Test Town',
      pois: [mockPOI],
      location: mockLocation,
      estimatedDuration: 175,
      sources: ['source1.com', 'source2.com'],
      poiReferences: ['poi-1'],
      generatedAt: new Date('2024-01-01T12:00:00Z'),
      audioUrl: 'https://example.com/audio.mp3',
    };
  });

  describe('ContentRequest validation', () => {
    it('should validate a valid ContentRequest', () => {
      assert(validateContentRequest(mockContentRequest));
      assert(isContentRequest(mockContentRequest));
    });

    it('should reject ContentRequest with empty POIs array', () => {
      const invalidRequest = { ...mockContentRequest, pois: [] };
      assertFalse(validateContentRequest(invalidRequest));
      assertFalse(isContentRequest(invalidRequest));
    });

    it('should reject ContentRequest with invalid target duration', () => {
      const invalidRequest = { ...mockContentRequest, targetDuration: -1 };
      assertFalse(validateContentRequest(invalidRequest));
      assertFalse(isContentRequest(invalidRequest));
    });

    it('should reject ContentRequest with non-array previousSegments', () => {
      const invalidRequest = { ...mockContentRequest, previousSegments: 'not-array' as any };
      assertFalse(validateContentRequest(invalidRequest));
      assertFalse(isContentRequest(invalidRequest));
    });

    it('should reject ContentRequest with missing userLocation', () => {
      const invalidRequest = { ...mockContentRequest, userLocation: null as any };
      assertFalse(validateContentRequest(invalidRequest));
      assertFalse(isContentRequest(invalidRequest));
    });
  });

  describe('GeneratedContent validation', () => {
    it('should validate a valid GeneratedContent', () => {
      assert(validateGeneratedContent(mockGeneratedContent));
      assert(isGeneratedContent(mockGeneratedContent));
    });

    it('should reject GeneratedContent with empty id', () => {
      const invalidContent = { ...mockGeneratedContent, id: '' };
      assertFalse(validateGeneratedContent(invalidContent));
      assertFalse(isGeneratedContent(invalidContent));
    });

    it('should reject GeneratedContent with empty narrative', () => {
      const invalidContent = { ...mockGeneratedContent, narrative: '' };
      assertFalse(validateGeneratedContent(invalidContent));
      assertFalse(isGeneratedContent(invalidContent));
    });

    it('should reject GeneratedContent with invalid duration', () => {
      const invalidContent = { ...mockGeneratedContent, estimatedDuration: 0 };
      assertFalse(validateGeneratedContent(invalidContent));
      assertFalse(isGeneratedContent(invalidContent));
    });

    it('should reject GeneratedContent with non-array sources', () => {
      const invalidContent = { ...mockGeneratedContent, sources: 'not-array' as any };
      assertFalse(validateGeneratedContent(invalidContent));
      assertFalse(isGeneratedContent(invalidContent));
    });

    it('should reject GeneratedContent with invalid date', () => {
      const invalidContent = { ...mockGeneratedContent, generatedAt: new Date('invalid') };
      assertFalse(validateGeneratedContent(invalidContent));
      assertFalse(isGeneratedContent(invalidContent));
    });
  });

  describe('StoredContent validation', () => {
    it('should validate a valid StoredContent', () => {
      assert(validateStoredContent(mockStoredContent));
      assert(isStoredContent(mockStoredContent));
    });

    it('should validate StoredContent without optional fields', () => {
      const contentWithoutOptionals = { ...mockStoredContent };
      delete contentWithoutOptionals.audioUrl;
      assert(validateStoredContent(contentWithoutOptionals));
      assert(isStoredContent(contentWithoutOptionals));
    });

    it('should reject StoredContent with empty POIs array', () => {
      const invalidContent = { ...mockStoredContent, pois: [] };
      assertFalse(validateStoredContent(invalidContent));
      assertFalse(isStoredContent(invalidContent));
    });
  });

  describe('Helper functions', () => {
    it('should convert GeneratedContent to StoredContent', () => {
      const audioUrl = 'https://example.com/audio.mp3';
      const storedContent = generatedContentToStoredContent(
        mockGeneratedContent,
        [mockPOI],
        audioUrl,
      );

      assertEquals(storedContent.id, mockGeneratedContent.id);
      assertEquals(storedContent.narrative, mockGeneratedContent.narrative);
      assertEquals(storedContent.prompt, mockGeneratedContent.prompt);
      assertEquals(storedContent.pois, [mockPOI]);
      assertEquals(storedContent.audioUrl, audioUrl);
      assertEquals(storedContent.estimatedDuration, mockGeneratedContent.estimatedDuration);
      assertEquals(storedContent.sources, mockGeneratedContent.sources);
      assertEquals(storedContent.poiReferences, mockGeneratedContent.poiReferences);
      assertEquals(storedContent.generatedAt, mockGeneratedContent.generatedAt);
      assertEquals(storedContent.location, mockGeneratedContent.location);
    });

    it('should convert GeneratedContent to StoredContent without audioUrl', () => {
      const storedContent = generatedContentToStoredContent(
        mockGeneratedContent,
        [mockPOI],
      );

      assertEquals(storedContent.audioUrl, undefined);
      assert(validateStoredContent(storedContent));
    });

    it('should create ContentRequest with default values', () => {
      const request = createContentRequest([mockPOI], mockLocation);

      assertEquals(request.pois, [mockPOI]);
      assertEquals(request.userLocation, mockLocation);
      assertEquals(request.previousSegments, []);
      assertEquals(request.targetDuration, 180);
      assert(validateContentRequest(request));
    });

    it('should create ContentRequest with custom values', () => {
      const previousSegments = ['seg-1', 'seg-2'];
      const targetDuration = 240;
      const request = createContentRequest(
        [mockPOI],
        mockLocation,
        previousSegments,
        targetDuration,
      );

      assertEquals(request.pois, [mockPOI]);
      assertEquals(request.userLocation, mockLocation);
      assertEquals(request.previousSegments, previousSegments);
      assertEquals(request.targetDuration, targetDuration);
      assert(validateContentRequest(request));
    });
  });

  describe('Serialization and deserialization', () => {
    it('should serialize and deserialize ContentRequest correctly', () => {
      const serialized = JSON.stringify(mockContentRequest);
      const parsed = JSON.parse(serialized);
      
      // Reconstruct dates and nested objects
      const deserialized: ContentRequest = {
        ...parsed,
        userLocation: {
          ...parsed.userLocation,
          timestamp: new Date(parsed.userLocation.timestamp)
        }
      };
      
      assert(validateContentRequest(deserialized));
      assertEquals(deserialized.pois.length, mockContentRequest.pois.length);
      assertEquals(deserialized.targetDuration, mockContentRequest.targetDuration);
      assertEquals(deserialized.previousSegments, mockContentRequest.previousSegments);
    });

    it('should serialize and deserialize GeneratedContent correctly', () => {
      const serialized = JSON.stringify(mockGeneratedContent);
      const parsed = JSON.parse(serialized);
      
      // Reconstruct dates
      const deserialized: GeneratedContent = {
        ...parsed,
        generatedAt: new Date(parsed.generatedAt),
        location: {
          ...parsed.location,
          timestamp: new Date(parsed.location.timestamp)
        }
      };
      
      assert(validateGeneratedContent(deserialized));
      assertEquals(deserialized.id, mockGeneratedContent.id);
      assertEquals(deserialized.narrative, mockGeneratedContent.narrative);
      assertEquals(deserialized.estimatedDuration, mockGeneratedContent.estimatedDuration);
      assertEquals(deserialized.sources, mockGeneratedContent.sources);
      assertEquals(deserialized.poiReferences, mockGeneratedContent.poiReferences);
    });

    it('should serialize and deserialize StoredContent correctly', () => {
      const serialized = JSON.stringify(mockStoredContent);
      const parsed = JSON.parse(serialized);
      
      // Reconstruct dates and nested objects
      const deserialized: StoredContent = {
        ...parsed,
        generatedAt: new Date(parsed.generatedAt),
        location: {
          ...parsed.location,
          timestamp: new Date(parsed.location.timestamp)
        }
      };
      
      assert(validateStoredContent(deserialized));
      assertEquals(deserialized.id, mockStoredContent.id);
      assertEquals(deserialized.narrative, mockStoredContent.narrative);
      assertEquals(deserialized.pois.length, mockStoredContent.pois.length);
      assertEquals(deserialized.audioUrl, mockStoredContent.audioUrl);
    });

    it('should handle complex POI data during content serialization', () => {
      const complexPOI: PointOfInterest = {
        id: 'complex-poi',
        name: 'Complex Test Location',
        category: POICategory.CULTURAL_CENTER,
        location: { latitude: 40.7589, longitude: -73.9851 },
        description: 'A complex location with extensive metadata',
        metadata: {
          population: 100000,
          foundedYear: 1825,
          elevation: 50,
          significance: ['cultural', 'historical', 'architectural', 'educational']
        }
      };

      const complexContent: StoredContent = {
        ...mockStoredContent,
        pois: [complexPOI, mockPOI],
        sources: ['source1.com', 'source2.org', 'source3.edu'],
        poiReferences: ['complex-poi', 'poi-1']
      };

      const serialized = JSON.stringify(complexContent);
      const parsed = JSON.parse(serialized);
      const deserialized: StoredContent = {
        ...parsed,
        generatedAt: new Date(parsed.generatedAt),
        location: {
          ...parsed.location,
          timestamp: new Date(parsed.location.timestamp)
        }
      };

      assert(validateStoredContent(deserialized));
      assertEquals(deserialized.pois.length, 2);
      assertEquals(deserialized.sources.length, 3);
      assertEquals(deserialized.poiReferences.length, 2);
    });
  });

  describe('Content model boundary conditions', () => {
    it('should validate content with various duration values', () => {
      const durationTests = [1, 30, 60, 120, 180, 240, 300, 600, 3600];

      for (const duration of durationTests) {
        const content: GeneratedContent = {
          ...mockGeneratedContent,
          estimatedDuration: duration
        };

        assert(validateGeneratedContent(content), 
          `Failed to validate content with duration: ${duration}`);
      }
    });

    it('should reject content with invalid duration values', () => {
      const invalidDurations = [0, -1, -60, -180];

      for (const duration of invalidDurations) {
        const content: GeneratedContent = {
          ...mockGeneratedContent,
          estimatedDuration: duration
        };

        assertFalse(validateGeneratedContent(content), 
          `Should reject content with invalid duration: ${duration}`);
      }
    });

    it('should validate content with empty arrays', () => {
      const contentWithEmptyArrays: GeneratedContent = {
        ...mockGeneratedContent,
        sources: [],
        poiReferences: []
      };

      assert(validateGeneratedContent(contentWithEmptyArrays));
    });

    it('should validate content with large arrays', () => {
      const largeSources = Array.from({ length: 100 }, (_, i) => `source${i}.com`);
      const largePOIRefs = Array.from({ length: 50 }, (_, i) => `poi-${i}`);

      const contentWithLargeArrays: GeneratedContent = {
        ...mockGeneratedContent,
        sources: largeSources,
        poiReferences: largePOIRefs
      };

      assert(validateGeneratedContent(contentWithLargeArrays));
      assertEquals(contentWithLargeArrays.sources.length, 100);
      assertEquals(contentWithLargeArrays.poiReferences.length, 50);
    });

    it('should validate StoredContent with various audioUrl formats', () => {
      const audioUrlTests = [
        'https://example.com/audio.mp3',
        'https://cdn.example.com/path/to/audio.wav',
        'https://storage.googleapis.com/bucket/audio.m4a',
        'https://s3.amazonaws.com/bucket/audio.ogg'
      ];

      for (const audioUrl of audioUrlTests) {
        const content: StoredContent = {
          ...mockStoredContent,
          audioUrl
        };

        assert(validateStoredContent(content), 
          `Failed to validate content with audioUrl: ${audioUrl}`);
      }
    });

    it('should reject StoredContent with invalid audioUrl', () => {
      const invalidAudioUrls = ['', '   ']; // Only empty/whitespace strings are invalid

      for (const audioUrl of invalidAudioUrls) {
        const content: StoredContent = {
          ...mockStoredContent,
          audioUrl
        };

        assertFalse(validateStoredContent(content), 
          `Should reject content with invalid audioUrl: "${audioUrl}"`);
      }
    });

    it('should accept StoredContent with any non-empty audioUrl string', () => {
      // The validation only checks for non-empty strings, not URL format
      const validAudioUrls = ['not-a-url', 'simple-string', 'audio123'];

      for (const audioUrl of validAudioUrls) {
        const content: StoredContent = {
          ...mockStoredContent,
          audioUrl
        };

        assert(validateStoredContent(content), 
          `Should accept content with audioUrl: ${audioUrl}`);
      }
    });
  });

  describe('Edge cases', () => {
    it('should handle null and undefined inputs gracefully', () => {
      assertFalse(isContentRequest(null));
      assertFalse(isContentRequest(undefined));
      assertFalse(isGeneratedContent(null));
      assertFalse(isGeneratedContent(undefined));
      assertFalse(isStoredContent(null));
      assertFalse(isStoredContent(undefined));
    });

    it('should handle non-object inputs gracefully', () => {
      assertFalse(isContentRequest('string'));
      assertFalse(isContentRequest(123));
      assertFalse(isGeneratedContent('string'));
      assertFalse(isGeneratedContent(123));
      assertFalse(isStoredContent('string'));
      assertFalse(isStoredContent(123));
    });

    it('should validate StoredContent with audioUrl as undefined', () => {
      const contentWithUndefinedAudioUrl = {
        ...mockStoredContent,
        audioUrl: undefined,
      };
      assert(validateStoredContent(contentWithUndefinedAudioUrl));
      assert(isStoredContent(contentWithUndefinedAudioUrl));
    });

    it('should handle whitespace-only strings appropriately', () => {
      const whitespaceTests = ['', '   ', '\t', '\n', '\r\n'];

      for (const whitespace of whitespaceTests) {
        const invalidContent: GeneratedContent = {
          ...mockGeneratedContent,
          id: whitespace
        };

        assertFalse(validateGeneratedContent(invalidContent), 
          `Should reject content with whitespace-only id: "${whitespace}"`);
      }
    });

    it('should validate content with special characters in text fields', () => {
      const specialCharacterTests = [
        'Content with émojis 🚗🗺️',
        'Content with "quotes" and \'apostrophes\'',
        'Content with newlines\nand\ttabs',
        'Content with unicode: café, naïve, résumé',
        'Content with symbols: @#$%^&*()_+-=[]{}|;:,.<>?'
      ];

      for (const narrative of specialCharacterTests) {
        const content: GeneratedContent = {
          ...mockGeneratedContent,
          narrative
        };

        assert(validateGeneratedContent(content), 
          `Failed to validate content with special characters: ${narrative.substring(0, 50)}...`);
      }
    });
  });
});
