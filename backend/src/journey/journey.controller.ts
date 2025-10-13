import {
  Body,
  Controller,
  Get,
  HTTP_STATUS,
  HttpException,
  Param,
  Post,
} from "@danet/core";
import { JourneyService } from "./journey.service.ts";
import {
  LocationRequestDto,
  LocationResponseDto,
  StoryResponseDto,
} from "./dto/index.ts";

@Controller("api")
export class JourneyController {
  constructor(private readonly journeyService: JourneyService) {}

  @Post("story-seeds-for-location")
  async processLocation(
    @Body() body: Record<string, unknown>
  ): Promise<LocationResponseDto> {
    try {
      // Validate and create DTO
      const locationRequest = new LocationRequestDto(body);

      // Process the location and generate content
      const response = await this.journeyService.processLocation(
        locationRequest
      );

      return response;
    } catch (error) {
      throw new HttpException(
        HTTP_STATUS.BAD_REQUEST,
        `Invalid location data: ${error}`
      );
    }
  }

  @Get("story/:id")
  getStory(@Param("id") id: string): StoryResponseDto {
    if (!id) {
      throw new HttpException(HTTP_STATUS.BAD_REQUEST, "Story ID is required");
    }

    const story = this.journeyService.getStory(id);

    if (!story) {
      throw new HttpException(HTTP_STATUS.NOT_FOUND, "Story not found");
    }

    return story;
  }

  @Get("health")
  getHealth(): { status: string; service: string; stories: number } {
    const health = this.journeyService.getHealth();
    return {
      status: health.status,
      service: "journey",
      stories: health.stories,
    };
  }
}
