import { Body, Controller, Post, HTTP_STATUS, HttpException } from '@danet/core';
import { HighwayDetectionComparisonService } from './services/highway-detection-comparison.service.ts';
import { LocationData } from '../models/location.model.ts';

/**
 * Highway detection comparison interfaces
 */
export interface HighwayDetectionComparison {
  location: {
    latitude: number;
    longitude: number;
  };
  methods: {
    current: HighwayDetectionResult;
    pointToLine: HighwayDetectionResult;
    googleRoads: HighwayDetectionResult;
    enhancedOverpass: HighwayDetectionResult;
  };
  timestamp: Date;
}

export interface HighwayDetectionResult {
  highways: Array<{
    name: string;
    ref?: string;
    displayName: string;
    type: string;
    roadType: string;
    distance: number;
    confidence: number;
    metadata?: any;
  }>;
  processingTime: number;
  method: string;
  error?: string;
}

@Controller('api/highway')
export class HighwayDetectionController {
  constructor(private readonly comparisonService: HighwayDetectionComparisonService) {}

  @Post('detection-comparison')
  async compareHighwayDetectionMethods(
    @Body() body: Record<string, unknown>,
  ): Promise<HighwayDetectionComparison> {
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

      // Use the comparison service to run all detection methods
      return await this.comparisonService.compareDetectionMethods(location);
    } catch (error) {
      throw new HttpException(
        HTTP_STATUS.BAD_REQUEST,
        `Failed to compare highway detection methods: ${error}`,
      );
    }
  }
}
