import { Injectable } from "@danet/core";
import {
  LocationRequestDto,
  LocationResponseDto,
  StoryResponseDto,
} from "./dto/index.ts";
import { POIIdentificationService } from "../poi-discovery/services/poi-identification.service.ts";
import { StoryService } from "../story/services/story.service.ts";
import { LocationData } from "../models/location.model.ts";
import {
  ContentRequestDto,
  ContentStyle,
} from "../story/dto/content-request.dto.ts";
import { StructuredPOIDto, POIType } from "../story/dto/structured-poi.dto.ts";
import { TextPOIDescriptionDto } from "../story/dto/text-poi-description.dto.ts";

interface CachedJourney {
  storyId: string;
  content: string;
  location: LocationData;
  pois: any[];
  generatedAt: Date;
  estimatedDuration: number;
  cacheKey: string;
}

@Injectable()
export class JourneyService {
  private stories = new Map<string, StoryResponseDto>();
  private journeyCache = new Map<string, CachedJourney>();
  private readonly cacheExpiryMs = 24 * 60 * 60 * 1000; // 24 hours

  constructor(
    private poiService: POIIdentificationService,
    private contentService: StoryService
  ) {}

  async processLocation(
    locationData: LocationRequestDto
  ): Promise<LocationResponseDto> {
    const storyId = crypto.randomUUID();

    try {
      console.log(
        `Processing location: ${locationData.latitude}, ${locationData.longitude}`
      );

      // Convert request DTO to LocationData model
      const location: LocationData = {
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        timestamp: new Date(),
        accuracy: locationData.accuracy || 10,
      };

      // Check cache first to avoid duplicate processing
      const cacheKey = this.generateCacheKey(location);
      const cachedJourney = this.getCachedJourney(cacheKey);

      if (cachedJourney) {
        console.log("Found cached journey, returning cached content");

        // Create new story with cached data but new ID
        const story = new StoryResponseDto({
          storyId: storyId,
          content: cachedJourney.content,
          audioUrl: `/api/audio/${storyId}`,
          duration: cachedJourney.estimatedDuration,
          status: "ready",
          location: {
            latitude: location.latitude,
            longitude: location.longitude,
          },
          generatedAt: new Date(), // Use current time for new request
        });

        this.stories.set(storyId, story);

        return new LocationResponseDto({
          storyId,
          audioUrl: story.audioUrl,
          status: "ready",
          estimatedDuration: story.duration,
        });
      }

      // Step 1: Discover POIs near the location
      console.log("Discovering POIs...");
      const pois = await this.poiService.discoverPOIs(location, {
        radiusMeters: 5000, // 5km radius
        maxResults: 10,
      });

      console.log(`Found ${pois.length} POIs`);

      // Step 2: Generate content based on discovered POIs
      let content: string;
      let estimatedDuration: number;

      if (pois.length > 0) {
        // Create structured POI data for content generation
        const primaryPOIs = pois.slice(0, 5); // Use top 5 POIs
        const structuredPOI = new StructuredPOIDto({
          name: this.generateLocationName(primaryPOIs, location),
          type: this.determinePrimaryType(primaryPOIs) as POIType,
          location: {
            country: "United States", // Default for now
            coordinates: {
              latitude: location.latitude,
              longitude: location.longitude,
            },
          },
          context: this.generateLocationContext(primaryPOIs, location),
        });

        const contentRequest = new ContentRequestDto({
          input: structuredPOI,
          targetDuration: 180, // 3 minutes
          contentStyle: ContentStyle.MIXED,
        });

        console.log("Generating content with LLM...");
        const generatedContent = await this.contentService.generateContent(
          contentRequest
        );
        content = generatedContent.content;
        estimatedDuration = generatedContent.estimatedDuration;

        console.log("Content generated successfully");
      } else {
        // Fallback: Generate content based on location coordinates only
        console.log("No POIs found, generating location-based content...");

        const textDescription = new TextPOIDescriptionDto({
          description: `Location at coordinates ${location.latitude.toFixed(
            4
          )}, ${location.longitude.toFixed(
            4
          )}. This area represents a unique point on the map with its own geographic and cultural characteristics.`,
        });

        const contentRequest = new ContentRequestDto({
          input: textDescription,
          targetDuration: 120, // 2 minutes for basic content
          contentStyle: ContentStyle.GEOGRAPHICAL,
        });

        const generatedContent = await this.contentService.generateContent(
          contentRequest
        );
        content = generatedContent.content;
        estimatedDuration = generatedContent.estimatedDuration;
      }

      // Create and store the story
      const story = new StoryResponseDto({
        storyId: storyId,
        content,
        audioUrl: `/api/audio/${storyId}`,
        duration: estimatedDuration,
        status: "ready",
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
        },
        generatedAt: new Date(),
      });

      this.stories.set(storyId, story);

      // Cache the journey for future requests
      this.cacheJourney(cacheKey, {
        storyId,
        content,
        location,
        pois,
        generatedAt: new Date(),
        estimatedDuration,
        cacheKey,
      });

      console.log(
        `Journey processing completed successfully for story ${storyId}`
      );

      return new LocationResponseDto({
        storyId,
        audioUrl: story.audioUrl,
        status: "ready",
        estimatedDuration: story.duration,
      });
    } catch (error) {
      console.error("Error processing location:", error);

      // Enhanced error handling with service coordination failure recovery
      const fallbackContent = await this.generateFallbackContent(
        locationData,
        error
      );
      const estimatedDuration = 120; // 2 minutes for fallback

      const story = new StoryResponseDto({
        storyId: storyId,
        content: fallbackContent,
        audioUrl: `/api/audio/${storyId}`,
        duration: estimatedDuration,
        status: "ready",
        location: {
          latitude: locationData.latitude,
          longitude: locationData.longitude,
        },
        generatedAt: new Date(),
      });

      this.stories.set(storyId, story);

      return new LocationResponseDto({
        storyId,
        audioUrl: story.audioUrl,
        status: "ready",
        estimatedDuration: story.duration,
      });
    }
  }

  getStory(storyId: string): StoryResponseDto | null {
    const story = this.stories.get(storyId);
    return story || null;
  }

  getHealth(): { status: string; stories: number } {
    return {
      status: "healthy",
      stories: this.stories.size,
    };
  }

  // Private helper methods for journey processing

  private generateCacheKey(location: LocationData): string {
    // Round coordinates to 3 decimal places for cache key (~100m precision)
    const lat = Math.round(location.latitude * 1000) / 1000;
    const lng = Math.round(location.longitude * 1000) / 1000;
    return `journey_${lat}_${lng}`;
  }

  private getCachedJourney(cacheKey: string): CachedJourney | null {
    const cached = this.journeyCache.get(cacheKey);
    if (!cached) return null;

    // Check if cache has expired
    const now = new Date().getTime();
    const cacheTime = cached.generatedAt.getTime();
    if (now - cacheTime > this.cacheExpiryMs) {
      this.journeyCache.delete(cacheKey);
      return null;
    }

    return cached;
  }

  private cacheJourney(cacheKey: string, journey: CachedJourney): void {
    this.journeyCache.set(cacheKey, journey);

    // Clean up old cache entries periodically
    if (this.journeyCache.size > 1000) {
      this.cleanupCache();
    }
  }

  private cleanupCache(): void {
    const now = new Date().getTime();
    const keysToDelete: string[] = [];

    for (const [key, journey] of this.journeyCache.entries()) {
      if (now - journey.generatedAt.getTime() > this.cacheExpiryMs) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => this.journeyCache.delete(key));
    console.log(`Cleaned up ${keysToDelete.length} expired cache entries`);
  }

  private generateLocationName(pois: any[], location: LocationData): string {
    if (pois.length === 0) {
      return `Location ${location.latitude.toFixed(
        3
      )}, ${location.longitude.toFixed(3)}`;
    }

    // Prioritize towns, counties, and major roads for naming
    const town = pois.find((poi) => poi.category === "town");
    const county = pois.find((poi) => poi.category === "county");
    const majorRoad = pois.find((poi) => poi.category === "major_road");

    if (town) return `Near ${town.name}`;
    if (majorRoad) return `Along ${majorRoad.name}`;
    if (county) return `In ${county.name}`;

    return (
      pois[0].name ||
      `Location ${location.latitude.toFixed(3)}, ${location.longitude.toFixed(
        3
      )}`
    );
  }

  private determinePrimaryType(pois: any[]): POIType {
    if (pois.length === 0) return POIType.LANDMARK;

    // Count categories to determine primary type
    const categoryCounts = new Map<string, number>();
    pois.forEach((poi) => {
      const count = categoryCounts.get(poi.category) || 0;
      categoryCounts.set(poi.category, count + 1);
    });

    // Return the most common category, mapped to POIType
    let maxCount = 0;
    let primaryCategory = "landmark";
    for (const [category, count] of categoryCounts.entries()) {
      if (count > maxCount) {
        maxCount = count;
        primaryCategory = category;
      }
    }

    // Map category strings to POIType enum values
    const categoryMap: Record<string, POIType> = {
      town: POIType.TOWN,
      city: POIType.CITY,
      landmark: POIType.LANDMARK,
      park: POIType.PARK,
      museum: POIType.MUSEUM,
      arboretum: POIType.ARBORETUM,
      historical_site: POIType.HISTORICAL_SITE,
      natural_feature: POIType.NATURAL_FEATURE,
      institution: POIType.INSTITUTION,
      waterway: POIType.WATERWAY,
      bridge: POIType.BRIDGE,
      mountain: POIType.MOUNTAIN,
      valley: POIType.VALLEY,
      airport: POIType.AIRPORT,
      train_station: POIType.TRAIN_STATION,
      cultural_center: POIType.CULTURAL_CENTER,
      theater: POIType.THEATER,
      religious_site: POIType.RELIGIOUS_SITE,
      military_site: POIType.MILITARY_SITE,
      agricultural_site: POIType.AGRICULTURAL_SITE,
    };

    return categoryMap[primaryCategory] || POIType.LANDMARK;
  }

  private calculateOverallSignificance(pois: any[]): number {
    if (pois.length === 0) return 0.3;

    const scores = pois
      .map((poi) => poi.metadata?.significanceScore || 0.5)
      .filter((score) => score > 0);

    if (scores.length === 0) return 0.3;

    // Calculate weighted average with higher weight for top POIs
    let weightedSum = 0;
    let totalWeight = 0;

    scores.forEach((score, index) => {
      const weight = Math.max(1, 5 - index); // Higher weight for first POIs
      weightedSum += score * weight;
      totalWeight += weight;
    });

    return Math.min(1.0, weightedSum / totalWeight);
  }

  private generateLocationContext(pois: any[], location: LocationData): string {
    if (pois.length === 0) {
      return `Geographic coordinates ${location.latitude.toFixed(
        4
      )}, ${location.longitude.toFixed(4)}`;
    }

    const contextParts: string[] = [];

    // Add geographic context
    const town = pois.find((poi) => poi.category === "town");
    const county = pois.find((poi) => poi.category === "county");
    if (town) contextParts.push(`in ${town.name}`);
    if (county && county.name !== town?.name)
      contextParts.push(`${county.name}`);

    // Add transportation context
    const majorRoad = pois.find((poi) => poi.category === "major_road");
    if (majorRoad) contextParts.push(`near ${majorRoad.name}`);

    // Add notable landmarks
    const landmarks = pois
      .filter((poi) =>
        ["landmark", "museum", "park", "institution"].includes(poi.category)
      )
      .slice(0, 2);

    if (landmarks.length > 0) {
      const landmarkNames = landmarks.map((poi) => poi.name).join(" and ");
      contextParts.push(`close to ${landmarkNames}`);
    }

    return (
      contextParts.join(", ") ||
      `at coordinates ${location.latitude.toFixed(
        4
      )}, ${location.longitude.toFixed(4)}`
    );
  }

  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in kilometers
  }

  private async generateFallbackContent(
    locationData: LocationRequestDto,
    error: any
  ): Promise<string> {
    console.log("Generating fallback content due to error:", error.message);

    // Try to determine what service failed and provide appropriate fallback
    const errorMessage = error.message?.toLowerCase() || "";

    if (errorMessage.includes("poi") || errorMessage.includes("discovery")) {
      return `Welcome to the area around ${locationData.latitude.toFixed(
        4
      )}, ${locationData.longitude.toFixed(
        4
      )}. While we're experiencing some technical difficulties discovering specific points of interest, this location has its own unique character and stories. Every place on the map has something interesting to offer, from its geographic features to its local history and culture.`;
    }

    if (
      errorMessage.includes("content") ||
      errorMessage.includes("llm") ||
      errorMessage.includes("generation")
    ) {
      return `You're currently at coordinates ${locationData.latitude.toFixed(
        4
      )}, ${locationData.longitude.toFixed(
        4
      )}. Our content generation service is temporarily unavailable, but this location represents a unique point on your journey. Take a moment to observe your surroundings and appreciate the landscape and local features that make this place special.`;
    }

    // Generic fallback
    return `Welcome to ${locationData.latitude.toFixed(
      4
    )}, ${locationData.longitude.toFixed(
      4
    )}. We're experiencing some technical difficulties with our services, but your journey continues. This location, like every point on the map, has its own story and significance. Take in the scenery and enjoy this moment of your travels.`;
  }
}
