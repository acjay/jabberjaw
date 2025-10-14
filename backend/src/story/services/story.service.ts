import { Injectable } from "@danet/core";
import { ContentRequestDto, GeneratedContentDto } from "../dto/index.ts";
import { MockLLMService, LLMService } from "./llm.service.ts";
import { OpenAILLMService } from "./openai-llm.service.ts";
import {
  ContentInputData,
  ContentStorageService,
  StoredContent,
} from "./content-storage.service.ts";
import { ConfigurationService } from "../../shared/configuration/index.ts";

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

  async generateContent(
    request: ContentRequestDto
  ): Promise<GeneratedContentDto> {
    // Check for similar existing content first
    const inputData = request.input;
    const similarContent = this.storageService.findSimilar(inputData, 1);

    if (similarContent.length > 0) {
      console.log("Found similar content, returning cached version");
      const cached = similarContent[0];
      return new GeneratedContentDto({
        id: cached.id,
        content: cached.content,
        estimatedDuration: cached.estimatedDuration,
        generatedAt: cached.generatedAt,
        sources: [...(cached.sources || []), "Cached Content"],
        contentStyle: cached.contentStyle,
      });
    }

    // Generate new content
    const llmService = await this.getLLMService();
    const llmResponse = await llmService.generateContent(request);
    const prompt = llmService.generatePrompt(
      request.input,
      request.contentStyle!
    );

    const generatedContent = new GeneratedContentDto({
      id: crypto.randomUUID(),
      content: llmResponse.content,
      estimatedDuration: llmResponse.estimatedDuration,
      prompt,
      generatedAt: new Date(),
      sources: llmResponse.sources,
      contentStyle: request.contentStyle,
    });

    // Store the generated content
    this.storageService.store(generatedContent, prompt, inputData);

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
