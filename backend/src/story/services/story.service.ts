import { Injectable } from "@danet/core";
import { MockLLMService, LLMService } from "./llm.service.ts";
import { OpenAILLMService } from "./openai-llm.service.ts";
import {
  ContentInputData,
  ContentStorageService,
  StoredContent,
} from "./content-storage.service.ts";
import { ConfigurationService } from "../../configuration/index.ts";
import {
  FullStoryRequest as FullStoryRequest,
  FullStory,
  StructuredPOI,
} from "../../shared/schemas/index.ts";
import { StorySeed } from "../../shared/schemas/content.schema.ts";

@Injectable()
export class StoryService {
  private storySeedsCache = new Map<
    string,
    { seeds: StorySeed[]; generatedAt: Date }
  >();
  private readonly seedsCacheExpiryMs = 24 * 60 * 60 * 1000; // 24 hours

  constructor(
    private readonly mockLLMService: MockLLMService,
    private readonly openAILLMService: OpenAILLMService,
    private readonly storageService: ContentStorageService,
    private readonly configService: ConfigurationService
  ) {}

  private async getLLMService(): Promise<LLMService> {
    try {
      await this.configService.getOpenAIApiKey();
      return this.openAILLMService;
    } catch {
      return this.mockLLMService;
    }
  }

  async generateStorySeeds(location: StructuredPOI): Promise<StorySeed[]> {
    // Create a cache key based on POI characteristics
    const cacheKey = this.createStorySeedsCacheKey(location);

    // Check cache first
    const cached = this.storySeedsCache.get(cacheKey);
    if (cached) {
      const now = new Date().getTime();
      const cacheTime = cached.generatedAt.getTime();

      // Return cached seeds if not expired
      if (now - cacheTime < this.seedsCacheExpiryMs) {
        console.log("Returning cached story seeds for POI:", location.name);
        return cached.seeds;
      } else {
        // Remove expired cache entry
        this.storySeedsCache.delete(cacheKey);
      }
    }

    const llmService = await this.getLLMService();

    // Create a description for the POI to pass to the LLM
    const poiDescription = this.createPOIDescription(location);

    // Generate story seeds using the LLM service
    const llmSeeds = await llmService.generateStorySeedsForPOI(poiDescription);

    // Convert LLM seeds to full StorySeed objects with all required fields
    const storySeeds: StorySeed[] = llmSeeds.map((seed) => ({
      storyId: crypto.randomUUID(),
      title: seed.title,
      summary: seed.summary,
      location: {
        latitude: location.location.latitude,
        longitude: location.location.longitude,
      },
      createdAt: new Date(),
    }));

    // Cache the generated seeds
    this.storySeedsCache.set(cacheKey, {
      seeds: storySeeds,
      generatedAt: new Date(),
    });

    // Clean up cache if it gets too large
    if (this.storySeedsCache.size > 500) {
      this.cleanupStorySeedsCache();
    }

    return storySeeds;
  }

  private createPOIDescription(poi: StructuredPOI): string {
    let description = `${poi.name}, a ${poi.poiType}`;

    if (poi.locationDescription) {
      description += ` in ${poi.locationDescription}`;
    }

    if (poi.description) {
      description += `. ${poi.description}`;
    }

    if (poi.category) {
      description += ` (Category: ${poi.category})`;
    }

    if (poi.tags && poi.tags.length > 0) {
      description += ` Tags: ${poi.tags.join(", ")}`;
    }

    return description;
  }

  async generateFullStory(request: FullStoryRequest): Promise<FullStory> {
    // Check for similar existing content first
    const inputData = request.input;
    const similarContent = this.storageService.findSimilar(inputData, 1);

    if (similarContent.length > 0) {
      console.log("Found similar content, returning cached version");
      const cached = similarContent[0];
      return {
        storyId: cached.id,
        content: cached.content,
        duration: cached.estimatedDuration,
        status: "ready",
        generatedAt: cached.generatedAt,
      };
    }

    // Generate new content using legacy DTO
    const llmService = await this.getLLMService();
    const llmResponse = await llmService.generateFullStory(request);
    const prompt = llmService.generatePrompt(
      request.input,
      request.contentStyle!,
      request.storySeed
    );

    const generatedContent: FullStory = {
      storyId: crypto.randomUUID(),
      content: llmResponse.content,
      duration: llmResponse.estimatedDuration,
      status: "ready",
      generatedAt: new Date(),
    };

    // Store the generated content
    this.storageService.store(
      {
        id: generatedContent.storyId,
        content: generatedContent.content,
        estimatedDuration: generatedContent.duration,
        generatedAt: generatedContent.generatedAt!,
        sources: llmResponse.sources,
        contentStyle: request.contentStyle,
      },
      prompt,
      inputData
    );

    return generatedContent;
  }

  getContent(id: string): StoredContent | null {
    return this.storageService.retrieve(id);
  }

  listContent(limit = 10, offset = 0): StoredContent[] {
    return this.storageService.list(limit, offset);
  }

  deleteContent(id: string): boolean {
    return this.storageService.delete(id);
  }

  getStats(): {
    storage: {
      total: number;
      totalSize: number;
      averageSize: number;
      mostAccessedId?: string;
      totalAccesses: number;
    };
    service: string;
    status: string;
  } {
    return {
      storage: this.storageService.getStats(),
      service: "story",
      status: "healthy",
    };
  }

  clearCache(): void {
    this.storageService.clear();
  }

  findSimilarContent(
    inputData: Record<string, unknown>,
    limit = 5
  ): StoredContent[] {
    // Convert the input data to the appropriate type
    const contentInput = inputData as ContentInputData;
    return this.storageService.findSimilar(contentInput, limit);
  }

  getRecentContent(limit = 10): StoredContent[] {
    return this.storageService.getRecentlyAccessed(limit);
  }

  getPopularContent(limit = 10): StoredContent[] {
    return this.storageService.getMostPopular(limit);
  }

  findContentByLocation(
    latitude: number,
    longitude: number,
    radiusKm = 10,
    limit = 5
  ): StoredContent[] {
    return this.storageService.findByLocation(
      latitude,
      longitude,
      radiusKm,
      limit
    );
  }

  private createStorySeedsCacheKey(location: StructuredPOI): string {
    // Create a cache key based on POI name, type, and rounded coordinates
    const lat = Math.round(location.location.latitude * 1000) / 1000;
    const lng = Math.round(location.location.longitude * 1000) / 1000;
    const name = location.name.toLowerCase().replace(/\s+/g, "_");
    const type = location.poiType.toLowerCase();

    return `seeds_${name}_${type}_${lat}_${lng}`;
  }

  private cleanupStorySeedsCache(): void {
    const now = new Date().getTime();
    const keysToDelete: string[] = [];

    for (const [key, cached] of this.storySeedsCache.entries()) {
      if (now - cached.generatedAt.getTime() > this.seedsCacheExpiryMs) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => this.storySeedsCache.delete(key));

    // If still too large, remove oldest entries
    if (this.storySeedsCache.size > 500) {
      const entries = Array.from(this.storySeedsCache.entries());
      entries.sort(
        (a, b) => a[1].generatedAt.getTime() - b[1].generatedAt.getTime()
      );

      const toRemove = entries.slice(0, this.storySeedsCache.size - 400);
      toRemove.forEach(([key]) => this.storySeedsCache.delete(key));
    }

    console.log(
      `Cleaned up story seeds cache, removed ${keysToDelete.length} expired entries`
    );
  }
}
