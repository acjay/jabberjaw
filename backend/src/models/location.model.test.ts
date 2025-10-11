import { assertEquals } from '@std/assert';
import { describe, it } from '@std/testing/bdd';
import { isLocationData, type LocationData, validateLocationData } from './location.model.ts';

describe('LocationData Model', () => {
  describe('validateLocationData', () => {
    it('should validate correct location data', () => {
      const validLocation: LocationData = {
        latitude: 40.7128,
        longitude: -74.0060,
        timestamp: new Date(),
        accuracy: 10.5,
      };

      assertEquals(validateLocationData(validLocation), true);
    });

    it('should reject latitude out of range', () => {
      const invalidLocation: LocationData = {
        latitude: 91, // Invalid: > 90
        longitude: -74.0060,
        timestamp: new Date(),
        accuracy: 10.5,
      };

      assertEquals(validateLocationData(invalidLocation), false);
    });

    it('should reject longitude out of range', () => {
      const invalidLocation: LocationData = {
        latitude: 40.7128,
        longitude: -181, // Invalid: < -180
        timestamp: new Date(),
        accuracy: 10.5,
      };

      assertEquals(validateLocationData(invalidLocation), false);
    });

    it('should reject negative accuracy', () => {
      const invalidLocation: LocationData = {
        latitude: 40.7128,
        longitude: -74.0060,
        timestamp: new Date(),
        accuracy: -5, // Invalid: negative
      };

      assertEquals(validateLocationData(invalidLocation), false);
    });

    it('should reject invalid timestamp', () => {
      const invalidLocation: LocationData = {
        latitude: 40.7128,
        longitude: -74.0060,
        timestamp: new Date('invalid'), // Invalid date
        accuracy: 10.5,
      };

      assertEquals(validateLocationData(invalidLocation), false);
    });
  });

  describe('isLocationData', () => {
    it('should identify valid LocationData object', () => {
      const validLocation: LocationData = {
        latitude: 40.7128,
        longitude: -74.0060,
        timestamp: new Date(),
        accuracy: 10.5,
      };

      assertEquals(isLocationData(validLocation), true);
    });

    it('should reject null or undefined', () => {
      assertEquals(isLocationData(null), false);
      assertEquals(isLocationData(undefined), false);
    });

    it('should reject objects missing required properties', () => {
      const incompleteObject = {
        latitude: 40.7128,
        longitude: -74.0060,
        // Missing timestamp and accuracy
      };

      assertEquals(isLocationData(incompleteObject), false);
    });

    it('should reject objects with wrong property types', () => {
      const wrongTypes = {
        latitude: '40.7128', // Should be number
        longitude: -74.0060,
        timestamp: new Date(),
        accuracy: 10.5,
      };

      assertEquals(isLocationData(wrongTypes), false);
    });
  });

  describe('LocationData serialization and deserialization', () => {
    it('should serialize and deserialize LocationData correctly', () => {
      const originalLocation: LocationData = {
        latitude: 37.7749,
        longitude: -122.4194,
        timestamp: new Date('2024-01-15T10:30:00.000Z'),
        accuracy: 5.2,
      };

      // Serialize to JSON
      const serialized = JSON.stringify(originalLocation);

      // Deserialize from JSON (note: Date needs special handling)
      const parsed = JSON.parse(serialized);
      const deserialized: LocationData = {
        ...parsed,
        timestamp: new Date(parsed.timestamp),
      };

      // Validate the deserialized object
      assertEquals(validateLocationData(deserialized), true);
      assertEquals(isLocationData(deserialized), true);

      // Verify all fields match
      assertEquals(deserialized.latitude, originalLocation.latitude);
      assertEquals(deserialized.longitude, originalLocation.longitude);
      assertEquals(deserialized.timestamp.getTime(), originalLocation.timestamp.getTime());
      assertEquals(deserialized.accuracy, originalLocation.accuracy);
    });

    it('should handle high precision coordinates during serialization', () => {
      const preciseLocation: LocationData = {
        latitude: 40.748817,
        longitude: -73.985428,
        timestamp: new Date('2024-01-15T14:22:33.456Z'),
        accuracy: 0.1,
      };

      const serialized = JSON.stringify(preciseLocation);
      const parsed = JSON.parse(serialized);
      const deserialized: LocationData = {
        ...parsed,
        timestamp: new Date(parsed.timestamp),
      };

      assertEquals(validateLocationData(deserialized), true);
      assertEquals(deserialized.latitude, preciseLocation.latitude);
      assertEquals(deserialized.longitude, preciseLocation.longitude);
      assertEquals(deserialized.accuracy, preciseLocation.accuracy);
    });

    it('should preserve timestamp precision during serialization', () => {
      const timestampTests = [
        new Date('2024-01-01T00:00:00.000Z'),
        new Date('2024-12-31T23:59:59.999Z'),
        new Date('2024-06-15T12:30:45.123Z'),
      ];

      for (const timestamp of timestampTests) {
        const location: LocationData = {
          latitude: 0,
          longitude: 0,
          timestamp,
          accuracy: 1,
        };

        const serialized = JSON.stringify(location);
        const parsed = JSON.parse(serialized);
        const deserializedTimestamp = new Date(parsed.timestamp);

        assertEquals(
          deserializedTimestamp.getTime(),
          timestamp.getTime(),
          `Timestamp precision lost for: ${timestamp.toISOString()}`,
        );
      }
    });
  });

  describe('LocationData boundary conditions', () => {
    it('should validate locations at coordinate extremes', () => {
      const extremeLocations = [
        { lat: 90, lng: 180 }, // North Pole, International Date Line
        { lat: -90, lng: -180 }, // South Pole, International Date Line
        { lat: 0, lng: 0 }, // Null Island
        { lat: 90, lng: 0 }, // North Pole, Prime Meridian
        { lat: -90, lng: 0 }, // South Pole, Prime Meridian
        { lat: 0, lng: 180 }, // Equator, International Date Line
        { lat: 0, lng: -180 }, // Equator, International Date Line (west)
      ];

      for (const coords of extremeLocations) {
        const location: LocationData = {
          latitude: coords.lat,
          longitude: coords.lng,
          timestamp: new Date(),
          accuracy: 1,
        };

        assertEquals(
          validateLocationData(location),
          true,
          `Failed to validate extreme coordinates: ${coords.lat}, ${coords.lng}`,
        );
      }
    });

    it('should reject coordinates just outside valid ranges', () => {
      const invalidCoordinates = [
        { lat: 90.1, lng: 0 }, // Latitude too high
        { lat: -90.1, lng: 0 }, // Latitude too low
        { lat: 0, lng: 180.1 }, // Longitude too high
        { lat: 0, lng: -180.1 }, // Longitude too low
        { lat: 91, lng: 181 }, // Both out of range
        { lat: -91, lng: -181 }, // Both out of range (negative)
      ];

      for (const coords of invalidCoordinates) {
        const location: LocationData = {
          latitude: coords.lat,
          longitude: coords.lng,
          timestamp: new Date(),
          accuracy: 1,
        };

        assertEquals(
          validateLocationData(location),
          false,
          `Should reject invalid coordinates: ${coords.lat}, ${coords.lng}`,
        );
      }
    });

    it('should validate various accuracy values', () => {
      const accuracyTests = [
        0, // Perfect accuracy
        0.1, // Very high accuracy
        1, // High accuracy
        10, // Good accuracy
        100, // Poor accuracy
        1000, // Very poor accuracy
        Number.MAX_SAFE_INTEGER, // Extreme accuracy value
      ];

      for (const accuracy of accuracyTests) {
        const location: LocationData = {
          latitude: 40.7128,
          longitude: -74.0060,
          timestamp: new Date(),
          accuracy,
        };

        assertEquals(
          validateLocationData(location),
          true,
          `Failed to validate accuracy: ${accuracy}`,
        );
      }
    });

    it('should reject negative accuracy values', () => {
      const negativeAccuracyTests = [-0.1, -1, -10, -100];

      for (const accuracy of negativeAccuracyTests) {
        const location: LocationData = {
          latitude: 40.7128,
          longitude: -74.0060,
          timestamp: new Date(),
          accuracy,
        };

        assertEquals(
          validateLocationData(location),
          false,
          `Should reject negative accuracy: ${accuracy}`,
        );
      }
    });
  });
});
