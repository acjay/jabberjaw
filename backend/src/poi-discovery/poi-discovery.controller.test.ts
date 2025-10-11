import { assert, assertEquals, assertExists } from '@std/assert';
import { afterAll, beforeAll, describe, it } from '@std/testing/bdd';
import { DanetApplication } from '@danet/core';
import { POIDiscoveryModule } from './poi-discovery.module.ts';

describe('POIDiscoveryController API Endpoints', () => {
  let app: DanetApplication;
  let baseUrl: string;

  beforeAll(async () => {
    app = new DanetApplication();
    await app.init(POIDiscoveryModule);
    const port = 3002;
    await app.listen(port);
    baseUrl = `http://localhost:${port}`;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/poi/discover', () => {
    it('should discover POIs for valid location', async () => {
      const requestData = {
        latitude: 40.7128,
        longitude: -74.0060,
        radiusMeters: 5000,
        maxResults: 10,
      };

      const response = await fetch(`${baseUrl}/api/poi/discover`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      assertEquals(response.status, 200);

      const result = await response.json();

      // Verify response structure
      assertExists(result.pois);
      assertExists(result.location);
      assertExists(result.searchRadius);
      assertExists(result.totalFound);
      assertExists(result.timestamp);

      assert(Array.isArray(result.pois));
      assertEquals(result.location.latitude, requestData.latitude);
      assertEquals(result.location.longitude, requestData.longitude);
      assertEquals(result.searchRadius, requestData.radiusMeters);
      assertEquals(result.totalFound, result.pois.length);

      // Verify POI structure
      if (result.pois.length > 0) {
        const firstPoi = result.pois[0];
        assertExists(firstPoi.id);
        assertExists(firstPoi.name);
        assertExists(firstPoi.category);
        assertExists(firstPoi.location);
        assertExists(firstPoi.description);
        assertExists(firstPoi.metadata);
      }
    });

    it('should use default values when optional parameters are omitted', async () => {
      const requestData = {
        latitude: 37.7749,
        longitude: -122.4194,
      };

      const response = await fetch(`${baseUrl}/api/poi/discover`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      assertEquals(response.status, 200);

      const result = await response.json();

      // Should use default radius of 5000m
      assertEquals(result.searchRadius, 5000);

      // Should return POIs (mock data since no API keys configured)
      assert(Array.isArray(result.pois));
      assert(result.pois.length > 0);
    });

    it('should sort POIs by significance when requested', async () => {
      const requestData = {
        latitude: 40.7128,
        longitude: -74.0060,
        sortBySignificance: true,
      };

      const response = await fetch(`${baseUrl}/api/poi/discover`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      assertEquals(response.status, 200);

      const result = await response.json();

      // Should return POIs with significance scores
      assert(Array.isArray(result.pois));
      assert(result.pois.length > 0);

      // Verify POIs have significance scores
      for (const poi of result.pois) {
        assertExists(poi.metadata.significanceScore);
        assert(typeof poi.metadata.significanceScore === 'number');
        assert(poi.metadata.significanceScore >= 0 && poi.metadata.significanceScore <= 100);
      }

      // Verify POIs are sorted by significance (descending)
      if (result.pois.length > 1) {
        for (let i = 0; i < result.pois.length - 1; i++) {
          const currentScore = result.pois[i].metadata.significanceScore;
          const nextScore = result.pois[i + 1].metadata.significanceScore;
          assert(
            currentScore >= nextScore,
            `POI at index ${i} should have higher or equal significance than POI at index ${i + 1}`,
          );
        }
      }
    });

    it('should return 400 for invalid latitude', async () => {
      const requestData = {
        latitude: 999, // Invalid latitude
        longitude: -74.0060,
      };

      const response = await fetch(`${baseUrl}/api/poi/discover`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      assertEquals(response.status, 400);
      await response.text(); // Consume response body
    });

    it('should return 400 for invalid longitude', async () => {
      const requestData = {
        latitude: 40.7128,
        longitude: 999, // Invalid longitude
      };

      const response = await fetch(`${baseUrl}/api/poi/discover`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      assertEquals(response.status, 400);
      await response.text(); // Consume response body
    });

    it('should return 400 for invalid radius', async () => {
      const requestData = {
        latitude: 40.7128,
        longitude: -74.0060,
        radiusMeters: 99, // Too small
      };

      const response = await fetch(`${baseUrl}/api/poi/discover`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      assertEquals(response.status, 400);
      await response.text(); // Consume response body
    });

    it('should return 400 for invalid maxResults', async () => {
      const requestData = {
        latitude: 40.7128,
        longitude: -74.0060,
        maxResults: 0, // Too small
      };

      const response = await fetch(`${baseUrl}/api/poi/discover`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      assertEquals(response.status, 400);
      await response.text(); // Consume response body
    });
  });

  describe('POST /api/poi/filter', () => {
    it('should filter POIs by distance', async () => {
      // First discover some POIs
      const discoverData = {
        latitude: 40.7128,
        longitude: -74.0060,
      };

      const discoverResponse = await fetch(`${baseUrl}/api/poi/discover`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(discoverData),
      });

      const discoverResult = await discoverResponse.json();

      // Now filter them
      const filterData = {
        centerLocation: {
          latitude: 40.7128,
          longitude: -74.0060,
        },
        pois: discoverResult.pois,
        maxDistanceMeters: 1000,
      };

      const filterResponse = await fetch(`${baseUrl}/api/poi/filter`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(filterData),
      });

      assertEquals(filterResponse.status, 200);

      const filterResult = await filterResponse.json();

      // Verify response structure
      assertExists(filterResult.pois);
      assertExists(filterResult.location);
      assertExists(filterResult.searchRadius);
      assertEquals(filterResult.searchRadius, 1000);

      // Filtered results should be <= original results
      assert(filterResult.pois.length <= discoverResult.pois.length);
    });

    it('should return 400 for missing required fields', async () => {
      const invalidData = {
        centerLocation: {
          latitude: 40.7128,
          longitude: -74.0060,
        },
        // Missing pois and maxDistanceMeters
      };

      const response = await fetch(`${baseUrl}/api/poi/filter`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invalidData),
      });

      assertEquals(response.status, 400);
      await response.text(); // Consume response body
    });
  });

  describe('GET /api/poi/categories', () => {
    it('should return POI categories and groups', async () => {
      const response = await fetch(`${baseUrl}/api/poi/categories`);

      assertEquals(response.status, 200);

      const result = await response.json();

      // Verify response structure
      assertExists(result.categories);
      assertExists(result.groups);

      assert(Array.isArray(result.categories));
      assert(result.categories.length > 0);

      // Verify groups structure
      assert(typeof result.groups === 'object');
      assert(Object.keys(result.groups).length > 0);

      // Verify each group contains categories
      for (const [groupName, categories] of Object.entries(result.groups)) {
        assert(typeof groupName === 'string');
        assert(Array.isArray(categories));
        assert(categories.length > 0);
      }
    });
  });

  describe('GET /api/poi/health', () => {
    it('should return health status', async () => {
      const response = await fetch(`${baseUrl}/api/poi/health`);

      assertEquals(response.status, 200);

      const result = await response.json();

      // Verify response structure
      assertExists(result.status);
      assertExists(result.service);
      assertExists(result.timestamp);

      assertEquals(result.status, 'healthy');
      assertEquals(result.service, 'poi-discovery');
      assert(typeof result.timestamp === 'string');
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON in POST requests', async () => {
      const response = await fetch(`${baseUrl}/api/poi/discover`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: 'invalid json',
      });

      assertEquals(response.status, 500); // Framework handles malformed JSON as 500
      await response.text(); // Consume response body
    });

    it('should handle missing request body', async () => {
      const response = await fetch(`${baseUrl}/api/poi/discover`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      assertEquals(response.status, 400);
      await response.text(); // Consume response body
    });
  });
});
