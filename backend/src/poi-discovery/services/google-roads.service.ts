import { Injectable } from "@danet/core";
import { LocationData } from "../../models/location.model.ts";
import { GoogleMapsClient } from "../../shared/index.ts";
import { ConfigurationService } from "../../configuration/index.ts";
import {
  type SnapToRoadsResponse,
  type NearestRoadsResponse,
  type SnappedPoint,
  type PlaceDetailsResponse,
} from "../../shared/schemas/index.ts";

export interface RoadInfo {
  roadName?: string;
  placeId: string;
  snappedLocation: {
    lat: number;
    lng: number;
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
  private apiKey: string | undefined;

  constructor(
    private readonly googleMapsClient: GoogleMapsClient,
    private readonly configService: ConfigurationService
  ) {}

  private async ensureInitialized(): Promise<void> {
    if (this.apiKey === undefined) {
      try {
        this.apiKey = await this.configService.getGoogleRoadsApiKey();
      } catch (error) {
        console.warn(
          "Google Roads API key not configured. Service will not function properly."
        );
        this.apiKey = "";
      }
    }
  }

  /**
   * Snap a location to the nearest road using Google Roads API
   * This is the primary method for direct road identification
   */
  async snapToRoads(location: LocationData): Promise<RoadInfo | null> {
    await this.ensureInitialized();

    if (!this.apiKey) {
      throw new Error("Google Roads API key not configured");
    }

    try {
      const data: SnapToRoadsResponse = await this.googleMapsClient.snapToRoads(
        {
          path: `${location.latitude},${location.longitude}`,
          interpolate: "true",
          key: this.apiKey,
        }
      );

      if (!data.snappedPoints || data.snappedPoints.length === 0) {
        return null; // No road found at this location
      }

      const snappedPoint = data.snappedPoints[0];
      const distanceFromOriginal = this.calculateDistance(
        location.latitude,
        location.longitude,
        snappedPoint.location.lat,
        snappedPoint.location.lng
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
      console.error("Error in snapToRoads:", error);
      throw error;
    }
  }

  /**
   * Find nearest roads using Google Roads API
   * Alternative method that doesn't require the user to be exactly on a road
   */
  async findNearestRoads(location: LocationData): Promise<RoadInfo[]> {
    await this.ensureInitialized();

    if (!this.apiKey) {
      throw new Error("Google Roads API key not configured");
    }

    try {
      const data: NearestRoadsResponse =
        await this.googleMapsClient.nearestRoads({
          points: `${location.latitude},${location.longitude}`,
          key: this.apiKey,
        });

      if (!data.snappedPoints || data.snappedPoints.length === 0) {
        return [];
      }

      const roadInfos: RoadInfo[] = [];

      for (const snappedPoint of data.snappedPoints) {
        const distanceFromOriginal = this.calculateDistance(
          location.latitude,
          location.longitude,
          snappedPoint.location.lat,
          snappedPoint.location.lng
        );

        // Get road name using the place ID
        const roadName = await this.getRoadNameFromPlaceId(
          snappedPoint.placeId
        );

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
        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      // Sort by distance (closest first)
      return roadInfos.sort(
        (a, b) => a.distanceFromOriginal - b.distanceFromOriginal
      );
    } catch (error) {
      console.error("Error in findNearestRoads:", error);
      throw error;
    }
  }

  /**
   * Get road name from Google Places API using place ID
   */
  private async getRoadNameFromPlaceId(
    placeId: string
  ): Promise<string | undefined> {
    try {
      const data = await this.googleMapsClient.placeDetails({
        place_id: placeId,
        fields: "name,formatted_address,types",
        key: this.apiKey!,
      });

      if (data.result) {
        // Prefer the name field, but fall back to formatted_address
        return (
          data.result.name ||
          this.extractRoadNameFromAddress(data.result.formatted_address || "")
        );
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
    if (!address) return "Unknown Road";

    // Try to extract the first part of the address which is usually the road name
    const parts = address.split(",");
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

    return Math.max(0, 1 - distanceMeters / 1000);
  }

  /**
   * Calculate distance between two points using Haversine formula
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
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

  /**
   * Check if the service is properly configured
   */
  async isConfigured(): Promise<boolean> {
    await this.ensureInitialized();
    return !!this.apiKey;
  }

  /**
   * Test the API connection
   */
  async testConnection(): Promise<boolean> {
    await this.ensureInitialized();

    if (!this.apiKey) {
      return false;
    }

    try {
      // Test with a known location (Times Square, NYC)
      const testLocation: LocationData = {
        latitude: 40.758,
        longitude: -73.9855,
        timestamp: new Date(),
        accuracy: 10,
      };

      const result = await this.snapToRoads(testLocation);
      return result !== null;
    } catch (error) {
      console.error("Google Roads API connection test failed:", error);
      return false;
    }
  }
}
