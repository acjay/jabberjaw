import {
  Body as NonZodBody,
  Controller,
  Delete,
  Get,
  HTTP_STATUS,
  HttpException,
  Param,
  Post,
} from "@danet/core";
import { Body, ReturnedSchema } from "@danet/zod";
import { StoryService } from "./services/story.service.ts";
import { StoredContent } from "./services/content-storage.service.ts";
import {
  FullStoryRequestSchema,
  FullStorySchema,
  type FullStoryRequest,
  type FullStory,
} from "../shared/schemas/index.ts";

@Controller("api/content")
export class StoryController {
  constructor(private readonly storyService: StoryService) {}

  @Post("generate")
  @ReturnedSchema(FullStorySchema)
  async generateContent(
    @Body(FullStoryRequestSchema) body: FullStoryRequest
  ): Promise<FullStory> {
    return await this.storyService.generateFullStory(body);
  }

  @Get(":id")
  async getContent(@Param("id") id: string): Promise<StoredContent> {
    if (!id) {
      throw new HttpException(
        HTTP_STATUS.BAD_REQUEST,
        "Content ID is required"
      );
    }

    const content = await this.storyService.getContent(id);

    if (!content) {
      throw new HttpException(HTTP_STATUS.NOT_FOUND, "Content not found");
    }

    return content;
  }

  @Get()
  async listContent(): Promise<StoredContent[]> {
    return await this.storyService.listContent();
  }

  @Delete(":id")
  async deleteContent(@Param("id") id: string): Promise<{ success: boolean }> {
    if (!id) {
      throw new HttpException(
        HTTP_STATUS.BAD_REQUEST,
        "Content ID is required"
      );
    }

    const success = await this.storyService.deleteContent(id);

    if (!success) {
      throw new HttpException(HTTP_STATUS.NOT_FOUND, "Content not found");
    }

    return { success };
  }

  @Get("admin/stats")
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
    return this.storyService.getStats();
  }

  @Delete("admin/clear")
  async clearCache(): Promise<{ success: boolean }> {
    await this.storyService.clearCache();
    return { success: true };
  }

  @Get("similar")
  findSimilarContent(
    @NonZodBody() inputData: Record<string, unknown>
  ): StoredContent[] {
    return this.storyService.findSimilarContent(inputData, 5);
  }

  @Get("recent")
  getRecentContent(): StoredContent[] {
    return this.storyService.getRecentContent();
  }

  @Get("popular")
  getPopularContent(): StoredContent[] {
    return this.storyService.getPopularContent();
  }
}
