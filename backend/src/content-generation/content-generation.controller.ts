import {
  Body,
  Controller,
  Delete,
  Get,
  HTTP_STATUS,
  HttpException,
  Param,
  Post,
} from '@danet/core';
import { ContentGenerationService } from './services/content-generation.service.ts';
import { ContentRequestDto, GeneratedContentDto } from './dto/index.ts';
import { StoredContent } from './services/content-storage.service.ts';

@Controller('api/content')
export class ContentGenerationController {
  constructor(private readonly contentGenerationService: ContentGenerationService) {}

  @Post('generate')
  async generateContent(@Body() body: Record<string, unknown>): Promise<GeneratedContentDto> {
    try {
      const request = new ContentRequestDto(body);
      return await this.contentGenerationService.generateContent(request);
    } catch (error) {
      throw new HttpException(
        HTTP_STATUS.BAD_REQUEST,
        `Invalid content request: ${error}`,
      );
    }
  }

  @Get(':id')
  async getContent(@Param('id') id: string): Promise<StoredContent> {
    if (!id) {
      throw new HttpException(
        HTTP_STATUS.BAD_REQUEST,
        'Content ID is required',
      );
    }

    const content = await this.contentGenerationService.getContent(id);

    if (!content) {
      throw new HttpException(
        HTTP_STATUS.NOT_FOUND,
        'Content not found',
      );
    }

    return content;
  }

  @Get()
  async listContent(): Promise<StoredContent[]> {
    return await this.contentGenerationService.listContent();
  }

  @Delete(':id')
  async deleteContent(@Param('id') id: string): Promise<{ success: boolean }> {
    if (!id) {
      throw new HttpException(
        HTTP_STATUS.BAD_REQUEST,
        'Content ID is required',
      );
    }

    const success = await this.contentGenerationService.deleteContent(id);

    if (!success) {
      throw new HttpException(
        HTTP_STATUS.NOT_FOUND,
        'Content not found',
      );
    }

    return { success };
  }

  @Get('admin/stats')
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
    return this.contentGenerationService.getStats();
  }

  @Delete('admin/clear')
  async clearCache(): Promise<{ success: boolean }> {
    await this.contentGenerationService.clearCache();
    return { success: true };
  }

  @Get('similar')
  findSimilarContent(
    @Body() inputData: Record<string, unknown>,
  ): StoredContent[] {
    return this.contentGenerationService.findSimilarContent(inputData, 5);
  }

  @Get('recent')
  getRecentContent(): StoredContent[] {
    return this.contentGenerationService.getRecentContent();
  }

  @Get('popular')
  getPopularContent(): StoredContent[] {
    return this.contentGenerationService.getPopularContent();
  }
}
