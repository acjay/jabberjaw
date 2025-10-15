import { Injectable } from "@danet/core";
import { POIIdentificationService } from "../poi-discovery/services/poi-identification.service.ts";
import { StoryService } from "../story/services/story.service.ts";
import { LocationData } from "../models/location.model.ts";
import { PointOfInterest } from "../models/poi.model.ts";
import {
  JourneyLocationRequest,
  JourneyLocationResponse,
  StoryResponse,
  ContentRequest,
  ContentStyle,
} from "../shared/schemas/index.ts";

interface CachedJourney {
  storyId: string;
  content: string;
  location: LocationData;
  pois: PointOfInterest[];
  generatedAt: Date;
  estimatedDuration: number;
  cacheKey: string;
}

@Injectable()
export class JourneyService {
  private stories = new Map<string, StoryResponse>();
  private journeyCache = new Map<string, CachedJourney>();
  private readonly cacheExpiryMs = 24 * 60 * 60 * 1000; // 24 hours

  constructor(
    private poiService: POIIdentificationService,
    private contentService: StoryService
  ) {}

  async storySeedsForLocation(
    locationData: JourneyLocationRequest
  ): Promise<JourneyLocationResponse> {
    try {
      // Convert request to LocationData format
      const location: LocationData = {
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        timestamp: locationData.timestamp || new Date(),
        accuracy: locationData.accuracy || 10, // Default to 10 meters if not provided
      };

      // Check cache first
      const cacheKey = this.generateCacheKey(location);
      const cached = this.getCachedJourney(cacheKey);
      if (cached) {
        console.log("Returning cached story seeds for location");
        return {
          seeds: [
            {
              id: cached.storyId,
              title: "Cached Story",
              summary: cached.content.substring(0, 200) + "...",
              location: {
                latitude: location.latitude,
                longitude: location.longitude,
              },
              contentStyle: "mixed" as ContentStyle,
              targetDuration: cached.estimatedDuration,
              createdAt: cached.generatedAt,
            },
          ],
          location: {
            latitude: location.latitude,
            longitude: location.longitude,
          },
          timestamp: new Date(),
        };
      }

      // Discover POIs near the location
      console.log(
        `Discovering POIs for location: ${location.latitude}, ${location.longitude}`
      );
      const pois = await this.poiService.discoverPOIs(location, {
        radiusMeters: 5000,
        maxResults: 10,
      });

      console.log(`Found ${pois.length} POIs`);

      // Generate content based on POIs
      let contentRequest: ContentRequest;

      if (pois.length > 0) {
        // Use the most significant POI as structured input, or create a comprehensive text description
        const mostSignificantPOI = pois.reduce((prev, current) =>
          (current.metadata?.significanceScore || 0) >
          (prev.metadata?.significanceScore || 0)
            ? current
            : prev
        );

        // If we have a highly significant POI, use structured input
        if ((mostSignificantPOI.metadata?.significanceScore || 0) > 0.7) {
          contentRequest = {
            input: {
              type: "StructuredPOI",
              name: mostSignificantPOI.name,
              poiType: mostSignificantPOI.category,
              location: {
                latitude: mostSignificantPOI.location.latitude,
                longitude: mostSignificantPOI.location.longitude,
              },
              description:
                mostSignificantPOI.description ||
                `A ${mostSignificantPOI.category} in the area`,
              category: mostSignificantPOI.category,
              significance:
                mostSignificantPOI.metadata?.significanceScore || 0.5,
            },
            targetDuration: 180,
            contentStyle: "mixed" as ContentStyle,
          };
        } else {
          // Use text description that includes multiple POIs
          const locationContext = this.generateLocationContext(pois, location);
          const poiDescriptions = pois
            .slice(0, 5)
            .map((poi) => `${poi.name} (${poi.category})`)
            .join(", ");

          contentRequest = {
            input: {
              description: `Location ${locationContext} with nearby points of interest including: ${poiDescriptions}. This area offers a variety of attractions and features for travelers.`,
            },
            targetDuration: 180,
            contentStyle: "mixed" as ContentStyle,
          };
        }
      } else {
        // Fallback to text description
        const locationName = this.generateLocationName(pois, location);
        contentRequest = {
          input: {
            description: `Location near ${locationName} at coordinates ${location.latitude.toFixed(
              4
            )}, ${location.longitude.toFixed(4)}`,
          },
          targetDuration: 180,
          contentStyle: "mixed" as ContentStyle,
        };
      }

      // Generate content using the story service
      console.log("Generating story content...");
      const generatedContent = await this.contentService.generateContent(
        contentRequest
      );

      // Store the story for retrieval
      const storyResponse: StoryResponse = {
        storyId: generatedContent.id,
        content: generatedContent.content,
        duration: generatedContent.duration,
        status: generatedContent.status,
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
        },
        generatedAt: generatedContent.generatedAt,
        storyTitle: `Story for ${this.generateLocationName(pois, location)}`,
        storySummary: generatedContent.content.substring(0, 200) + "...",
      };

      this.stories.set(generatedContent.id, storyResponse);

      // Cache the journey
      const cachedJourney: CachedJourney = {
        storyId: generatedContent.id,
        content: generatedContent.content,
        location,
        pois,
        generatedAt: generatedContent.generatedAt || new Date(),
        estimatedDuration: generatedContent.duration,
        cacheKey,
      };
      this.cacheJourney(cacheKey, cachedJourney);

      // Return story seeds response
      return {
        seeds: [
          {
            id: generatedContent.id,
            title: storyResponse.storyTitle || "Local Story",
            summary:
              storyResponse.storySummary ||
              generatedContent.content.substring(0, 200) + "...",
            location: {
              latitude: location.latitude,
              longitude: location.longitude,
            },
            contentStyle: contentRequest.contentStyle,
            targetDuration: generatedContent.duration,
            createdAt: generatedContent.generatedAt || new Date(),
          },
        ],
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
        },
        timestamp: new Date(),
      };
    } catch (error) {
      console.error("Error generating story seeds for location:", error);

      // Return fallback response
      const fallbackContent = this.generateFallbackContent(locationData, error);
      const fallbackId = crypto.randomUUID();

      const fallbackStory: StoryResponse = {
        storyId: fallbackId,
        content: fallbackContent,
        duration: 60,
        status: "ready",
        location: {
          latitude: locationData.latitude,
          longitude: locationData.longitude,
        },
        generatedAt: new Date(),
        storyTitle: "Local Area Information",
        storySummary: "Basic information about your current location.",
      };

      this.stories.set(fallbackId, fallbackStory);

      return {
        seeds: [
          {
            id: fallbackId,
            title: "Local Area Information",
            summary: "Basic information about your current location.",
            location: {
              latitude: locationData.latitude,
              longitude: locationData.longitude,
            },
            contentStyle: "mixed" as ContentStyle,
            targetDuration: 60,
            createdAt: new Date(),
          },
        ],
        location: {
          latitude: locationData.latitude,
          longitude: locationData.longitude,
        },
        timestamp: new Date(),
      };
    }
  }

  getStory(storyId: string): StoryResponse | null {
    // Retrieve story from memory
    const story = this.stories.get(storyId);

    if (!story) {
      return null;
    }

    // Update access count if we had that tracking
    // For now, just return the story
    return story;
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

  private generateLocationName(
    pois: PointOfInterest[],
    location: LocationData
  ): string {
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

  private generateLocationContext(
    pois: PointOfInterest[],
    location: LocationData
  ): string {
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

  private generateFallbackContent(
    locationData: JourneyLocationRequest,
    error: unknown
  ): string {
    console.log("Generating fallback content due to error:", error);

    // Try to determine what service failed and provide appropriate fallback
    const errorMessage =
      error instanceof Error
        ? error.message?.toLowerCase() || ""
        : String(error).toLowerCase();

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
