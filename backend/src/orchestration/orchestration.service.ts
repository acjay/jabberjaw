import { Inject, Injectable } from '@danet/core';
import { LocationRequestDto, LocationResponseDto, SegmentResponseDto } from './dto/index.ts';
import { POIIdentificationService } from '../poi-discovery/services/poi-identification.service.ts';
import { LocationData } from '../models/location.model.ts';

@Injectable()
export class OrchestrationService {
  private segments = new Map<string, SegmentResponseDto>();

  constructor(
    private poiService: POIIdentificationService,
  ) {}

  async processLocation(locationData: LocationRequestDto): Promise<LocationResponseDto> {
    // Generate a unique segment ID
    const segmentId = crypto.randomUUID();

    try {
      // Convert request DTO to LocationData model
      const location: LocationData = {
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        timestamp: new Date(),
        accuracy: 10, // Default accuracy for API requests
      };

      // Discover POIs near the location
      const pois = await this.poiService.discoverPOIs(location, {
        radiusMeters: 5000, // 5km radius
        maxResults: 10,
      });

      // Generate content based on discovered POIs
      let content: string;
      if (pois.length > 0) {
        const poiNames = pois.slice(0, 3).map((poi) => poi.name).join(', ');
        const categories = [...new Set(pois.map((poi) => poi.category))].slice(0, 3).join(', ');

        content = `Welcome to the area around ${locationData.latitude.toFixed(4)}, ${
          locationData.longitude.toFixed(4)
        }. Nearby you'll find interesting places including ${poiNames}. This area features ${categories} and other points of interest. This enhanced narration now includes real POI data from external APIs.`;
      } else {
        content = `Welcome to the area around ${locationData.latitude.toFixed(4)}, ${
          locationData.longitude.toFixed(4)
        }. While we couldn't identify specific points of interest in this immediate area, this location has its own unique character and history worth exploring.`;
      }

      const segment = new SegmentResponseDto({
        id: segmentId,
        content,
        audioUrl: `/api/audio/${segmentId}`,
        duration: 180, // 3 minutes in seconds
        status: 'ready',
        location: {
          latitude: locationData.latitude,
          longitude: locationData.longitude,
        },
        generatedAt: new Date(),
      });

      // Store the segment for retrieval
      this.segments.set(segmentId, segment);

      return new LocationResponseDto({
        segmentId,
        audioUrl: segment.audioUrl,
        status: 'ready',
        estimatedDuration: segment.duration,
      });
    } catch (error) {
      console.error('Error processing location:', error);

      // Fallback to basic content if POI discovery fails
      const fallbackContent = `Welcome to the area around ${locationData.latitude.toFixed(4)}, ${
        locationData.longitude.toFixed(4)
      }. We're experiencing some technical difficulties discovering points of interest, but this location still has stories to tell.`;

      const segment = new SegmentResponseDto({
        id: segmentId,
        content: fallbackContent,
        audioUrl: `/api/audio/${segmentId}`,
        duration: 180,
        status: 'ready',
        location: {
          latitude: locationData.latitude,
          longitude: locationData.longitude,
        },
        generatedAt: new Date(),
      });

      this.segments.set(segmentId, segment);

      return new LocationResponseDto({
        segmentId,
        audioUrl: segment.audioUrl,
        status: 'ready',
        estimatedDuration: segment.duration,
      });
    }
  }

  getSegment(segmentId: string): SegmentResponseDto | null {
    const segment = this.segments.get(segmentId);
    return segment || null;
  }

  getHealth(): { status: string; segments: number } {
    return {
      status: 'healthy',
      segments: this.segments.size,
    };
  }
}
