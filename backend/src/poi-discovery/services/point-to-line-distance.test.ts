import { assertEquals } from '@std/assert';
import { beforeEach, describe, it } from '@std/testing/bdd';
import { POIIdentificationService } from './poi-identification.service.ts';

describe('Point-to-Line Distance Calculation', () => {
  let service: POIIdentificationService;

  beforeEach(() => {
    service = new POIIdentificationService();
  });

  describe('pointToLineSegmentDistance', () => {
    it('should calculate zero distance when point is on the line segment', () => {
      // Point exactly on the line segment
      const point: [number, number] = [40.5, -74.3];
      const segmentStart: [number, number] = [40.4, -74.3];
      const segmentEnd: [number, number] = [40.6, -74.3];

      // Access private method for testing
      const distance = (service as any).pointToLineSegmentDistance(point, segmentStart, segmentEnd);

      // Should be very close to zero (within GPS accuracy)
      assertEquals(Math.round(distance), 0);
    });

    it('should calculate correct distance to line segment endpoint', () => {
      // Point is closest to the start of the segment
      const point: [number, number] = [40.4, -74.3];
      const segmentStart: [number, number] = [40.4, -74.3];
      const segmentEnd: [number, number] = [40.6, -74.3];

      const distance = (service as any).pointToLineSegmentDistance(point, segmentStart, segmentEnd);

      // Should be zero since point is at segment start
      assertEquals(Math.round(distance), 0);
    });

    it('should calculate perpendicular distance to line segment', () => {
      // Point is perpendicular to the middle of the segment
      const point: [number, number] = [40.5, -74.2]; // Offset east
      const segmentStart: [number, number] = [40.4, -74.3];
      const segmentEnd: [number, number] = [40.6, -74.3];

      const distance = (service as any).pointToLineSegmentDistance(point, segmentStart, segmentEnd);

      // Should be approximately the distance from -74.2 to -74.3 longitude
      // At this latitude, 0.1 degrees longitude ≈ 8km
      const expectedDistance = Math.round(distance / 1000); // Convert to km and round
      assertEquals(expectedDistance, 8); // Approximately 8km
    });
  });

  describe('calculateDistanceToLineSegment', () => {
    it('should handle empty geometry', () => {
      const point: [number, number] = [40.5, -74.3];
      const geometry: Array<{ lat: number; lon: number }> = [];

      const distance = (service as any).calculateDistanceToLineSegment(point, geometry);

      assertEquals(distance, Infinity);
    });

    it('should handle single point geometry', () => {
      const point: [number, number] = [40.5, -74.3];
      const geometry: Array<{ lat: number; lon: number }> = [
        { lat: 40.5, lon: -74.3 },
      ];

      const distance = (service as any).calculateDistanceToLineSegment(point, geometry);

      assertEquals(distance, Infinity); // No line segments to calculate distance to
    });

    it('should calculate minimum distance to multi-segment highway', () => {
      const point: [number, number] = [40.53, -74.34]; // User location

      // Highway geometry with multiple segments
      const geometry: Array<{ lat: number; lon: number }> = [
        { lat: 40.52, lon: -74.35 }, // Segment 1 start
        { lat: 40.53, lon: -74.34 }, // Segment 1 end / Segment 2 start (closest to user)
        { lat: 40.54, lon: -74.33 }, // Segment 2 end
        { lat: 40.55, lon: -74.32 }, // Segment 3 end
      ];

      const distance = (service as any).calculateDistanceToLineSegment(point, geometry);

      // Should be very close to zero since user is on one of the geometry points
      assertEquals(Math.round(distance), 0);
    });

    it('should find closest segment in complex highway geometry', () => {
      const point: [number, number] = [40.535, -74.335]; // User location between segments

      // Highway geometry where user is closest to the middle segment
      const geometry: Array<{ lat: number; lon: number }> = [
        { lat: 40.52, lon: -74.35 }, // Far segment
        { lat: 40.53, lon: -74.34 }, // Close segment start
        { lat: 40.54, lon: -74.33 }, // Close segment end
        { lat: 40.56, lon: -74.31 }, // Far segment
      ];

      const distance = (service as any).calculateDistanceToLineSegment(point, geometry);

      // Should be small distance since user is close to the middle segment
      const distanceInMeters = Math.round(distance);
      // At this scale, should be within a few hundred meters
      assertEquals(distanceInMeters < 1000, true);
    });
  });

  describe('calculateGeometryCenter', () => {
    it('should handle empty geometry', () => {
      const geometry: Array<{ lat: number; lon: number }> = [];

      const center = (service as any).calculateGeometryCenter(geometry);

      assertEquals(center, { lat: 0, lng: 0 });
    });

    it('should return single point for single-point geometry', () => {
      const geometry: Array<{ lat: number; lon: number }> = [
        { lat: 40.5, lon: -74.3 },
      ];

      const center = (service as any).calculateGeometryCenter(geometry);

      assertEquals(center, { lat: 40.5, lng: -74.3 });
    });

    it('should calculate center of multi-point geometry', () => {
      const geometry: Array<{ lat: number; lon: number }> = [
        { lat: 40.0, lon: -74.0 },
        { lat: 41.0, lon: -75.0 },
      ];

      const center = (service as any).calculateGeometryCenter(geometry);

      assertEquals(center, { lat: 40.5, lng: -74.5 });
    });
  });
});
