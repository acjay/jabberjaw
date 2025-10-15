import { Injectable } from "@danet/core";
import { POIIdentificationService } from "../poi-discovery/services/poi-identification.service.ts";
import { StoryService } from "../story/services/story.service.ts";
import { LocationData } from "../models/location.model.ts";
import {
  JourneyLocationRequest,
  JourneyLocationResponse,
  FullStory,
  StorySeed,
  FullStoryRequest,
  ContentStyleType,
  StructuredPOI,
} from "../shared/schemas/index.ts";

@Injectable()
export class JourneyService {
  private storySeedMetadata = new Map<
    string,
    {
      seed: StorySeed;
      poi?: StructuredPOI;
      contentStyle?: ContentStyleType;
    }
  >();

  constructor(
    private poiService: POIIdentificationService,
    private storyService: StoryService
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

      // Discover POIs near the location
      console.log(
        `Discovering POIs for location: ${location.latitude}, ${location.longitude}`
      );
      const pois = await this.poiService.discoverPOIs(location, {
        radiusMeters: 5000,
        maxResults: 10,
      });

      console.log(`Found ${pois.length} POIs`);

      let allStorySeeds: StorySeed[] = [];

      if (pois.length > 0) {
        // Generate story seeds for multiple significant POIs
        const significantPOIs = pois
          .filter((poi) => (poi.metadata?.significanceScore || 0) > 0.3)
          .sort(
            (a, b) =>
              (b.metadata?.significanceScore || 0) -
              (a.metadata?.significanceScore || 0)
          )
          .slice(0, 3); // Take top 3 most significant POIs

        console.log(
          `Generating story seeds for ${significantPOIs.length} significant POIs...`
        );

        // Generate story seeds for each significant POI
        for (const poi of significantPOIs) {
          const structuredPOI = {
            type: "StructuredPOI" as const,
            name: poi.name,
            poiType: poi.category,
            location: {
              latitude: poi.location.latitude,
              longitude: poi.location.longitude,
            },
            description: poi.description || `A ${poi.category} in the area`,
            category: poi.category,
            significance: poi.metadata?.significanceScore || 0.5,
          };

          try {
            const seeds = await this.storyService.generateStorySeeds(
              structuredPOI
            );

            // Store metadata for each seed so we can regenerate full stories later
            seeds.forEach((seed) => {
              this.storySeedMetadata.set(seed.storyId, {
                seed,
                poi: structuredPOI,
                contentStyle: "mixed" as ContentStyleType,
              });
            });

            allStorySeeds.push(...seeds);
          } catch (error) {
            console.warn(
              `Failed to generate story seeds for POI ${poi.name}:`,
              error
            );
          }
        }

        // If no story seeds were generated from POIs, fall back to the most significant POI
        if (allStorySeeds.length === 0 && pois.length > 0) {
          const mostSignificantPOI = pois.reduce((prev, current) =>
            (current.metadata?.significanceScore || 0) >
            (prev.metadata?.significanceScore || 0)
              ? current
              : prev
          );

          const structuredPOI = {
            type: "StructuredPOI" as const,
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
            significance: mostSignificantPOI.metadata?.significanceScore || 0.5,
          };

          const fallbackSeeds = await this.storyService.generateStorySeeds(
            structuredPOI
          );

          // Store metadata for fallback seeds
          fallbackSeeds.forEach((seed) => {
            this.storySeedMetadata.set(seed.storyId, {
              seed,
              poi: structuredPOI,
              contentStyle: "mixed" as ContentStyleType,
            });
          });

          allStorySeeds = fallbackSeeds;
        }
      }

      // If still no story seeds, create a fallback
      if (allStorySeeds.length === 0) {
        const fallbackSeed = {
          storyId: crypto.randomUUID(),
          title: "Local Area Information",
          summary: `Discover the unique character of this location at ${location.latitude.toFixed(
            4
          )}, ${location.longitude.toFixed(4)}.`,
          location: {
            latitude: location.latitude,
            longitude: location.longitude,
          },
          createdAt: new Date(),
        };

        // Store metadata for the fallback seed
        this.storySeedMetadata.set(fallbackSeed.storyId, {
          seed: fallbackSeed,
          contentStyle: "geographical" as ContentStyleType,
        });

        allStorySeeds = [fallbackSeed];
      }

      // Return story seeds response
      return {
        seeds: allStorySeeds,
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
        },
        timestamp: new Date(),
      };
    } catch (error) {
      console.error("Error generating story seeds for location:", error);

      // Return fallback response
      const fallbackId = crypto.randomUUID();
      const fallbackSeed = {
        storyId: fallbackId,
        title: "Local Area Information",
        summary: "Basic information about your current location.",
        location: {
          latitude: locationData.latitude,
          longitude: locationData.longitude,
        },
        createdAt: new Date(),
      };

      // Store metadata for the error fallback seed
      this.storySeedMetadata.set(fallbackSeed.storyId, {
        seed: fallbackSeed,
        contentStyle: "geographical" as ContentStyleType,
      });

      return {
        seeds: [fallbackSeed],
        location: {
          latitude: locationData.latitude,
          longitude: locationData.longitude,
        },
        timestamp: new Date(),
      };
    }
  }

  async getFullStory(storyId: string): Promise<FullStory | null> {
    // Check if story exists in the content service storage
    const storedContent = this.storyService.getContent(storyId);
    if (storedContent) {
      // Convert stored content to FullStory format
      const fullStory: FullStory = {
        storyId: storedContent.id,
        content: storedContent.content,
        duration: storedContent.estimatedDuration,
        status: "ready",
        generatedAt: storedContent.generatedAt,
      };
      return fullStory;
    }

    // Check if we have metadata to generate the story
    const metadata = this.storySeedMetadata.get(storyId);
    if (metadata) {
      try {
        console.log(`Generating full story for seed: ${metadata.seed.title}`);

        // Create a full story request from the stored metadata, including the story seed
        const fullStoryRequest: FullStoryRequest = {
          input: metadata.poi || {
            type: "TextPOIDescription" as const,
            description: metadata.seed.summary,
          },
          targetDuration: 180, // Default 3 minutes
          contentStyle: metadata.contentStyle || "mixed",
          storySeed: metadata.seed,
        };

        // Generate the full story
        const fullStory = await this.storyService.generateFullStory(
          fullStoryRequest
        );

        // Update the story ID to match the requested one
        fullStory.storyId = storyId;
        fullStory.location = metadata.seed.location;
        fullStory.storyTitle = metadata.seed.title;
        fullStory.storySummary = metadata.seed.summary;

        return fullStory;
      } catch (error) {
        console.error(`Failed to generate full story for ${storyId}:`, error);
        return null;
      }
    }

    // Story doesn't exist and we don't have metadata to generate it
    return null;
  }

  getHealth(): { status: string; stories: number } {
    return {
      status: "healthy",
      stories: this.storySeedMetadata.size,
    };
  }
}
