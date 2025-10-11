import { assertEquals } from '@std/assert';
import { describe, it } from '@std/testing/bdd';
import {
  getPOICategoriesByGroup,
  isPointOfInterest,
  POICategory,
  type PointOfInterest,
  validatePointOfInterest,
} from './poi.model.ts';

describe('POI Model', () => {
  describe('validatePointOfInterest', () => {
    it('should validate correct POI data', () => {
      const validPOI: PointOfInterest = {
        id: 'poi-123',
        name: 'Central Park',
        category: POICategory.PARK,
        location: {
          latitude: 40.7829,
          longitude: -73.9654,
        },
        description: 'A large public park in Manhattan',
        metadata: {
          foundedYear: 1857,
          elevation: 40,
          significance: ['recreational', 'historical', 'cultural'],
        },
      };

      assertEquals(validatePointOfInterest(validPOI), true);
    });

    it('should reject POI with empty id', () => {
      const invalidPOI: PointOfInterest = {
        id: '', // Invalid: empty string
        name: 'Central Park',
        category: POICategory.PARK,
        location: { latitude: 40.7829, longitude: -73.9654 },
        description: 'A large public park in Manhattan',
        metadata: { significance: ['recreational'] },
      };

      assertEquals(validatePointOfInterest(invalidPOI), false);
    });

    it('should reject POI with empty name', () => {
      const invalidPOI: PointOfInterest = {
        id: 'poi-123',
        name: '   ', // Invalid: whitespace only
        category: POICategory.PARK,
        location: { latitude: 40.7829, longitude: -73.9654 },
        description: 'A large public park in Manhattan',
        metadata: { significance: ['recreational'] },
      };

      assertEquals(validatePointOfInterest(invalidPOI), false);
    });

    it('should reject POI with invalid category', () => {
      const invalidPOI = {
        id: 'poi-123',
        name: 'Central Park',
        category: 'invalid_category', // Invalid: not in enum
        location: { latitude: 40.7829, longitude: -73.9654 },
        description: 'A large public park in Manhattan',
        metadata: { significance: ['recreational'] },
      } as unknown as PointOfInterest;

      assertEquals(validatePointOfInterest(invalidPOI), false);
    });

    it('should reject POI with invalid coordinates', () => {
      const invalidPOI: PointOfInterest = {
        id: 'poi-123',
        name: 'Central Park',
        category: POICategory.PARK,
        location: {
          latitude: 91, // Invalid: > 90
          longitude: -73.9654,
        },
        description: 'A large public park in Manhattan',
        metadata: { significance: ['recreational'] },
      };

      assertEquals(validatePointOfInterest(invalidPOI), false);
    });

    it('should reject POI with missing significance array', () => {
      const invalidPOI = {
        id: 'poi-123',
        name: 'Central Park',
        category: POICategory.PARK,
        location: { latitude: 40.7829, longitude: -73.9654 },
        description: 'A large public park in Manhattan',
        metadata: {}, // Missing significance array
      } as PointOfInterest;

      assertEquals(validatePointOfInterest(invalidPOI), false);
    });

    it('should reject POI with negative population', () => {
      const invalidPOI: PointOfInterest = {
        id: 'poi-123',
        name: 'Small Town',
        category: POICategory.TOWN,
        location: { latitude: 40.7829, longitude: -73.9654 },
        description: 'A small town',
        metadata: {
          population: -100, // Invalid: negative
          significance: ['residential'],
        },
      };

      assertEquals(validatePointOfInterest(invalidPOI), false);
    });

    it('should accept POI with valid optional metadata fields', () => {
      const validPOI: PointOfInterest = {
        id: 'poi-123',
        name: 'Historic Town',
        category: POICategory.TOWN,
        location: { latitude: 40.7829, longitude: -73.9654 },
        description: 'A historic town',
        metadata: {
          population: 5000,
          foundedYear: 1850,
          elevation: 200,
          significance: ['historical', 'cultural'],
        },
      };

      assertEquals(validatePointOfInterest(validPOI), true);
    });
  });

  describe('isPointOfInterest', () => {
    it('should identify valid PointOfInterest object', () => {
      const validPOI: PointOfInterest = {
        id: 'poi-123',
        name: 'Central Park',
        category: POICategory.PARK,
        location: { latitude: 40.7829, longitude: -73.9654 },
        description: 'A large public park in Manhattan',
        metadata: { significance: ['recreational'] },
      };

      assertEquals(isPointOfInterest(validPOI), true);
    });

    it('should reject null or undefined', () => {
      assertEquals(isPointOfInterest(null), false);
      assertEquals(isPointOfInterest(undefined), false);
    });

    it('should reject objects missing required properties', () => {
      const incompleteObject = {
        id: 'poi-123',
        name: 'Central Park',
        // Missing other required properties
      };

      assertEquals(isPointOfInterest(incompleteObject), false);
    });
  });

  describe('POICategory enum', () => {
    it('should contain all expected categories', () => {
      const expectedCategories = [
        'town',
        'county',
        'neighborhood',
        'waterway',
        'mountain',
        'valley',
        'plateau',
        'major_road',
        'bridge',
        'landmark',
        'airport',
        'train_station',
        'rest_stop',
        'institution',
        'museum',
        'library',
        'cultural_center',
        'park',
        'wildlife_refuge',
        'scenic_overlook',
        'theater',
        'music_venue',
        'art_installation',
        'religious_site',
        'church',
        'temple',
        'monastery',
        'pilgrimage_site',
        'factory',
        'mill',
        'mining_site',
        'agricultural_facility',
        'stadium',
        'race_track',
        'golf_course',
        'ski_resort',
        'military_base',
        'battlefield',
        'memorial',
        'fort',
        'historic_route',
        'canal',
        'railroad_heritage',
        'cave',
        'rock_formation',
        'mineral_site',
        'fault_line',
        'farm',
        'vineyard',
        'orchard',
        'farmers_market',
      ];

      const actualCategories = Object.values(POICategory);
      assertEquals(actualCategories.length, expectedCategories.length);

      for (const category of expectedCategories) {
        assertEquals(actualCategories.includes(category as POICategory), true);
      }
    });
  });

  describe('getPOICategoriesByGroup', () => {
    it('should return all categories grouped correctly', () => {
      const groups = getPOICategoriesByGroup();

      // Verify all expected groups exist
      const expectedGroups = [
        'geographic',
        'infrastructure',
        'institutions',
        'natural',
        'cultural',
        'religious',
        'industrial',
        'recreation',
        'military',
        'transportation',
        'geological',
        'agricultural',
      ];

      for (const group of expectedGroups) {
        assertEquals(Array.isArray(groups[group]), true);
        assertEquals(groups[group].length > 0, true);
      }

      // Verify specific categories are in correct groups
      assertEquals(groups.geographic.includes(POICategory.TOWN), true);
      assertEquals(groups.infrastructure.includes(POICategory.BRIDGE), true);
      assertEquals(groups.natural.includes(POICategory.PARK), true);
      assertEquals(groups.religious.includes(POICategory.CHURCH), true);
    });

    it('should include all POI categories across all groups', () => {
      const groups = getPOICategoriesByGroup();
      const allGroupedCategories = Object.values(groups).flat();
      const allPOICategories = Object.values(POICategory);

      assertEquals(allGroupedCategories.length, allPOICategories.length);

      for (const category of allPOICategories) {
        assertEquals(allGroupedCategories.includes(category), true);
      }
    });
  });

  describe('POI serialization and deserialization', () => {
    it('should serialize and deserialize POI correctly', () => {
      const originalPOI: PointOfInterest = {
        id: 'poi-serialize-test',
        name: 'Serialization Test Location',
        category: POICategory.LANDMARK,
        location: {
          latitude: 45.5152,
          longitude: -122.6784,
        },
        description: 'A test location for serialization validation',
        metadata: {
          population: 25000,
          foundedYear: 1900,
          elevation: 150,
          significance: ['historical', 'architectural', 'cultural'],
        },
      };

      // Serialize to JSON
      const serialized = JSON.stringify(originalPOI);

      // Deserialize from JSON
      const deserialized = JSON.parse(serialized) as PointOfInterest;

      // Validate the deserialized object
      assertEquals(validatePointOfInterest(deserialized), true);
      assertEquals(isPointOfInterest(deserialized), true);

      // Verify all fields match
      assertEquals(deserialized.id, originalPOI.id);
      assertEquals(deserialized.name, originalPOI.name);
      assertEquals(deserialized.category, originalPOI.category);
      assertEquals(deserialized.location.latitude, originalPOI.location.latitude);
      assertEquals(deserialized.location.longitude, originalPOI.location.longitude);
      assertEquals(deserialized.description, originalPOI.description);
      assertEquals(deserialized.metadata.population, originalPOI.metadata.population);
      assertEquals(deserialized.metadata.foundedYear, originalPOI.metadata.foundedYear);
      assertEquals(deserialized.metadata.elevation, originalPOI.metadata.elevation);
      assertEquals(deserialized.metadata.significance, originalPOI.metadata.significance);
    });

    it('should handle POI with minimal metadata during serialization', () => {
      const minimalPOI: PointOfInterest = {
        id: 'poi-minimal',
        name: 'Minimal POI',
        category: POICategory.PARK,
        location: { latitude: 0, longitude: 0 },
        description: 'A minimal POI for testing',
        metadata: { significance: ['natural'] },
      };

      const serialized = JSON.stringify(minimalPOI);
      const deserialized = JSON.parse(serialized) as PointOfInterest;

      assertEquals(validatePointOfInterest(deserialized), true);
      assertEquals(deserialized.metadata.population, undefined);
      assertEquals(deserialized.metadata.foundedYear, undefined);
      assertEquals(deserialized.metadata.elevation, undefined);
      assertEquals(deserialized.metadata.significance, ['natural']);
    });

    it('should validate POI categories from different groups', () => {
      const testCategories = [
        POICategory.TOWN, // geographic
        POICategory.BRIDGE, // infrastructure
        POICategory.MUSEUM, // institutions
        POICategory.PARK, // natural
        POICategory.THEATER, // cultural
        POICategory.CHURCH, // religious
        POICategory.FACTORY, // industrial
        POICategory.STADIUM, // recreation
        POICategory.FORT, // military
        POICategory.CANAL, // transportation
        POICategory.CAVE, // geological
        POICategory.FARM, // agricultural
      ];

      for (const category of testCategories) {
        const poi: PointOfInterest = {
          id: `poi-${category}`,
          name: `Test ${category}`,
          category,
          location: { latitude: 40.0, longitude: -74.0 },
          description: `A test ${category}`,
          metadata: { significance: ['test'] },
        };

        assertEquals(
          validatePointOfInterest(poi),
          true,
          `Failed to validate POI with category: ${category}`,
        );
      }
    });
  });

  describe('POI edge cases and boundary conditions', () => {
    it('should validate POI at coordinate boundaries', () => {
      const boundaryTests = [
        { lat: 90, lng: 180 }, // North-East extreme
        { lat: -90, lng: -180 }, // South-West extreme
        { lat: 0, lng: 0 }, // Equator/Prime Meridian
        { lat: 89.9999, lng: 179.9999 }, // Near boundaries
        { lat: -89.9999, lng: -179.9999 },
      ];

      for (const coords of boundaryTests) {
        const poi: PointOfInterest = {
          id: `poi-boundary-${coords.lat}-${coords.lng}`,
          name: 'Boundary Test POI',
          category: POICategory.LANDMARK,
          location: { latitude: coords.lat, longitude: coords.lng },
          description: 'Testing coordinate boundaries',
          metadata: { significance: ['test'] },
        };

        assertEquals(
          validatePointOfInterest(poi),
          true,
          `Failed to validate POI at coordinates: ${coords.lat}, ${coords.lng}`,
        );
      }
    });

    it('should reject POI with malformed metadata', () => {
      const malformedTests = [
        { metadata: null }, // null metadata
        { metadata: { significance: null } }, // null significance
        { metadata: { significance: 'not-array' } }, // non-array significance
        { metadata: { significance: [], population: 'not-number' } }, // invalid population type
        { metadata: { significance: [], foundedYear: 'not-number' } }, // invalid foundedYear type
        { metadata: { significance: [], elevation: 'not-number' } }, // invalid elevation type
      ];

      for (const test of malformedTests) {
        const poi = {
          id: 'poi-malformed',
          name: 'Malformed POI',
          category: POICategory.LANDMARK,
          location: { latitude: 40.0, longitude: -74.0 },
          description: 'Testing malformed metadata',
          ...test,
        } as unknown as PointOfInterest;

        assertEquals(
          validatePointOfInterest(poi),
          false,
          `Should reject POI with malformed metadata: ${JSON.stringify(test)}`,
        );
      }
    });
  });
});
