import { Body, Controller, Get, HTTP_STATUS, HttpException, Post, Query } from '@danet/core';
import { POIIdentificationService } from './services/poi-identification.service.ts';
import { GoogleRoadsService, RoadInfo } from './services/google-roads.service.ts';
import { LocationData } from '../models/location.model.ts';
import { getPOICategoriesByGroup, PointOfInterest } from '../models/poi.model.ts';

/**
 * Request DTO for POI discovery
 */
export class POIDiscoveryRequestDto {
  latitude: number;
  longitude: number;
  radiusMeters?: number;
  maxResults?: number;
  sortBySignificance?: boolean;

  constructor(data: any) {
    if (typeof data.latitude !== 'number' || data.latitude < -90 || data.latitude > 90) {
      throw new Error('Invalid latitude: must be a number between -90 and 90');
    }
    if (typeof data.longitude !== 'number' || data.longitude < -180 || data.longitude > 180) {
      throw new Error('Invalid longitude: must be a number between -180 and 180');
    }

    this.latitude = data.latitude;
    this.longitude = data.longitude;

    // Set defaults and validate optional parameters
    if (data.radiusMeters !== undefined) {
      if (
        typeof data.radiusMeters !== 'number' ||
        data.radiusMeters < 100 ||
        data.radiusMeters > 50000
      ) {
        throw new Error('Invalid radiusMeters: must be between 100 and 50000 meters');
      }
      this.radiusMeters = data.radiusMeters;
    } else {
      this.radiusMeters = 5000;
    }

    if (data.maxResults !== undefined) {
      if (typeof data.maxResults !== 'number' || data.maxResults < 1 || data.maxResults > 100) {
        throw new Error('Invalid maxResults: must be between 1 and 100');
      }
      this.maxResults = data.maxResults;
    } else {
      this.maxResults = 20;
    }

    // Sort by significance parameter
    this.sortBySignificance = data.sortBySignificance === true;
  }
}

/**
 * Response DTO for POI discovery
 */
export class POIDiscoveryResponseDto {
  pois: PointOfInterest[];
  location: {
    latitude: number;
    longitude: number;
  };
  searchRadius: number;
  totalFound: number;
  timestamp: Date;

  constructor(data: {
    pois: PointOfInterest[];
    location: { latitude: number; longitude: number };
    searchRadius: number;
  }) {
    this.pois = data.pois;
    this.location = data.location;
    this.searchRadius = data.searchRadius;
    this.totalFound = data.pois.length;
    this.timestamp = new Date();
  }
}

@Controller('api/poi')
export class POIDiscoveryController {
  constructor(
    private readonly poiService: POIIdentificationService,
    private readonly googleRoadsService: GoogleRoadsService,
  ) {}

  @Post('discover')
  async discoverPOIs(@Body() body: Record<string, unknown>): Promise<POIDiscoveryResponseDto> {
    try {
      // Validate and create request DTO
      const request = new POIDiscoveryRequestDto(body);

      // Convert to LocationData model
      const location: LocationData = {
        latitude: request.latitude,
        longitude: request.longitude,
        timestamp: new Date(),
        accuracy: 10, // Default accuracy for API requests
      };

      // Discover POIs
      let pois = await this.poiService.discoverPOIs(location, {
        radiusMeters: request.radiusMeters || 5000,
        maxResults: request.maxResults || 20,
      });

      // Sort by significance if requested
      if (request.sortBySignificance) {
        pois = this.poiService.sortBySignificance(pois);
      }

      return new POIDiscoveryResponseDto({
        pois,
        location: {
          latitude: request.latitude,
          longitude: request.longitude,
        },
        searchRadius: request.radiusMeters || 5000,
      });
    } catch (error) {
      throw new HttpException(HTTP_STATUS.BAD_REQUEST, `Invalid POI discovery request: ${error}`);
    }
  }

  @Post('filter')
  async filterPOIsByDistance(
    @Body() body: Record<string, unknown>,
  ): Promise<POIDiscoveryResponseDto> {
    try {
      // Validate request
      if (!body.centerLocation || !body.pois || !body.maxDistanceMeters) {
        throw new Error('Missing required fields: centerLocation, pois, maxDistanceMeters');
      }

      const centerLocation: LocationData = {
        latitude: (body.centerLocation as any).latitude,
        longitude: (body.centerLocation as any).longitude,
        timestamp: new Date(),
        accuracy: 10,
      };

      const pois = body.pois as PointOfInterest[];
      const maxDistance = body.maxDistanceMeters as number;

      // Validate distance
      if (maxDistance < 1 || maxDistance > 100000) {
        throw new Error('Invalid maxDistanceMeters: must be between 1 and 100000 meters');
      }

      // Filter POIs by distance
      const filteredPOIs = this.poiService.filterByDistance(pois, centerLocation, maxDistance);

      return new POIDiscoveryResponseDto({
        pois: filteredPOIs,
        location: {
          latitude: centerLocation.latitude,
          longitude: centerLocation.longitude,
        },
        searchRadius: maxDistance,
      });
    } catch (error) {
      throw new HttpException(HTTP_STATUS.BAD_REQUEST, `Invalid POI filter request: ${error}`);
    }
  }

  @Post('top-significant')
  async getTopSignificantPOIs(@Body() body: Record<string, unknown>): Promise<{
    pois: PointOfInterest[];
    location: { latitude: number; longitude: number };
    timestamp: Date;
  }> {
    try {
      // Validate required fields
      if (typeof body.latitude !== 'number' || body.latitude < -90 || body.latitude > 90) {
        throw new Error('Invalid latitude: must be a number between -90 and 90');
      }
      if (typeof body.longitude !== 'number' || body.longitude < -180 || body.longitude > 180) {
        throw new Error('Invalid longitude: must be a number between -180 and 180');
      }

      // Convert to LocationData model
      const location: LocationData = {
        latitude: body.latitude,
        longitude: body.longitude,
        timestamp: new Date(),
        accuracy: 10,
      };

      // Fixed configuration optimized for getting top significant POIs
      const searchConfig = {
        radiusMeters: (body.radius as number) || 5000, // Default 5km radius
        maxResults: 15, // Get more results to ensure we have good top 3
      };

      // Discover POIs
      const pois = await this.poiService.discoverPOIs(location, searchConfig);

      // Sort by significance score and take top 3
      const sortedPOIs = this.poiService.sortBySignificance(pois);
      const topPOIs = sortedPOIs.slice(0, 3);

      return {
        pois: topPOIs,
        location: {
          latitude: body.latitude,
          longitude: body.longitude,
        },
        timestamp: new Date(),
      };
    } catch (error) {
      throw new HttpException(
        HTTP_STATUS.BAD_REQUEST,
        `Failed to get top significant POIs: ${error}`,
      );
    }
  }

  @Get('categories')
  getPOICategories(): { categories: string[]; groups: Record<string, string[]> } {
    const groups = getPOICategoriesByGroup();

    // Get all unique categories
    const allCategories = Object.values(groups).flat();

    return {
      categories: allCategories,
      groups,
    };
  }

  @Post('roads/snap')
  async snapToRoads(@Body() body: Record<string, unknown>): Promise<{
    roadInfo: RoadInfo | null;
    location: { latitude: number; longitude: number };
    timestamp: Date;
  }> {
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
          latitude: body.latitude,
          longitude: body.longitude,
        },
        timestamp: new Date(),
      };
    } catch (error) {
      throw new HttpException(HTTP_STATUS.BAD_REQUEST, `Failed to snap to roads: ${error}`);
    }
  }

  @Post('roads/nearest')
  async findNearestRoads(@Body() body: Record<string, unknown>): Promise<{
    roads: RoadInfo[];
    location: { latitude: number; longitude: number };
    timestamp: Date;
  }> {
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
          latitude: body.latitude,
          longitude: body.longitude,
        },
        timestamp: new Date(),
      };
    } catch (error) {
      throw new HttpException(HTTP_STATUS.BAD_REQUEST, `Failed to find nearest roads: ${error}`);
    }
  }

  @Get('roads/test')
  async testGoogleRoadsConnection(): Promise<{
    configured: boolean;
    connectionTest: boolean;
    timestamp: Date;
  }> {
    const configured = this.googleRoadsService.isConfigured();
    let connectionTest = false;

    if (configured) {
      try {
        connectionTest = await this.googleRoadsService.testConnection();
      } catch (error) {
        console.error('Google Roads connection test failed:', error);
      }
    }

    return {
      configured,
      connectionTest,
      timestamp: new Date(),
    };
  }

  @Get('health')
  getHealth(): { status: string; service: string; timestamp: Date } {
    return {
      status: 'healthy',
      service: 'poi-discovery',
      timestamp: new Date(),
    };
  }
}
