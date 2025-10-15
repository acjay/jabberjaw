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
  type JourneyLocationRequest,
  type JourneyLocationResponse,
  type StoryResponse,
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
    // Process the location and generate content
    const response = await this.journeyService.processLocation(body);

    return response;
  }

  @Get("story/:id")
  getStory(@Param("id") id: string): StoryResponse {
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
  getHealth(): HealthResponse {
    const health = this.journeyService.getHealth();
    return {
      status: health.status,
      service: "journey",
      stories: health.stories,
    };
  }
}
