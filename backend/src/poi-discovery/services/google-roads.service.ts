import { Injectable } from '@danet/core';
import { LocationData } from '../../models/location.model.ts';

/**
 * Google Roads API response interfaces
 */
export interface SnapToRoadsResponse {
  snappedPoints: SnappedPoint[];
  warningMessage?: string;
}

export interface SnappedPoint {
  location: {
    latitude: number;
    longitude: number;
  };
  originalIndex?: number;
  placeId: string;
}

export interface NearestRoadsResponse {
  snappedPoints: SnappedPoint[];
}

export interface RoadInfo {
  roadName?: string;
  placeId: string;
  snappedLocation: {
    latitude: number;
    longitude: number;
  };
  originalLocation: {
    latitude: number;
    longitude: number;
  };
  distanceFromOriginal: number;
  confidence: number;
}

/**
 * Service for integrating with Google Roads API
 * Provides direct road identification using Google's "Snap to Roads" functionality
 */
@Injectable()
export class GoogleRoadsService {
  private readonly baseUrl = 'https://roads.googleapis.com/v1';
  private readonly apiKey: string;

  constructor() {
    this.apiKey = Deno.env.get('GOOGLE_ROADS_API_KEY') || Deno.env.get('GOOGLE_PLACES_API_KEY') || '';
    
    if (!this.apiKey) {
      console.warn('Google Roads API key not configured. Service will not function properly.');
    }
  }

  /**
   * Snap a location to the nearest road using Google Roads API
   * This is the primary method for direct road identification
   */
  async snapToRoads(location: LocationData): Promise<RoadInfo | null> {
    if (!this.apiKey) {
      throw new Error('Google Roads API key not configured');
    }

    try {
      const url = new URL(`${this.baseUrl}/snapToRoads`);
      url.searchParams.set('path', `${location.latitude},${location.longitude}`);
      url.searchParams.set('interpolate', 'true');
      url.searchParams.set('key', this.apiKey);

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'User-Agent': 'RoadTripNarrator/1.0',
        },
      });

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Google Roads API access denied. Check API key and billing.');
        }
        if (response.status === 429) {
          throw new Error('Google Roads API rate limit exceeded');
        }
        throw new Error(`Google Roads API error: ${response.status} ${response.statusText}`);
      }

      const data: SnapToRoadsResponse = await response.json();

      if (!data.snappedPoints || data.snappedPoints.length === 0) {
        return null; // No road found at this location
      }

      const snappedPoint = data.snappedPoints[0];
      const distanceFromOriginal = this.calculateDistance(
        location.latitude,
        location.longitude,
        snappedPoint.location.latitude,
        snappedPoint.location.longitude
      );

      // Get road name using the place ID
      const roadName = await this.getRoadNameFromPlaceId(snappedPoint.placeId);

      return {
        roadName,
        placeId: snappedPoint.placeId,
        snappedLocation: snappedPoint.location,
        originalLocation: {
          latitude: location.latitude,
          longitude: location.longitude,
        },
        distanceFromOriginal,
        confidence: this.calculateConfidence(distanceFromOriginal),
      };
    } catch (error) {
      console.error('Error in snapToRoads:', error);
      throw error;
    }
  }

  /**
   * Find nearest roads using Google Roads API
   * Alternative method that doesn't require the user to be exactly on a road
   */
  async findNearestRoads(location: LocationData): Promise<RoadInfo[]> {
    if (!this.apiKey) {
      throw new Error('Google Roads API key not configured');
    }

    try {
      const url = new URL(`${this.baseUrl}/nearestRoads`);
      url.searchParams.set('points', `${location.latitude},${location.longitude}`);
      url.searchParams.set('key', this.apiKey);

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'User-Agent': 'RoadTripNarrator/1.0',
        },
      });

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Google Roads API access denied. Check API key and billing.');
        }
        if (response.status === 429) {
          throw new Error('Google Roads API rate limit exceeded');
        }
        throw new Error(`Google Roads API error: ${response.status} ${response.statusText}`);
      }

      const data: NearestRoadsResponse = await response.json();

      if (!data.snappedPoints || data.snappedPoints.length === 0) {
        return [];
      }

      const roadInfos: RoadInfo[] = [];

      for (const snappedPoint of data.snappedPoints) {
        const distanceFromOriginal = this.calculateDistance(
          location.latitude,
          location.longitude,
          snappedPoint.location.latitude,
          snappedPoint.location.longitude
        );

        // Get road name using the place ID
        const roadName = await this.getRoadNameFromPlaceId(snappedPoint.placeId);

        roadInfos.push({
          roadName,
          placeId: snappedPoint.placeId,
          snappedLocation: snappedPoint.location,
          originalLocation: {
            latitude: location.latitude,
            longitude: location.longitude,
          },
          distanceFromOriginal,
          confidence: this.calculateConfidence(distanceFromOriginal),
        });

        // Small delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // Sort by distance (closest first)
      return roadInfos.sort((a, b) => a.distanceFromOriginal - b.distanceFromOriginal);
    } catch (error) {
      console.error('Error in findNearestRoads:', error);
      throw error;
    }
  }

  /**
   * Get road name from Google Places API using place ID
   */
  private async getRoadNameFromPlaceId(placeId: string): Promise<string | undefined> {
    try {
      const url = new URL('https://maps.googleapis.com/maps/api/place/details/json');
      url.searchParams.set('place_id', placeId);
      url.searchParams.set('fields', 'name,formatted_address,types');
      url.searchParams.set('key', this.apiKey);

      const response = await fetch(url.toString());
      
      if (!response.ok) {
        console.warn(`Failed to get place details for ${placeId}: ${response.status}`);
        return undefined;
      }

      const data = await response.json();
      
      if (data.result) {
        // Prefer the name field, but fall back to formatted_address
        return data.result.name || this.extractRoadNameFromAddress(data.result.formatted_address);
      }

      return undefined;
    } catch (error) {
      console.warn(`Error getting road name for place ID ${placeId}:`, error);
      return undefined;
    }
  }

  /**
   * Extract road name from formatted address
   */
  private extractRoadNameFromAddress(address: string): string {
    if (!address) return 'Unknown Road';

    // Try to extract the first part of the address which is usually the road name
    const parts = address.split(',');
    if (parts.length > 0) {
      return parts[0].trim();
    }

    return address;
  }

  /**
   * Calculate confidence score based on distance from original location
   */
  private calculateConfidence(distanceMeters: number): number {
    // Confidence decreases with distance
    // 100% confidence at 0m, decreasing to 0% at 1000m
    if (distanceMeters <= 0) return 1.0;
    if (distanceMeters >= 1000) return 0.0;
    
    return Math.max(0, 1 - (distanceMeters / 1000));
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
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Convert degrees to radians
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Check if the service is properly configured
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Test the API connection
   */
  async testConnection(): Promise<boolean> {
    if (!this.apiKey) {
      return false;
    }

    try {
      // Test with a known location (Times Square, NYC)
      const testLocation: LocationData = {
        latitude: 40.7580,
        longitude: -73.9855,
        timestamp: new Date(),
        accuracy: 10,
      };

      const result = await this.snapToRoads(testLocation);
      return result !== null;
    } catch (error) {
      console.error('Google Roads API connection test failed:', error);
      return false;
    }
  }
}