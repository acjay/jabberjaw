import { Injectable } from "@danet/core";
import { MockLLMService, LLMService } from "./llm.service.ts";
import { OpenAILLMService } from "./openai-llm.service.ts";
import {
  ContentInputData,
  ContentStorageService,
  StoredContent,
} from "./content-storage.service.ts";
import { ConfigurationService } from "../../shared/configuration/index.ts";
import {
  ContentRequest,
  GeneratedContent,
} from "../../shared/schemas/index.ts";
import { convertContentRequestToDto } from "../../shared/utils/schema-bridge.ts";

@Injectable()
export class StoryService {
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

  async generateContent(request: ContentRequest): Promise<GeneratedContent> {
    // Convert Zod schema to legacy DTO for compatibility with existing services
    const legacyRequest = convertContentRequestToDto(request);

    // Check for similar existing content first
    const inputData = legacyRequest.input;
    const similarContent = this.storageService.findSimilar(inputData, 1);

    if (similarContent.length > 0) {
      console.log("Found similar content, returning cached version");
      const cached = similarContent[0];
      return {
        id: cached.id,
        content: cached.content,
        duration: cached.estimatedDuration,
        status: "ready",
        generatedAt: cached.generatedAt,
      };
    }

    // Generate new content using legacy DTO
    const llmService = await this.getLLMService();
    const llmResponse = await llmService.generateContent(legacyRequest);
    const prompt = llmService.generatePrompt(
      legacyRequest.input,
      legacyRequest.contentStyle!
    );

    const generatedContent: GeneratedContent = {
      id: crypto.randomUUID(),
      content: llmResponse.content,
      duration: llmResponse.estimatedDuration,
      status: "ready",
      generatedAt: new Date(),
    };

    // Store the generated content
    this.storageService.store(
      {
        id: generatedContent.id,
        content: generatedContent.content,
        estimatedDuration: generatedContent.duration,
        generatedAt: generatedContent.generatedAt!,
        sources: llmResponse.sources,
        contentStyle: legacyRequest.contentStyle,
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
}
