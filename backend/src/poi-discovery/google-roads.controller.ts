import { Body, Controller, Get, Post, HTTP_STATUS, HttpException } from '@danet/core';
import { GoogleRoadsService, RoadInfo } from './services/google-roads.service.ts';
import { LocationData } from '../models/location.model.ts';

/**
 * Request/Response interfaces for Google Roads API endpoints
 */
export interface LocationRequest {
  latitude: number;
  longitude: number;
}

export interface SnapToRoadsResponse {
  roadInfo: RoadInfo | null;
  location: {
    latitude: number;
    longitude: number;
  };
  timestamp: string;
}

export interface NearestRoadsResponse {
  roads: RoadInfo[];
  location: {
    latitude: number;
    longitude: number;
  };
  timestamp: string;
}

export interface ConnectionTestResponse {
  configured: boolean;
  connectionTest: boolean;
  timestamp: string;
}

/**
 * Controller for Google Roads API integration
 * Provides direct road identification using Google's "Snap to Roads" functionality
 */
@Controller('api/poi/roads')
export class GoogleRoadsController {
  constructor(private readonly googleRoadsService: GoogleRoadsService) {}

  /**
   * Test Google Roads API configuration and connectivity
   */
  @Get('test')
  async testConnection(): Promise<ConnectionTestResponse> {
    const configured = this.googleRoadsService.isConfigured();
    let connectionTest = false;

    if (configured) {
      try {
        connectionTest = await this.googleRoadsService.testConnection();
      } catch (error) {
        console.warn('Google Roads API connection test failed:', error);
        connectionTest = false;
      }
    }

    return {
      configured,
      connectionTest,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Snap a location to the nearest road using Google Roads API
   */
  @Post('snap')
  async snapToRoads(@Body() body: Record<string, unknown>): Promise<SnapToRoadsResponse> {
    try {
      // Validate required fields
      if (typeof body.latitude !== 'number' || body.latitude < -90 || body.latitude > 90) {
        throw new Error('Invalid latitude: must be a number between -90 and 90');
      }
      if (typeof body.longitude !== 'number' || body.longitude < -180 || body.longitude > 180) {
        throw new Error('Invalid longitude: must be a number between -180 and 180');
      }

      const location: LocationData = {
        latitude: body.latitude,
        longitude: body.longitude,
        timestamp: new Date(),
        accuracy: 10,
      };

      const roadInfo = await this.googleRoadsService.snapToRoads(location);

      return {
        roadInfo,
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('API key not configured')) {
        throw new HttpException(
          HTTP_STATUS.SERVICE_UNAVAILABLE,
          'Google Roads API is not configured. Please set GOOGLE_ROADS_API_KEY or GOOGLE_PLACES_API_KEY environment variable.',
        );
      }

      if (error instanceof Error && error.message.includes('access denied')) {
        throw new HttpException(
          HTTP_STATUS.FORBIDDEN,
          'Google Roads API access denied. Check API key and billing configuration.',
        );
      }

      if (error instanceof Error && error.message.includes('rate limit')) {
        throw new HttpException(
          HTTP_STATUS.TOO_MANY_REQUESTS,
          'Google Roads API rate limit exceeded. Please try again later.',
        );
      }

      throw new HttpException(
        HTTP_STATUS.BAD_REQUEST,
        `Failed to snap location to roads: ${error}`,
      );
    }
  }

  /**
   * Find nearest roads to a location using Google Roads API
   */
  @Post('nearest')
  async findNearestRoads(@Body() body: Record<string, unknown>): Promise<NearestRoadsResponse> {
    try {
      // Validate required fields
      if (typeof body.latitude !== 'number' || body.latitude < -90 || body.latitude > 90) {
        throw new Error('Invalid latitude: must be a number between -90 and 90');
      }
      if (typeof body.longitude !== 'number' || body.longitude < -180 || body.longitude > 180) {
        throw new Error('Invalid longitude: must be a number between -180 and 180');
      }

      const location: LocationData = {
        latitude: body.latitude,
        longitude: body.longitude,
        timestamp: new Date(),
        accuracy: 10,
      };

      const roads = await this.googleRoadsService.findNearestRoads(location);

      return {
        roads,
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('API key not configured')) {
        throw new HttpException(
          HTTP_STATUS.SERVICE_UNAVAILABLE,
          'Google Roads API is not configured. Please set GOOGLE_ROADS_API_KEY or GOOGLE_PLACES_API_KEY environment variable.',
        );
      }

      if (error instanceof Error && error.message.includes('access denied')) {
        throw new HttpException(
          HTTP_STATUS.FORBIDDEN,
          'Google Roads API access denied. Check API key and billing configuration.',
        );
      }

      if (error instanceof Error && error.message.includes('rate limit')) {
        throw new HttpException(
          HTTP_STATUS.TOO_MANY_REQUESTS,
          'Google Roads API rate limit exceeded. Please try again later.',
        );
      }

      throw new HttpException(HTTP_STATUS.BAD_REQUEST, `Failed to find nearest roads: ${error}`);
    }
  }
}
