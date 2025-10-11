import { Body, Controller, Get, HTTP_STATUS, HttpException, Param, Post } from '@danet/core';
import { OrchestrationService } from './orchestration.service.ts';
import { LocationRequestDto, LocationResponseDto, SegmentResponseDto } from './dto/index.ts';

@Controller('api')
export class OrchestrationController {
  constructor(private readonly orchestrationService: OrchestrationService) {}

  @Post('location')
  async processLocation(@Body() body: Record<string, unknown>): Promise<LocationResponseDto> {
    try {
      // Validate and create DTO
      const locationRequest = new LocationRequestDto(body);

      // Process the location and generate content
      const response = await this.orchestrationService.processLocation(locationRequest);

      return response;
    } catch (error) {
      throw new HttpException(
        HTTP_STATUS.BAD_REQUEST,
        `Invalid location data: ${error}`,
      );
    }
  }

  @Get('segment/:id')
  getSegment(@Param('id') id: string): SegmentResponseDto {
    if (!id) {
      throw new HttpException(
        HTTP_STATUS.BAD_REQUEST,
        'Segment ID is required',
      );
    }

    const segment = this.orchestrationService.getSegment(id);

    if (!segment) {
      throw new HttpException(
        HTTP_STATUS.NOT_FOUND,
        'Segment not found',
      );
    }

    return segment;
  }

  @Get('health')
  getHealth(): { status: string; service: string; segments: number } {
    const health = this.orchestrationService.getHealth();
    return {
      status: health.status,
      service: 'orchestration',
      segments: health.segments,
    };
  }
}
