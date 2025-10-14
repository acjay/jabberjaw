import { StorySeedDto } from "./story-seed.dto.ts";

export class StoryMetadataDto {
  storyId!: string;
  storySeed!: StorySeedDto;
  storyTitle!: string;
  storySummary!: string;
  fullStory?: string;
  createdAt!: Date;
  updatedAt!: Date;
  estimatedDuration?: number;
  sources?: string[];
  poiReferences?: string[];

  constructor(data: Partial<StoryMetadataDto>) {
    Object.assign(this, data);

    if (!this.storyId || typeof this.storyId !== "string") {
      throw new Error("Story ID is required and must be a string");
    }

    if (!this.storySeed) {
      throw new Error("Story seed is required");
    }

    if (!(this.storySeed instanceof StorySeedDto)) {
      this.storySeed = new StorySeedDto(this.storySeed);
    }

    if (!this.storyTitle || typeof this.storyTitle !== "string") {
      throw new Error("Story title is required and must be a string");
    }

    if (!this.storySummary || typeof this.storySummary !== "string") {
      throw new Error("Story summary is required and must be a string");
    }

    // Set defaults
    this.createdAt = this.createdAt || new Date();
    this.updatedAt = this.updatedAt || new Date();
    this.sources = this.sources || [];
    this.poiReferences = this.poiReferences || [];

    // Validate optional fields
    if (
      this.estimatedDuration !== undefined &&
      (typeof this.estimatedDuration !== "number" ||
        this.estimatedDuration <= 0)
    ) {
      throw new Error("Estimated duration must be a positive number");
    }

    if (this.fullStory !== undefined && typeof this.fullStory !== "string") {
      throw new Error("Full story must be a string");
    }
  }
}
