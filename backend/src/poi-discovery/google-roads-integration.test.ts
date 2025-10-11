import { assertEquals } from '@std/assert';
import { describe, it, beforeAll, afterAll } from '@std/testing/bdd';
import { DanetApplication } from '@danet/core';
import { POIDiscoveryModule } from './poi-discovery.module.ts';

describe('Google Roads API Integration', () => {
  let app: DanetApplication;
  let baseUrl: string;

  beforeAll(async () => {
    // Set up test environment with API key
    Deno.env.set('GOOGLE_ROADS_API_KEY', Deno.env.get('GOOGLE_PLACES_API_KEY') || 'test-key');
    
    app = new DanetApplication();
    await app.init(POIDiscoveryModule);
    
    const port = 3003; // Use different port to avoid conflicts
    await app.listen(port);
    baseUrl = `http://localhost:${port}`;
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    Deno.env.delete('GOOGLE_ROADS_API_KEY');
  });

  describe('GET /api/poi/roads/test', () => {
    it('should return configuration status', async () => {
      const response = await fetch(`${baseUrl}/api/poi/roads/test`);
      const data = await response.json();

      assertEquals(response.status, 200);
      assertEquals(typeof data.configured, 'boolean');
      assertEquals(typeof data.connectionTest, 'boolean');
      assertEquals(typeof data.timestamp, 'string');
    });
  });

  describe('POST /api/poi/roads/snap', () => {
    it('should snap location to road when API key is configured', async () => {
      // Only run this test if we have a real API key
      const hasRealApiKey = Deno.env.get('GOOGLE_PLACES_API_KEY') && 
                           Deno.env.get('GOOGLE_PLACES_API_KEY') !== 'test-key';
      
      if (!hasRealApiKey) {
        console.log('Skipping real API test - no valid API key configured');
        return;
      }

      const testLocation = {
        latitude: 40.7580, // Times Square, NYC - known location
        longitude: -73.9855,
      };

      const response = await fetch(`${baseUrl}/api/poi/roads/snap`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testLocation),
      });

      const data = await response.json();

      assertEquals(response.status, 200);
      assertEquals(data.location.latitude, testLocation.latitude);
      assertEquals(data.location.longitude, testLocation.longitude);
      assertEquals(typeof data.timestamp, 'string');
      
      // If roadInfo is not null, it should have the expected structure
      if (data.roadInfo) {
        assertEquals(typeof data.roadInfo.placeId, 'string');
        assertEquals(typeof data.roadInfo.snappedLocation.latitude, 'number');
        assertEquals(typeof data.roadInfo.snappedLocation.longitude, 'number');
        assertEquals(typeof data.roadInfo.distanceFromOriginal, 'number');
        assertEquals(typeof data.roadInfo.confidence, 'number');
      }
    });

    it('should handle invalid coordinates', async () => {
      const invalidLocation = {
        latitude: 91, // Invalid latitude
        longitude: -73.9855,
      };

      const response = await fetch(`${baseUrl}/api/poi/roads/snap`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invalidLocation),
      });

      assertEquals(response.status, 400);
    });

    it('should handle missing coordinates', async () => {
      const response = await fetch(`${baseUrl}/api/poi/roads/snap`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      assertEquals(response.status, 400);
    });
  });

  describe('POST /api/poi/roads/nearest', () => {
    it('should find nearest roads when API key is configured', async () => {
      // Only run this test if we have a real API key
      const hasRealApiKey = Deno.env.get('GOOGLE_PLACES_API_KEY') && 
                           Deno.env.get('GOOGLE_PLACES_API_KEY') !== 'test-key';
      
      if (!hasRealApiKey) {
        console.log('Skipping real API test - no valid API key configured');
        return;
      }

      const testLocation = {
        latitude: 40.7580, // Times Square, NYC - known location
        longitude: -73.9855,
      };

      const response = await fetch(`${baseUrl}/api/poi/roads/nearest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testLocation),
      });

      const data = await response.json();

      assertEquals(response.status, 200);
      assertEquals(data.location.latitude, testLocation.latitude);
      assertEquals(data.location.longitude, testLocation.longitude);
      assertEquals(typeof data.timestamp, 'string');
      assertEquals(Array.isArray(data.roads), true);
      
      // If roads are found, they should have the expected structure
      if (data.roads.length > 0) {
        const road = data.roads[0];
        assertEquals(typeof road.placeId, 'string');
        assertEquals(typeof road.snappedLocation.latitude, 'number');
        assertEquals(typeof road.snappedLocation.longitude, 'number');
        assertEquals(typeof road.distanceFromOriginal, 'number');
        assertEquals(typeof road.confidence, 'number');
      }
    });

    it('should handle invalid coordinates', async () => {
      const invalidLocation = {
        latitude: -91, // Invalid latitude
        longitude: -73.9855,
      };

      const response = await fetch(`${baseUrl}/api/poi/roads/nearest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invalidLocation),
      });

      assertEquals(response.status, 400);
    });
  });
});