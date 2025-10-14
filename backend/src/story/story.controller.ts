import {
  Body,
  Controller,
  Delete,
  Get,
  HTTP_STATUS,
  HttpException,
  Param,
  Post,
} from "@danet/core";
import { StoryService } from "./services/story.service.ts";
import { ContentRequestDto, GeneratedContentDto } from "./dto/index.ts";
import { StoredContent } from "./services/content-storage.service.ts";

@Controller("api/content")
export class StoryController {
  constructor(private readonly storyService: StoryService) {}

  @Post("generate")
  async generateContent(
    @Body() body: Record<string, unknown>
  ): Promise<GeneratedContentDto> {
    try {
      const request = new ContentRequestDto(body);
      return await this.storyService.generateContent(request);
    } catch (error) {
      throw new HttpException(
        HTTP_STATUS.BAD_REQUEST,
        `Invalid content request: ${error}`
      );
    }
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
    @Body() inputData: Record<string, unknown>
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
