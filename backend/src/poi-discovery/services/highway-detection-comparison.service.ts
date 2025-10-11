import { Injectable } from '@danet/core';
import { POIIdentificationService } from './poi-identification.service.ts';
import { GoogleRoadsService } from './google-roads.service.ts';
import { LocationData } from '../../models/location.model.ts';
import {
  HighwayDetectionComparison,
  HighwayDetectionResult,
} from '../highway-detection.controller.ts';

/**
 * Service for comparing different highway detection methods
 * Implements the four methods described in highway-detection-methods.md
 */
@Injectable()
export class HighwayDetectionComparisonService {
  constructor(
    private readonly poiService: POIIdentificationService,
    private readonly googleRoadsService: GoogleRoadsService,
  ) {}

  /**
   * Compare all four highway detection methods for a given location
   */
  async compareDetectionMethods(location: LocationData): Promise<HighwayDetectionComparison> {
    // Run all four detection methods in parallel for performance comparison
    const [currentResult, pointToLineResult, googleRoadsResult, enhancedOverpassResult] =
      await Promise.allSettled([
        this.runCurrentMethod(location),
        this.runPointToLineMethod(location),
        this.runGoogleRoadsMethod(location),
        this.runEnhancedOverpassMethod(location),
      ]);

    return {
      location: {
        latitude: location.latitude,
        longitude: location.longitude,
      },
      methods: {
        current: this.processMethodResult(currentResult, 'current'),
        pointToLine: this.processMethodResult(pointToLineResult, 'pointToLine'),
        googleRoads: this.processMethodResult(googleRoadsResult, 'googleRoads'),
        enhancedOverpass: this.processMethodResult(enhancedOverpassResult, 'enhancedOverpass'),
      },
      timestamp: new Date(),
    };
  }

  /**
   * Method 1: Current approach - point-to-point distance to highway center points
   */
  private async runCurrentMethod(location: LocationData): Promise<{
    highways: Array<{
      name: string;
      type: string;
      distance: number;
      confidence: number;
      metadata?: any;
    }>;
    processingTime: number;
  }> {
    const startTime = performance.now();

    try {
      // Use current POI discovery with center-point distance calculation
      const pois = await this.poiService.discoverPOIs(location, {
        radiusMeters: 5000,
        maxResults: 10,
      });

      const highways = pois
        .filter(poi => poi.category === 'major_road')
        .map(poi => ({
          name: poi.name,
          ref: undefined, // POI service doesn't provide ref numbers
          displayName: poi.name,
          type: 'highway',
          roadType: this.classifyRoadTypeFromName(poi.name),
          distance: this.calculatePointToPointDistance(location, poi.location),
          confidence: (poi.metadata?.significanceScore || 50) / 100,
          metadata: {
            method: 'current',
            centerPoint: poi.location,
            originalMetadata: poi.metadata,
          },
        }))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 5);

      const processingTime = performance.now() - startTime;

      return {
        highways,
        processingTime,
      };
    } catch (error) {
      const processingTime = performance.now() - startTime;
      return {
        highways: [],
        processingTime,
      };
    }
  }

  /**
   * Method 2: Point-to-line distance calculation using highway geometry
   */
  private async runPointToLineMethod(location: LocationData): Promise<{
    highways: Array<{
      name: string;
      type: string;
      distance: number;
      confidence: number;
      metadata?: any;
    }>;
    processingTime: number;
  }> {
    const startTime = performance.now();

    try {
      // Query highways with full geometry using enhanced Overpass query
      const highways = await this.queryHighwaysWithGeometry(location, 5000);

      const processedHighways = highways
        .map(highway => {
          const geometricDistance = this.calculatePointToLineDistance(
            [location.latitude, location.longitude],
            highway.geometry,
          );

          return {
            name: highway.rawName || highway.name,
            ref: highway.rawRef,
            displayName: highway.name,
            type: highway.type,
            roadType: this.classifyRoadType('', highway.rawRef, highway.rawName || highway.name),
            distance: geometricDistance,
            confidence: this.calculateGeometricConfidence(
              geometricDistance,
              highway.geometry.length,
            ),
            metadata: {
              method: 'pointToLine',
              geometryPoints: highway.geometry.length,
              centerPoint: highway.centerPoint,
              geometricDistance,
              rawName: highway.rawName,
              rawRef: highway.rawRef,
            },
          };
        })
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 5);

      const processingTime = performance.now() - startTime;

      return {
        highways: processedHighways,
        processingTime,
      };
    } catch (error) {
      const processingTime = performance.now() - startTime;
      return {
        highways: [],
        processingTime,
      };
    }
  }

  /**
   * Method 3: Google Roads API integration
   */
  private async runGoogleRoadsMethod(location: LocationData): Promise<{
    highways: Array<{
      name: string;
      type: string;
      distance: number;
      confidence: number;
      metadata?: any;
    }>;
    processingTime: number;
  }> {
    const startTime = performance.now();

    try {
      if (!this.googleRoadsService.isConfigured()) {
        throw new Error('Google Roads API not configured');
      }

      // Try snap to roads first
      const snapResult = await this.googleRoadsService.snapToRoads(location);
      const nearestRoads = await this.googleRoadsService.findNearestRoads(location);

      const highways: Array<{
        name: string;
        type: string;
        distance: number;
        confidence: number;
        metadata?: any;
      }> = [];

      // Add snap result if available
      if (snapResult) {
        const roadName = snapResult.roadName || 'Unknown Road';
        const extractedRef = this.extractHighwayRef(roadName);

        highways.push({
          name: roadName,
          ref: extractedRef,
          displayName: roadName,
          type: 'road',
          roadType: this.classifyRoadTypeFromName(roadName),
          distance: snapResult.distanceFromOriginal,
          confidence: snapResult.confidence,
          metadata: {
            method: 'googleRoads',
            source: 'snapToRoads',
            placeId: snapResult.placeId,
            snappedLocation: snapResult.snappedLocation,
            extractedRef,
          },
        });
      }

      // Add nearest roads
      for (const road of nearestRoads.slice(0, 4)) {
        if (!highways.some(h => h.metadata?.placeId === road.placeId)) {
          const roadName = road.roadName || 'Unknown Road';
          const extractedRef = this.extractHighwayRef(roadName);

          highways.push({
            name: roadName,
            ref: extractedRef,
            displayName: roadName,
            type: 'road',
            roadType: this.classifyRoadTypeFromName(roadName),
            distance: road.distanceFromOriginal,
            confidence: road.confidence,
            metadata: {
              method: 'googleRoads',
              source: 'nearestRoads',
              placeId: road.placeId,
              snappedLocation: road.snappedLocation,
              extractedRef,
            },
          });
        }
      }

      const processingTime = performance.now() - startTime;

      return {
        highways: highways.sort((a, b) => a.distance - b.distance),
        processingTime,
      };
    } catch (error) {
      const processingTime = performance.now() - startTime;
      return {
        highways: [],
        processingTime,
      };
    }
  }

  /**
   * Method 4: Enhanced Overpass queries with progressive radius search
   */
  private async runEnhancedOverpassMethod(location: LocationData): Promise<{
    highways: Array<{
      name: string;
      type: string;
      distance: number;
      confidence: number;
      metadata?: any;
    }>;
    processingTime: number;
  }> {
    const startTime = performance.now();

    try {
      // Use progressive radius search (100m, 500m, 2km)
      const radii = [100, 500, 2000];
      let highways: Array<{
        name: string;
        type: string;
        distance: number;
        confidence: number;
        metadata?: any;
      }> = [];

      for (const radius of radii) {
        const radiusHighways = await this.queryHighwaysWithGeometry(location, radius);

        if (radiusHighways.length > 0) {
          highways = radiusHighways
            .map(highway => {
              const geometricDistance = this.calculatePointToLineDistance(
                [location.latitude, location.longitude],
                highway.geometry,
              );

              return {
                name: highway.rawName || highway.name,
                ref: highway.rawRef,
                displayName: highway.name,
                type: highway.type,
                roadType: this.classifyRoadType(
                  '',
                  highway.rawRef,
                  highway.rawName || highway.name,
                ),
                distance: geometricDistance,
                confidence: this.calculateEnhancedConfidence(
                  geometricDistance,
                  highway.type,
                  highway.geometry.length,
                ),
                metadata: {
                  method: 'enhancedOverpass',
                  searchRadius: radius,
                  geometryPoints: highway.geometry.length,
                  centerPoint: highway.centerPoint,
                  geometricDistance,
                  rawName: highway.rawName,
                  rawRef: highway.rawRef,
                },
              };
            })
            .sort((a, b) => a.distance - b.distance);

          // Return results from first successful radius
          break;
        }
      }

      const processingTime = performance.now() - startTime;

      return {
        highways: highways.slice(0, 5),
        processingTime,
      };
    } catch (error) {
      const processingTime = performance.now() - startTime;
      return {
        highways: [],
        processingTime,
      };
    }
  }

  /**
   * Query highways with full geometry from OpenStreetMap
   */
  private async queryHighwaysWithGeometry(
    location: LocationData,
    radiusMeters: number,
  ): Promise<
    Array<{
      name: string;
      type: string;
      geometry: Array<{ lat: number; lon: number }>;
      centerPoint: { lat: number; lng: number };
      rawName?: string;
      rawRef?: string;
    }>
  > {
    const query = `
      [out:json][timeout:15];
      (
        way["highway"~"^(motorway|trunk|primary|secondary)$"]["name"]
        (around:${radiusMeters},${location.latitude},${location.longitude});
        way["highway"~"^(motorway|trunk|primary|secondary)$"]["ref"]
        (around:${radiusMeters},${location.latitude},${location.longitude});
      );
      out geom;
    `;

    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `data=${encodeURIComponent(query)}`,
    });

    if (!response.ok) {
      throw new Error(`Overpass API error: ${response.status}`);
    }

    const data = await response.json();
    const results: Array<{
      name: string;
      type: string;
      geometry: Array<{ lat: number; lon: number }>;
      centerPoint: { lat: number; lng: number };
    }> = [];

    for (const element of data.elements || []) {
      const tags = element.tags || {};
      const name = tags.name;
      const ref = tags.ref;

      // Need either name or ref to proceed
      if ((!name && !ref) || !element.geometry || element.geometry.length < 2) continue;

      const geometry = element.geometry.filter(
        (point: any) => point && typeof point.lat === 'number' && typeof point.lon === 'number',
      );

      if (geometry.length < 2) continue;

      const centerPoint = this.calculateGeometryCenter(geometry);
      const type = this.mapHighwayType(tags.highway);
      const displayName = this.createDisplayName(name, ref, type);

      results.push({
        name: displayName,
        type,
        geometry,
        centerPoint,
        rawName: name,
        rawRef: ref,
      });
    }

    return results;
  }

  /**
   * Calculate point-to-point distance (current method)
   */
  private calculatePointToPointDistance(
    location: LocationData,
    poiLocation: { latitude: number; longitude: number },
  ): number {
    return this.calculateDistance(
      location.latitude,
      location.longitude,
      poiLocation.latitude,
      poiLocation.longitude,
    );
  }

  /**
   * Calculate point-to-line distance using highway geometry
   */
  private calculatePointToLineDistance(
    point: [number, number],
    geometry: Array<{ lat: number; lon: number }>,
  ): number {
    if (geometry.length < 2) return Infinity;

    let minDistance = Infinity;

    for (let i = 0; i < geometry.length - 1; i++) {
      const segmentStart: [number, number] = [geometry[i].lat, geometry[i].lon];
      const segmentEnd: [number, number] = [geometry[i + 1].lat, geometry[i + 1].lon];

      const distance = this.pointToLineSegmentDistance(point, segmentStart, segmentEnd);
      minDistance = Math.min(minDistance, distance);
    }

    return minDistance;
  }

  /**
   * Calculate distance from point to line segment
   */
  private pointToLineSegmentDistance(
    point: [number, number],
    segmentStart: [number, number],
    segmentEnd: [number, number],
  ): number {
    const [px, py] = point;
    const [ax, ay] = segmentStart;
    const [bx, by] = segmentEnd;

    // Vector from A to B
    const ABx = bx - ax;
    const ABy = by - ay;

    // Vector from A to P
    const APx = px - ax;
    const APy = py - ay;

    // Calculate the projection of AP onto AB
    const AB_squared = ABx * ABx + ABy * ABy;

    if (AB_squared === 0) {
      // A and B are the same point, return distance to A
      return this.calculateDistance(px, py, ax, ay);
    }

    const t = Math.max(0, Math.min(1, (APx * ABx + APy * ABy) / AB_squared));

    // Find the closest point on the line segment
    const closestX = ax + t * ABx;
    const closestY = ay + t * ABy;

    // Return distance from point to closest point on segment
    return this.calculateDistance(px, py, closestX, closestY);
  }

  /**
   * Calculate geometry center point
   */
  private calculateGeometryCenter(geometry: Array<{ lat: number; lon: number }>): {
    lat: number;
    lng: number;
  } {
    if (geometry.length === 0) return { lat: 0, lng: 0 };
    if (geometry.length === 1) return { lat: geometry[0].lat, lng: geometry[0].lon };

    const sumLat = geometry.reduce((sum, point) => sum + point.lat, 0);
    const sumLng = geometry.reduce((sum, point) => sum + point.lon, 0);

    return {
      lat: sumLat / geometry.length,
      lng: sumLng / geometry.length,
    };
  }

  /**
   * Map highway types from OSM tags to road classification
   */
  private mapHighwayType(highway: string): string {
    const typeMap: Record<string, string> = {
      motorway: 'interstate',
      trunk: 'us_highway',
      primary: 'state_highway',
      secondary: 'state_highway',
    };

    return typeMap[highway] || 'highway';
  }

  /**
   * Classify road type from name only (for POI service results)
   */
  private classifyRoadTypeFromName(name: string): string {
    const lowerName = name.toLowerCase();

    // Interstate highways
    if (lowerName.includes('interstate') || lowerName.match(/\bi-?\d+\b/)) {
      return 'interstate';
    }

    // US highways
    if (
      lowerName.includes('us highway') ||
      lowerName.includes('us route') ||
      lowerName.match(/\bus-?\d+\b/)
    ) {
      return 'us_highway';
    }

    // State highways
    if (
      lowerName.includes('state route') ||
      lowerName.includes('state highway') ||
      lowerName.match(/\b(sr|ca|ny|nj|il|tx|fl)-?\d+\b/)
    ) {
      return 'state_highway';
    }

    // Major highways (expressways, parkways, etc.)
    if (
      lowerName.includes('parkway') ||
      lowerName.includes('expressway') ||
      lowerName.includes('freeway') ||
      lowerName.includes('turnpike') ||
      lowerName.includes('beltway') ||
      lowerName.includes('bypass')
    ) {
      return 'major_highway';
    }

    // County roads
    if (
      lowerName.includes('county') ||
      lowerName.includes('farm to market') ||
      lowerName.match(/\b(cr|co|county)-?\d+\b/)
    ) {
      return 'county_road';
    }

    // Default to arterial for named roads
    return 'arterial';
  }

  /**
   * Classify road type based on highway tags and reference numbers
   */
  private classifyRoadType(highway: string, ref?: string, name?: string): string {
    // Interstate highways
    if (
      highway === 'motorway' ||
      ref?.match(/^I-?\d+$/i) ||
      name?.toLowerCase().includes('interstate')
    ) {
      return 'interstate';
    }

    // US highways
    if (
      highway === 'trunk' ||
      ref?.match(/^US-?\d+$/i) ||
      name?.toLowerCase().includes('us highway')
    ) {
      return 'us_highway';
    }

    // State highways
    if (
      highway === 'primary' ||
      ref?.match(/^(SR|CA|NY|NJ|IL|TX|FL)-?\d+$/i) ||
      name?.toLowerCase().includes('state route') ||
      name?.toLowerCase().includes('state highway')
    ) {
      return 'state_highway';
    }

    // County roads
    if (
      highway === 'secondary' ||
      ref?.match(/^(CR|CO|COUNTY)-?\d+$/i) ||
      name?.toLowerCase().includes('county') ||
      name?.toLowerCase().includes('farm to market')
    ) {
      return 'county_road';
    }

    // Arterial roads (major city streets)
    if (highway === 'tertiary' || highway === 'unclassified') {
      return 'arterial';
    }

    // Local roads
    if (highway === 'residential' || highway === 'service') {
      return 'local_road';
    }

    // Special cases
    if (
      name?.toLowerCase().includes('parkway') ||
      name?.toLowerCase().includes('expressway') ||
      name?.toLowerCase().includes('freeway') ||
      name?.toLowerCase().includes('turnpike')
    ) {
      return 'major_highway';
    }

    // Default classification based on OSM highway tag
    switch (highway) {
      case 'motorway':
      case 'motorway_link':
        return 'interstate';
      case 'trunk':
      case 'trunk_link':
        return 'major_highway';
      case 'primary':
      case 'primary_link':
        return 'state_highway';
      case 'secondary':
      case 'secondary_link':
        return 'county_road';
      case 'tertiary':
      case 'tertiary_link':
        return 'arterial';
      case 'unclassified':
        return 'arterial';
      case 'residential':
        return 'local_road';
      case 'service':
        return 'service_road';
      default:
        return 'unknown';
    }
  }

  /**
   * Create display name combining highway name and reference number
   */
  private createDisplayName(name?: string, ref?: string, type?: string): string {
    // If we have both name and ref, combine them intelligently
    if (name && ref) {
      const formattedRef = this.formatHighwayRef(ref);

      // If the name already contains the ref, just return the name
      if (
        name.toLowerCase().includes(ref.toLowerCase()) ||
        name.toLowerCase().includes(formattedRef.toLowerCase())
      ) {
        return name;
      }

      // Otherwise combine them: "Interstate 287 (Cross Westchester Expressway)"
      return `${formattedRef} (${name})`;
    }

    // If we only have ref, format it nicely
    if (ref) {
      return this.formatHighwayRef(ref);
    }

    // If we only have name, return it as-is
    if (name) {
      return name;
    }

    return 'Unknown Highway';
  }

  /**
   * Format highway reference numbers for display
   */
  private formatHighwayRef(ref: string): string {
    if (ref.match(/^I-?\d+$/i)) {
      return `Interstate ${ref.replace(/^I-?/i, '')}`;
    }
    if (ref.match(/^US-?\d+$/i)) {
      return `US Highway ${ref.replace(/^US-?/i, '')}`;
    }
    if (ref.match(/^SR-?\d+$/i) || ref.match(/^CA-?\d+$/i)) {
      return `State Route ${ref.replace(/^(SR|CA)-?/i, '')}`;
    }
    if (ref.match(/^[A-Z]{2}-?\d+$/i)) {
      const state = ref.substring(0, 2).toUpperCase();
      const number = ref.replace(/^[A-Z]{2}-?/i, '');
      return `${state} ${number}`;
    }
    if (ref.match(/^\d+$/)) {
      return `Highway ${ref}`;
    }

    return ref;
  }

  /**
   * Extract highway reference number from road name (for Google Roads API results)
   */
  private extractHighwayRef(roadName: string): string | undefined {
    if (!roadName) return undefined;

    const name = roadName.toLowerCase();

    // Interstate patterns
    const interstateMatch = name.match(/interstate\s+(\d+)/i) || name.match(/i-?(\d+)/i);
    if (interstateMatch) {
      return `I-${interstateMatch[1]}`;
    }

    // US Highway patterns
    const usMatch = name.match(/us\s+highway\s+(\d+)/i) || name.match(/us-?(\d+)/i);
    if (usMatch) {
      return `US-${usMatch[1]}`;
    }

    // State highway patterns (e.g., "New Jersey 440", "NY 440")
    const stateMatch =
      name.match(/(new\s+jersey|nj)\s+(\d+)/i) ||
      name.match(/(new\s+york|ny)\s+(\d+)/i) ||
      name.match(/(illinois|il)\s+(\d+)/i) ||
      name.match(/([a-z]{2})\s+(\d+)/i);
    if (stateMatch) {
      const state = stateMatch[1].replace(/\s+/g, '').substring(0, 2).toUpperCase();
      return `${state}-${stateMatch[2]}`;
    }

    // Route patterns
    const routeMatch = name.match(/route\s+(\d+)/i) || name.match(/sr\s+(\d+)/i);
    if (routeMatch) {
      return `SR-${routeMatch[1]}`;
    }

    return undefined;
  }

  /**
   * Format highway names for display (legacy function, kept for compatibility)
   */
  private formatHighwayName(ref: string, type: string): string {
    return this.formatHighwayRef(ref);
  }

  /**
   * Calculate confidence based on geometric distance and geometry quality
   */
  private calculateGeometricConfidence(distance: number, geometryPoints: number): number {
    let confidence = 0.5;

    // Distance-based confidence (closer = higher confidence)
    if (distance <= 50) confidence += 0.4;
    else if (distance <= 200) confidence += 0.3;
    else if (distance <= 500) confidence += 0.2;
    else if (distance <= 1000) confidence += 0.1;

    // Geometry quality bonus
    if (geometryPoints >= 10) confidence += 0.1;
    else if (geometryPoints >= 5) confidence += 0.05;

    return Math.min(1.0, confidence);
  }

  /**
   * Calculate enhanced confidence for Method 4
   */
  private calculateEnhancedConfidence(
    distance: number,
    type: string,
    geometryPoints: number,
  ): number {
    let confidence = this.calculateGeometricConfidence(distance, geometryPoints);

    // Type-based confidence boost
    if (type === 'interstate') confidence += 0.1;
    else if (type === 'us_highway') confidence += 0.08;
    else if (type === 'state_highway') confidence += 0.05;

    return Math.min(1.0, confidence);
  }

  /**
   * Process method result from Promise.allSettled
   */
  private processMethodResult(
    result: PromiseSettledResult<{
      highways: Array<{
        name: string;
        type: string;
        distance: number;
        confidence: number;
        metadata?: any;
      }>;
      processingTime: number;
    }>,
    method: string,
  ): HighwayDetectionResult {
    if (result.status === 'fulfilled') {
      return {
        highways: result.value.highways,
        processingTime: result.value.processingTime,
        method,
      };
    } else {
      return {
        highways: [],
        processingTime: 0,
        method,
        error: result.reason?.message || 'Unknown error',
      };
    }
  }

  /**
   * Calculate distance between two points using Haversine formula
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Convert degrees to radians
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}
