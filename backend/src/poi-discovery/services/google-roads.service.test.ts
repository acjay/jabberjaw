import { assertEquals, assertRejects } from '@std/assert';
import { describe, it, beforeEach, afterEach } from '@std/testing/bdd';
import { GoogleRoadsService } from './google-roads.service.ts';
import { LocationData } from '../../models/location.model.ts';

// Mock fetch for testing
let originalFetch: typeof globalThis.fetch;
let mockFetch: typeof globalThis.fetch;

describe('GoogleRoadsService', () => {
  let service: GoogleRoadsService;
  let mockApiKey: string;

  beforeEach(() => {
    // Store original fetch
    originalFetch = globalThis.fetch;
    
    // Set up mock API key
    mockApiKey = 'test-api-key';
    Deno.env.set('GOOGLE_ROADS_API_KEY', mockApiKey);
    
    service = new GoogleRoadsService();
  });

  afterEach(() => {
    // Restore original fetch
    globalThis.fetch = originalFetch;
    
    // Clean up environment
    Deno.env.delete('GOOGLE_ROADS_API_KEY');
  });

  describe('constructor', () => {
    it('should initialize with API key from environment', () => {
      assertEquals(service.isConfigured(), true);
    });

    it('should handle missing API key gracefully', () => {
      Deno.env.delete('GOOGLE_ROADS_API_KEY');
      const serviceWithoutKey = new GoogleRoadsService();
      assertEquals(serviceWithoutKey.isConfigured(), false);
    });
  });

  describe('snapToRoads', () => {
    it('should successfully snap location to road', async () => {
      const mockResponse = {
        snappedPoints: [
          {
            location: {
              latitude: 40.7580,
              longitude: -73.9855,
            },
            placeId: 'ChIJmQJIxlVYwokRLgeuocVOGVU',
          },
        ],
      };

      const mockPlaceDetailsResponse = {
        result: {
          name: 'Broadway',
          formatted_address: 'Broadway, New York, NY, USA',
        },
      };

      // Mock fetch to return successful responses
      mockFetch = async (url: string | URL | Request) => {
        const urlString = url.toString();
        
        if (urlString.includes('snapToRoads')) {
          return new Response(JSON.stringify(mockResponse), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        } else if (urlString.includes('place/details')) {
          return new Response(JSON.stringify(mockPlaceDetailsResponse), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        
        return new Response('Not found', { status: 404 });
      };
      
      globalThis.fetch = mockFetch;

      const location: LocationData = {
        latitude: 40.7580,
        longitude: -73.9855,
        timestamp: new Date(),
        accuracy: 10,
      };

      const result = await service.snapToRoads(location);

      assertEquals(result?.roadName, 'Broadway');
      assertEquals(result?.placeId, 'ChIJmQJIxlVYwokRLgeuocVOGVU');
      assertEquals(result?.snappedLocation.latitude, 40.7580);
      assertEquals(result?.snappedLocation.longitude, -73.9855);
      assertEquals(typeof result?.distanceFromOriginal, 'number');
      assertEquals(typeof result?.confidence, 'number');
    });

    it('should return null when no road is found', async () => {
      const mockResponse = {
        snappedPoints: [],
      };

      mockFetch = async () => {
        return new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      };
      
      globalThis.fetch = mockFetch;

      const location: LocationData = {
        latitude: 0,
        longitude: 0,
        timestamp: new Date(),
        accuracy: 10,
      };

      const result = await service.snapToRoads(location);
      assertEquals(result, null);
    });

    it('should handle API errors appropriately', async () => {
      mockFetch = async () => {
        return new Response('Forbidden', { status: 403 });
      };
      
      globalThis.fetch = mockFetch;

      const location: LocationData = {
        latitude: 40.7580,
        longitude: -73.9855,
        timestamp: new Date(),
        accuracy: 10,
      };

      await assertRejects(
        () => service.snapToRoads(location),
        Error,
        'Google Roads API access denied'
      );
    });

    it('should handle rate limiting', async () => {
      mockFetch = async () => {
        return new Response('Too Many Requests', { status: 429 });
      };
      
      globalThis.fetch = mockFetch;

      const location: LocationData = {
        latitude: 40.7580,
        longitude: -73.9855,
        timestamp: new Date(),
        accuracy: 10,
      };

      await assertRejects(
        () => service.snapToRoads(location),
        Error,
        'Google Roads API rate limit exceeded'
      );
    });

    it('should throw error when API key is not configured', async () => {
      Deno.env.delete('GOOGLE_ROADS_API_KEY');
      const serviceWithoutKey = new GoogleRoadsService();

      const location: LocationData = {
        latitude: 40.7580,
        longitude: -73.9855,
        timestamp: new Date(),
        accuracy: 10,
      };

      await assertRejects(
        () => serviceWithoutKey.snapToRoads(location),
        Error,
        'Google Roads API key not configured'
      );
    });
  });

  describe('findNearestRoads', () => {
    it('should find multiple nearest roads', async () => {
      const mockResponse = {
        snappedPoints: [
          {
            location: {
              latitude: 40.7580,
              longitude: -73.9855,
            },
            placeId: 'ChIJmQJIxlVYwokRLgeuocVOGVU',
          },
          {
            location: {
              latitude: 40.7581,
              longitude: -73.9856,
            },
            placeId: 'ChIJmQJIxlVYwokRLgeuocVOGVV',
          },
        ],
      };

      const mockPlaceDetailsResponse = {
        result: {
          name: 'Broadway',
          formatted_address: 'Broadway, New York, NY, USA',
        },
      };

      mockFetch = async (url: string | URL | Request) => {
        const urlString = url.toString();
        
        if (urlString.includes('nearestRoads')) {
          return new Response(JSON.stringify(mockResponse), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        } else if (urlString.includes('place/details')) {
          return new Response(JSON.stringify(mockPlaceDetailsResponse), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        
        return new Response('Not found', { status: 404 });
      };
      
      globalThis.fetch = mockFetch;

      const location: LocationData = {
        latitude: 40.7580,
        longitude: -73.9855,
        timestamp: new Date(),
        accuracy: 10,
      };

      const results = await service.findNearestRoads(location);

      assertEquals(results.length, 2);
      assertEquals(results[0].roadName, 'Broadway');
      assertEquals(results[0].placeId, 'ChIJmQJIxlVYwokRLgeuocVOGVU');
      
      // Results should be sorted by distance (closest first)
      assertEquals(results[0].distanceFromOriginal <= results[1].distanceFromOriginal, true);
    });

    it('should return empty array when no roads are found', async () => {
      const mockResponse = {
        snappedPoints: [],
      };

      mockFetch = async () => {
        return new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      };
      
      globalThis.fetch = mockFetch;

      const location: LocationData = {
        latitude: 0,
        longitude: 0,
        timestamp: new Date(),
        accuracy: 10,
      };

      const results = await service.findNearestRoads(location);
      assertEquals(results.length, 0);
    });
  });

  describe('confidence calculation', () => {
    it('should calculate confidence correctly based on distance', async () => {
      const mockResponse = {
        snappedPoints: [
          {
            location: {
              latitude: 40.7580,
              longitude: -73.9855,
            },
            placeId: 'ChIJmQJIxlVYwokRLgeuocVOGVU',
          },
        ],
      };

      const mockPlaceDetailsResponse = {
        result: {
          name: 'Broadway',
        },
      };

      mockFetch = async (url: string | URL | Request) => {
        const urlString = url.toString();
        
        if (urlString.includes('snapToRoads')) {
          return new Response(JSON.stringify(mockResponse), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        } else if (urlString.includes('place/details')) {
          return new Response(JSON.stringify(mockPlaceDetailsResponse), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        
        return new Response('Not found', { status: 404 });
      };
      
      globalThis.fetch = mockFetch;

      // Test with exact same location (should have high confidence)
      const exactLocation: LocationData = {
        latitude: 40.7580,
        longitude: -73.9855,
        timestamp: new Date(),
        accuracy: 10,
      };

      const result = await service.snapToRoads(exactLocation);
      
      // Should have very high confidence for exact match
      assertEquals(result !== null, true);
      assertEquals(result!.confidence >= 0.9, true);
    });
  });

  describe('testConnection', () => {
    it('should return true for successful connection test', async () => {
      const mockResponse = {
        snappedPoints: [
          {
            location: {
              latitude: 40.7580,
              longitude: -73.9855,
            },
            placeId: 'ChIJmQJIxlVYwokRLgeuocVOGVU',
          },
        ],
      };

      const mockPlaceDetailsResponse = {
        result: {
          name: 'Broadway',
        },
      };

      mockFetch = async (url: string | URL | Request) => {
        const urlString = url.toString();
        
        if (urlString.includes('snapToRoads')) {
          return new Response(JSON.stringify(mockResponse), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        } else if (urlString.includes('place/details')) {
          return new Response(JSON.stringify(mockPlaceDetailsResponse), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        
        return new Response('Not found', { status: 404 });
      };
      
      globalThis.fetch = mockFetch;

      const result = await service.testConnection();
      assertEquals(result, true);
    });

    it('should return false when API key is not configured', async () => {
      Deno.env.delete('GOOGLE_ROADS_API_KEY');
      const serviceWithoutKey = new GoogleRoadsService();

      const result = await serviceWithoutKey.testConnection();
      assertEquals(result, false);
    });

    it('should return false when connection fails', async () => {
      mockFetch = async () => {
        throw new Error('Network error');
      };
      
      globalThis.fetch = mockFetch;

      const result = await service.testConnection();
      assertEquals(result, false);
    });
  });
});