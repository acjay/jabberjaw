import { Controller, Get, Post } from "@danet/core";
import { Body, ReturnedSchema } from "@danet/zod";
import { POIIdentificationService } from "./services/poi-identification.service.ts";
import { GoogleRoadsService } from "./services/google-roads.service.ts";
import { LocationData } from "../models/location.model.ts";
import {
  getPOICategoriesByGroup,
  PointOfInterest,
} from "../models/poi.model.ts";
import {
  POIDiscoveryRequestSchema,
  POIDiscoveryResponseSchema,
  POIFilterRequestSchema,
  TopSignificantPOIsRequestSchema,
  RoadsSnapRequestSchema,
  RoadsSnapResponseSchema,
  RoadsNearestResponseSchema,
  HealthResponseSchema,
  type POIDiscoveryRequest,
  type POIDiscoveryResponse,
  type POIFilterRequest,
  type TopSignificantPOIsRequest,
  type RoadsSnapRequest,
  type RoadsSnapResponse,
  type RoadsNearestResponse,
  type HealthResponse,
} from "../shared/schemas/index.ts";

@Controller("api/poi")
export class POIDiscoveryController {
  constructor(
    private readonly poiService: POIIdentificationService,
    private readonly googleRoadsService: GoogleRoadsService
  ) {}

  @Post("discover")
  @ReturnedSchema(POIDiscoveryResponseSchema)
  async discoverPOIs(
    @Body(POIDiscoveryRequestSchema) body: POIDiscoveryRequest
  ): Promise<POIDiscoveryResponse> {
    // Convert to LocationData model
    const location: LocationData = {
      latitude: body.latitude,
      longitude: body.longitude,
      timestamp: new Date(),
      accuracy: 10, // Default accuracy for API requests
    };

    // Discover POIs
    let pois = await this.poiService.discoverPOIs(location, {
      radiusMeters: body.radiusMeters,
      maxResults: body.maxResults,
    });

    // Sort by significance if requested
    if (body.sortBySignificance) {
      pois = this.poiService.sortBySignificance(pois);
    }

    // Convert POIs to match schema format
    const schemaPois = pois.map((poi) => ({
      id: poi.id,
      name: poi.name,
      type: poi.category, // Use category as type
      category: poi.category,
      location: poi.location,
      distance: undefined, // Not available in current POIMetadata
      significance: poi.metadata?.significanceScore,
      description: poi.description,
      tags: poi.metadata?.significance, // Use significance array as tags
    }));

    return {
      pois: schemaPois,
      location: {
        latitude: body.latitude,
        longitude: body.longitude,
      },
      searchRadius: body.radiusMeters,
      totalFound: schemaPois.length,
      timestamp: new Date(),
    };
  }

  @Post("filter")
  @ReturnedSchema(POIDiscoveryResponseSchema)
  async filterPOIsByDistance(
    @Body(POIFilterRequestSchema) body: POIFilterRequest
  ): Promise<POIDiscoveryResponse> {
    const centerLocation: LocationData = {
      latitude: body.centerLocation.latitude,
      longitude: body.centerLocation.longitude,
      timestamp: new Date(),
      accuracy: 10,
    };

    // Convert schema POIs to model POIs for filtering
    const modelPois: PointOfInterest[] = body.pois.map((poi) => ({
      id: poi.id,
      name: poi.name,
      category: poi.category as any, // Type assertion for now
      location: poi.location,
      description: poi.description || "",
      locationDescription: poi.locationDescription,
      metadata: {
        significanceScore: poi.significance || 0.5,
        significance: poi.tags || [], // Use tags as significance array
      },
    }));

    // Filter POIs by distance
    const filteredPOIs = this.poiService.filterByDistance(
      modelPois,
      centerLocation,
      body.maxDistanceMeters
    );

    // Convert back to schema format
    const schemaPois = filteredPOIs.map((poi) => ({
      id: poi.id,
      name: poi.name,
      type: poi.category, // Use category as type
      category: poi.category,
      location: poi.location,
      distance: undefined, // Not available in current POIMetadata
      significance: poi.metadata?.significanceScore,
      description: poi.description,
      locationDescription: poi.locationDescription,
      tags: poi.metadata?.significance, // Use significance array as tags
    }));

    return {
      pois: schemaPois,
      location: {
        latitude: centerLocation.latitude,
        longitude: centerLocation.longitude,
      },
      searchRadius: body.maxDistanceMeters,
      totalFound: schemaPois.length,
      timestamp: new Date(),
    };
  }

  @Post("top-significant")
  async getTopSignificantPOIs(
    @Body(TopSignificantPOIsRequestSchema) body: TopSignificantPOIsRequest
  ): Promise<{
    pois: PointOfInterest[];
    location: { latitude: number; longitude: number };
    timestamp: Date;
  }> {
    // Convert to LocationData model
    const location: LocationData = {
      latitude: body.latitude,
      longitude: body.longitude,
      timestamp: new Date(),
      accuracy: 10,
    };

    // Fixed configuration optimized for getting top significant POIs
    const searchConfig = {
      radiusMeters: body.radius,
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
  }

  @Get("categories")
  getPOICategories(): {
    categories: string[];
    groups: Record<string, string[]>;
  } {
    const groups = getPOICategoriesByGroup();

    // Get all unique categories
    const allCategories = Object.values(groups).flat();

    return {
      categories: allCategories,
      groups,
    };
  }

  @Post("roads/snap")
  @ReturnedSchema(RoadsSnapResponseSchema)
  async snapToRoads(
    @Body(RoadsSnapRequestSchema) body: RoadsSnapRequest
  ): Promise<RoadsSnapResponse> {
    const location: LocationData = {
      latitude: body.latitude,
      longitude: body.longitude,
      timestamp: new Date(),
      accuracy: 10,
    };

    const roadInfo = await this.googleRoadsService.snapToRoads(location);

    // Convert RoadInfo to schema format
    const schemaRoadInfo = roadInfo
      ? {
          name: roadInfo.roadName,
          type: undefined, // Not available in current RoadInfo
          highway: undefined,
          ref: undefined,
          maxSpeed: undefined,
          surface: undefined,
          lanes: undefined,
          oneway: undefined,
          bridge: undefined,
          tunnel: undefined,
          toll: undefined,
        }
      : null;

    return {
      roadInfo: schemaRoadInfo,
      location: {
        latitude: body.latitude,
        longitude: body.longitude,
      },
      timestamp: new Date().toISOString(),
    };
  }

  @Post("roads/nearest")
  @ReturnedSchema(RoadsNearestResponseSchema)
  async findNearestRoads(
    @Body(RoadsSnapRequestSchema) body: RoadsSnapRequest
  ): Promise<RoadsNearestResponse> {
    const location: LocationData = {
      latitude: body.latitude,
      longitude: body.longitude,
      timestamp: new Date(),
      accuracy: 10,
    };

    const roads = await this.googleRoadsService.findNearestRoads(location);

    // Convert RoadInfo array to schema format
    const schemaRoads = roads.map((road) => ({
      name: road.roadName,
      type: undefined, // Not available in current RoadInfo
      highway: undefined,
      ref: undefined,
      maxSpeed: undefined,
      surface: undefined,
      lanes: undefined,
      oneway: undefined,
      bridge: undefined,
      tunnel: undefined,
      toll: undefined,
    }));

    return {
      roads: schemaRoads,
      location: {
        latitude: body.latitude,
        longitude: body.longitude,
      },
      timestamp: new Date().toISOString(),
    };
  }

  @Get("roads/test")
  async testGoogleRoadsConnection(): Promise<{
    configured: boolean;
    connectionTest: boolean;
    timestamp: Date;
  }> {
    const configured = await this.googleRoadsService.isConfigured();
    let connectionTest = false;

    if (configured) {
      try {
        connectionTest = await this.googleRoadsService.testConnection();
      } catch (error) {
        console.error("Google Roads connection test failed:", error);
      }
    }

    return {
      configured,
      connectionTest,
      timestamp: new Date(),
    };
  }

  @Get("health")
  @ReturnedSchema(HealthResponseSchema)
  getHealth(): HealthResponse {
    return {
      status: "healthy",
      service: "poi-discovery",
      timestamp: new Date(),
    };
  }
}
