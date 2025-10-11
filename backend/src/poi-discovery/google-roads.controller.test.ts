import { assertEquals, assertRejects } from '@std/assert';
import { describe, it, beforeEach, afterEach } from '@std/testing/bdd';
import { GoogleRoadsController } from './google-roads.controller.ts';
import { GoogleRoadsService } from './services/google-roads.service.ts';
import { HttpException } from '@danet/core';

// Mock GoogleRoadsService for testing
class MockGoogleRoadsService {
  private configured = true;
  private connectionTestResult = true;

  setConfigured(configured: boolean) {
    this.configured = configured;
  }

  setConnectionTestResult(result: boolean) {
    this.connectionTestResult = result;
  }

  isConfigured(): boolean {
    return this.configured;
  }

  async testConnection(): Promise<boolean> {
    return this.connectionTestResult;
  }

  async snapToRoads(location: any) {
    if (!this.configured) {
      throw new Error('Google Roads API key not configured');
    }

    // Mock successful response
    return {
      roadName: 'Broadway',
      placeId: 'ChIJmQJIxlVYwokRLgeuocVOGVU',
      snappedLocation: {
        latitude: location.latitude,
        longitude: location.longitude,
      },
      originalLocation: {
        latitude: location.latitude,
        longitude: location.longitude,
      },
      distanceFromOriginal: 0,
      confidence: 1.0,
    };
  }

  async findNearestRoads(location: any) {
    if (!this.configured) {
      throw new Error('Google Roads API key not configured');
    }

    // Mock successful response with multiple roads
    return [
      {
        roadName: 'Broadway',
        placeId: 'ChIJmQJIxlVYwokRLgeuocVOGVU',
        snappedLocation: {
          latitude: location.latitude,
          longitude: location.longitude,
        },
        originalLocation: {
          latitude: location.latitude,
          longitude: location.longitude,
        },
        distanceFromOriginal: 0,
        confidence: 1.0,
      },
      {
        roadName: '7th Avenue',
        placeId: 'ChIJmQJIxlVYwokRLgeuocVOGVV',
        snappedLocation: {
          latitude: location.latitude + 0.001,
          longitude: location.longitude,
        },
        originalLocation: {
          latitude: location.latitude,
          longitude: location.longitude,
        },
        distanceFromOriginal: 111,
        confidence: 0.89,
      },
    ];
  }
}

describe('GoogleRoadsController', () => {
  let controller: GoogleRoadsController;
  let mockService: MockGoogleRoadsService;

  beforeEach(() => {
    mockService = new MockGoogleRoadsService();
    controller = new GoogleRoadsController(mockService as any);
  });

  describe('testConnection', () => {
    it('should return configuration and connection status', async () => {
      const result = await controller.testConnection();

      assertEquals(result.configured, true);
      assertEquals(result.connectionTest, true);
      assertEquals(typeof result.timestamp, 'string');
    });

    it('should handle unconfigured service', async () => {
      mockService.setConfigured(false);

      const result = await controller.testConnection();

      assertEquals(result.configured, false);
      assertEquals(result.connectionTest, false);
      assertEquals(typeof result.timestamp, 'string');
    });

    it('should handle connection test failure', async () => {
      mockService.setConnectionTestResult(false);

      const result = await controller.testConnection();

      assertEquals(result.configured, true);
      assertEquals(result.connectionTest, false);
      assertEquals(typeof result.timestamp, 'string');
    });
  });

  describe('snapToRoads', () => {
    it('should successfully snap location to road', async () => {
      const requestBody = {
        latitude: 40.758,
        longitude: -73.9855,
      };

      const result = await controller.snapToRoads(requestBody);

      assertEquals(result.location.latitude, requestBody.latitude);
      assertEquals(result.location.longitude, requestBody.longitude);
      assertEquals(result.roadInfo?.roadName, 'Broadway');
      assertEquals(result.roadInfo?.placeId, 'ChIJmQJIxlVYwokRLgeuocVOGVU');
      assertEquals(typeof result.timestamp, 'string');
    });

    it('should validate latitude range', async () => {
      const requestBody = {
        latitude: 91, // Invalid latitude
        longitude: -73.9855,
      };

      await assertRejects(
        () => controller.snapToRoads(requestBody),
        HttpException,
        'Invalid latitude',
      );
    });

    it('should validate longitude range', async () => {
      const requestBody = {
        latitude: 40.758,
        longitude: 181, // Invalid longitude
      };

      await assertRejects(
        () => controller.snapToRoads(requestBody),
        HttpException,
        'Invalid longitude',
      );
    });

    it('should handle missing latitude', async () => {
      const requestBody = {
        longitude: -73.9855,
      };

      await assertRejects(
        () => controller.snapToRoads(requestBody),
        HttpException,
        'Invalid latitude',
      );
    });

    it('should handle missing longitude', async () => {
      const requestBody = {
        latitude: 40.758,
      };

      await assertRejects(
        () => controller.snapToRoads(requestBody),
        HttpException,
        'Invalid longitude',
      );
    });

    it('should handle unconfigured API key', async () => {
      mockService.setConfigured(false);

      const requestBody = {
        latitude: 40.758,
        longitude: -73.9855,
      };

      await assertRejects(
        () => controller.snapToRoads(requestBody),
        HttpException,
        'Google Roads API is not configured',
      );
    });
  });

  describe('findNearestRoads', () => {
    it('should successfully find nearest roads', async () => {
      const requestBody = {
        latitude: 40.758,
        longitude: -73.9855,
      };

      const result = await controller.findNearestRoads(requestBody);

      assertEquals(result.location.latitude, requestBody.latitude);
      assertEquals(result.location.longitude, requestBody.longitude);
      assertEquals(result.roads.length, 2);
      assertEquals(result.roads[0].roadName, 'Broadway');
      assertEquals(result.roads[1].roadName, '7th Avenue');
      assertEquals(typeof result.timestamp, 'string');
    });

    it('should validate latitude range', async () => {
      const requestBody = {
        latitude: -91, // Invalid latitude
        longitude: -73.9855,
      };

      await assertRejects(
        () => controller.findNearestRoads(requestBody),
        HttpException,
        'Invalid latitude',
      );
    });

    it('should validate longitude range', async () => {
      const requestBody = {
        latitude: 40.758,
        longitude: -181, // Invalid longitude
      };

      await assertRejects(
        () => controller.findNearestRoads(requestBody),
        HttpException,
        'Invalid longitude',
      );
    });

    it('should handle missing coordinates', async () => {
      const requestBody = {};

      await assertRejects(
        () => controller.findNearestRoads(requestBody),
        HttpException,
        'Invalid latitude',
      );
    });

    it('should handle unconfigured API key', async () => {
      mockService.setConfigured(false);

      const requestBody = {
        latitude: 40.758,
        longitude: -73.9855,
      };

      await assertRejects(
        () => controller.findNearestRoads(requestBody),
        HttpException,
        'Google Roads API is not configured',
      );
    });
  });
});
