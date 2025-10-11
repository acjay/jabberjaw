import { assertEquals, assertExists } from '@std/assert';
import { afterEach, beforeEach, describe, it } from '@std/testing/bdd';
import { DanetApplication } from '@danet/core';
import { ContentGenerationModule } from './content-generation.module.ts';
import { ContentStyle } from './dto/content-request.dto.ts';
import { POIType } from './dto/structured-poi.dto.ts';

describe('ContentGenerationController API Endpoints', () => {
  let app: DanetApplication;
  let baseUrl: string;

  beforeEach(async () => {
    app = new DanetApplication();
    await app.init(ContentGenerationModule);

    // Enable CORS for testing
    app.enableCors({
      origin: '*',
      allowHeaders: ['Content-Type', 'Authorization', 'Accept'],
      credentials: true,
    });

    const port = 3001 + Math.floor(Math.random() * 1000); // Random port to avoid conflicts
    await app.listen(port);
    baseUrl = `http://localhost:${port}`;
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('POST /api/content/generate', () => {
    it('should generate content with text description input', async () => {
      const requestBody = {
        input: {
          description: 'The town of Metuchen, NJ, USA',
        },
        targetDuration: 180,
        contentStyle: ContentStyle.HISTORICAL,
      };

      const response = await fetch(`${baseUrl}/api/content/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      assertEquals(response.status, 200);

      const result = await response.json();
      assertExists(result.id);
      assertExists(result.content);
      assertExists(result.estimatedDuration);
      assertEquals(typeof result.content, 'string');
      assertEquals(typeof result.estimatedDuration, 'number');
    });

    it('should generate content with structured POI input', async () => {
      const requestBody = {
        input: {
          name: 'Morton Arboretum',
          type: POIType.ARBORETUM,
          location: {
            country: 'USA',
            state: 'Illinois',
            city: 'Lisle',
            coordinates: {
              latitude: 41.8158,
              longitude: -88.0702,
            },
          },
          description: 'A beautiful arboretum with diverse tree collections',
          context: 'Located in DuPage County',
        },
        targetDuration: 180,
        contentStyle: ContentStyle.CULTURAL,
      };

      const response = await fetch(`${baseUrl}/api/content/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      assertEquals(response.status, 200);

      const result = await response.json();
      assertExists(result.id);
      assertExists(result.content);
      assertExists(result.estimatedDuration);
      assertEquals(typeof result.content, 'string');
      assertEquals(typeof result.estimatedDuration, 'number');
    });

    it('should return 400 for invalid request body', async () => {
      const requestBody = {
        input: null, // Invalid input
      };

      const response = await fetch(`${baseUrl}/api/content/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      await response.text(); // Consume response body
      assertEquals(response.status, 400);
    });

    it('should return 400 for missing input', async () => {
      const requestBody = {
        targetDuration: 180,
      };

      const response = await fetch(`${baseUrl}/api/content/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      await response.text(); // Consume response body
      assertEquals(response.status, 400);
    });

    it('should handle CORS preflight request', async () => {
      const response = await fetch(`${baseUrl}/api/content/generate`, {
        method: 'OPTIONS',
        headers: {
          'Origin': 'http://localhost:3000',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type',
        },
      });

      // Consume the response body to prevent resource leaks
      await response.text();

      assertEquals(response.status, 204); // Danet returns 204 for OPTIONS
      assertExists(response.headers.get('Access-Control-Allow-Origin'));
      assertExists(response.headers.get('Access-Control-Allow-Methods'));
    });
  });

  describe('GET /api/content/:id', () => {
    it('should retrieve generated content by ID', async () => {
      // First generate content
      const generateBody = {
        input: {
          description: 'Test location for retrieval',
        },
      };

      const generateResponse = await fetch(`${baseUrl}/api/content/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(generateBody),
      });

      const generated = await generateResponse.json();
      const contentId = generated.id;

      // Then retrieve it
      const retrieveResponse = await fetch(`${baseUrl}/api/content/${contentId}`);

      assertEquals(retrieveResponse.status, 200);

      const retrieved = await retrieveResponse.json();
      assertEquals(retrieved.id, contentId);
      assertExists(retrieved.content);
      assertExists(retrieved.prompt);
      assertExists(retrieved.generatedAt);
    });

    it('should return 404 for non-existent content ID', async () => {
      const nonExistentId = 'non-existent-id';

      const response = await fetch(`${baseUrl}/api/content/${nonExistentId}`);

      await response.text(); // Consume response body
      assertEquals(response.status, 404);
    });

    it('should return 200 for list endpoint when accessing empty path', async () => {
      const response = await fetch(`${baseUrl}/api/content/`);

      // This hits the list endpoint, which should return 200 with an array
      assertEquals(response.status, 200);
      const result = await response.json();
      assertEquals(Array.isArray(result), true);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON in POST request', async () => {
      const response = await fetch(`${baseUrl}/api/content/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: 'invalid json',
      });

      // Consume the response body to prevent resource leaks
      await response.text();

      assertEquals(response.status, 500); // Danet returns 500 for JSON parse errors
    });

    it('should validate content style enum', async () => {
      const requestBody = {
        input: {
          description: 'Test location',
        },
        contentStyle: 'invalid_style',
      };

      const response = await fetch(`${baseUrl}/api/content/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      await response.text(); // Consume response body
      assertEquals(response.status, 400);
    });

    it('should validate target duration range', async () => {
      const requestBody = {
        input: {
          description: 'Test location',
        },
        targetDuration: 10, // Too short
      };

      const response = await fetch(`${baseUrl}/api/content/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      await response.text(); // Consume response body
      assertEquals(response.status, 400);
    });
  });

  describe('Response Format Validation', () => {
    it('should return properly formatted GeneratedContentDto', async () => {
      const requestBody = {
        input: {
          description: 'Test location for format validation',
        },
      };

      const response = await fetch(`${baseUrl}/api/content/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

      // Validate required fields
      assertExists(result.id);
      assertExists(result.content);
      assertExists(result.estimatedDuration);

      // Validate field types
      assertEquals(typeof result.id, 'string');
      assertEquals(typeof result.content, 'string');
      assertEquals(typeof result.estimatedDuration, 'number');

      // Validate optional fields if present
      if (result.prompt) {
        assertEquals(typeof result.prompt, 'string');
      }
      if (result.generatedAt) {
        assertEquals(typeof result.generatedAt, 'string'); // ISO date string
      }
      if (result.sources) {
        assertEquals(Array.isArray(result.sources), true);
      }
    });

    it('should return properly formatted StoredContent for GET endpoint', async () => {
      // Generate content first
      const generateBody = {
        input: {
          description: 'Test location for stored content format',
        },
      };

      const generateResponse = await fetch(`${baseUrl}/api/content/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(generateBody),
      });

      const generated = await generateResponse.json();

      // Retrieve stored content
      const retrieveResponse = await fetch(`${baseUrl}/api/content/${generated.id}`);
      const stored = await retrieveResponse.json();

      // Validate StoredContent format
      assertExists(stored.id);
      assertExists(stored.content);
      assertExists(stored.prompt);
      assertExists(stored.generatedAt);

      assertEquals(typeof stored.id, 'string');
      assertEquals(typeof stored.content, 'string');
      assertEquals(typeof stored.prompt, 'string');
      assertEquals(typeof stored.generatedAt, 'string');
    });
  });
});
