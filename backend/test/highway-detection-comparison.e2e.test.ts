import { assertEquals, assertExists } from '@std/assert';
import { beforeAll, afterAll, describe, it } from '@std/testing/bdd';
import { DanetApplication } from '@danet/core';
import { AppModule } from '../src/app.module.ts';

describe('Highway Detection Comparison E2E', () => {
  let app: DanetApplication;
  let baseUrl: string;

  beforeAll(async () => {
    app = new DanetApplication();
    await app.init(AppModule);

    const port = 3001;
    await app.listen(port);
    baseUrl = `http://localhost:${port}`;
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('POST /api/highway/detection-comparison', () => {
    it('should return comparison results for all four methods', async () => {
      const testLocation = {
        latitude: 40.53383335817636,
        longitude: -74.3467882397128,
      };

      const response = await fetch(`${baseUrl}/api/highway/detection-comparison`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testLocation),
      });

      assertEquals(response.status, 200);

      const result = await response.json();

      // Verify response structure
      assertExists(result.location);
      assertExists(result.methods);
      assertExists(result.timestamp);

      assertEquals(result.location.latitude, testLocation.latitude);
      assertEquals(result.location.longitude, testLocation.longitude);

      // Verify all four methods are present
      assertExists(result.methods.current);
      assertExists(result.methods.pointToLine);
      assertExists(result.methods.googleRoads);
      assertExists(result.methods.enhancedOverpass);

      // Verify each method has the required structure
      for (const [methodName, methodResult] of Object.entries(result.methods)) {
        const method = methodResult as any;
        assertExists(method.highways);
        assertExists(method.processingTime);
        assertExists(method.method);
        assertEquals(method.method, methodName);
      }
    });

    it('should handle invalid input gracefully', async () => {
      const invalidLocation = {
        latitude: 91, // Invalid latitude
        longitude: -74,
      };

      const response = await fetch(`${baseUrl}/api/highway/detection-comparison`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invalidLocation),
      });

      assertEquals(response.status, 400);
    });

    it('should include performance timing information', async () => {
      const testLocation = {
        latitude: 40.7128,
        longitude: -74.006,
      };

      const response = await fetch(`${baseUrl}/api/highway/detection-comparison`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testLocation),
      });

      assertEquals(response.status, 200);

      const result = await response.json();

      // Each method should have processing time
      for (const [methodName, methodResult] of Object.entries(result.methods)) {
        const method = methodResult as any;
        assertExists(method.processingTime);
        assertEquals(typeof method.processingTime, 'number');

        // Processing time should be reasonable
        assertEquals(method.processingTime >= 0, true);
      }
    });

    it('should return properly formatted highway data', async () => {
      const testLocation = {
        latitude: 40.7128,
        longitude: -74.006,
      };

      const response = await fetch(`${baseUrl}/api/highway/detection-comparison`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testLocation),
      });

      assertEquals(response.status, 200);

      const result = await response.json();

      // Check highway result structure for each method
      for (const [methodName, methodResult] of Object.entries(result.methods)) {
        const method = methodResult as any;
        if (method.highways.length > 0) {
          for (const highway of method.highways) {
            assertExists(highway.name);
            assertExists(highway.type);
            assertExists(highway.distance);
            assertExists(highway.confidence);

            assertEquals(typeof highway.name, 'string');
            assertEquals(typeof highway.type, 'string');
            assertEquals(typeof highway.distance, 'number');
            assertEquals(typeof highway.confidence, 'number');

            // Distance should be non-negative
            assertEquals(highway.distance >= 0, true);

            // Confidence should be between 0 and 1
            assertEquals(highway.confidence >= 0 && highway.confidence <= 1, true);
          }
        }
      }
    });
  });
});
