import {
  Controller,
  Get,
  HTTP_STATUS,
  HttpException,
  Param,
  Post,
} from "@danet/core";
import { Body, ReturnedSchema } from "@danet/zod";
import { JourneyService } from "./journey.service.ts";
import {
  JourneyLocationRequestSchema,
  JourneyLocationResponseSchema,
  FullStorySchema,
  type JourneyLocationRequest,
  type JourneyLocationResponse,
  type FullStory,
  type HealthResponse,
} from "../shared/schemas/index.ts";

@Controller("api")
export class JourneyController {
  constructor(private readonly journeyService: JourneyService) {}

  @Post("story-seeds-for-location")
  @ReturnedSchema(JourneyLocationResponseSchema)
  async processLocation(
    @Body(JourneyLocationRequestSchema) body: JourneyLocationRequest
  ): Promise<JourneyLocationResponse> {
    try {
      // Validate coordinates are within valid ranges
      if (body.latitude < -90 || body.latitude > 90) {
        throw new HttpException(
          HTTP_STATUS.BAD_REQUEST,
          "Latitude must be between -90 and 90 degrees"
        );
      }
      if (body.longitude < -180 || body.longitude > 180) {
        throw new HttpException(
          HTTP_STATUS.BAD_REQUEST,
          "Longitude must be between -180 and 180 degrees"
        );
      }

      // Process the location and generate content
      const response = await this.journeyService.storySeedsForLocation(body);

      return response;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      console.error("Error processing location:", error);
      throw new HttpException(
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        "Failed to generate story seeds for location"
      );
    }
  }

  @Get("story/:id")
  @ReturnedSchema(FullStorySchema)
  async getStory(@Param("id") id: string): Promise<FullStory> {
    if (!id || id.trim() === "") {
      throw new HttpException(HTTP_STATUS.BAD_REQUEST, "Story ID is required");
    }

    // Basic validation - just check it's not empty and has reasonable length
    if (id.length < 3 || id.length > 100) {
      throw new HttpException(
        HTTP_STATUS.BAD_REQUEST,
        "Invalid story ID format"
      );
    }

    const story = await this.journeyService.getFullStory(id);

    if (!story) {
      throw new HttpException(
        HTTP_STATUS.NOT_FOUND,
        `Story with ID '${id}' not found`
      );
    }

    return story;
  }

  @Get("health")
  getHealth(): HealthResponse {
    const health = this.journeyService.getHealth();
    return {
      status: health.status,
      service: "journey",
      stories: health.stories,
    };
  }
}
