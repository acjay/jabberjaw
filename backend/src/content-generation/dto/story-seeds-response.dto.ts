import { StoryMetadataDto } from "./story-metadata.dto.ts";
import { LocationInfo } from "./structured-poi.dto.ts";

export class StorySeedsResponseDto {
  storySeeds!: StoryMetadataDto[];
  location!: LocationInfo;
  totalAvailable!: number;

  constructor(data: Partial<StorySeedsResponseDto>) {
    Object.assign(this, data);

    if (!Array.isArray(this.storySeeds)) {
      throw new Error("Story seeds must be an array");
    }

    // Ensure all story seeds are proper DTOs
    this.storySeeds = this.storySeeds.map((seed) =>
      seed instanceof StoryMetadataDto ? seed : new StoryMetadataDto(seed)
    );

    if (!this.location || !this.location.country) {
      throw new Error("Location with country is required");
    }

    if (typeof this.totalAvailable !== "number" || this.totalAvailable < 0) {
      throw new Error("Total available must be a non-negative number");
    }
  }
}
