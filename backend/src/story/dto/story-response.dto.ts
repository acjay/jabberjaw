import { StoryMetadataDto } from "./story-metadata.dto.ts";

export class StoryResponseDto {
  storyId!: string;
  storyTitle!: string;
  fullStory!: string;
  metadata!: StoryMetadataDto;

  constructor(data: Partial<StoryResponseDto>) {
    Object.assign(this, data);

    if (!this.storyId || typeof this.storyId !== "string") {
      throw new Error("Story ID is required and must be a string");
    }

    if (!this.storyTitle || typeof this.storyTitle !== "string") {
      throw new Error("Story title is required and must be a string");
    }

    if (!this.fullStory || typeof this.fullStory !== "string") {
      throw new Error("Full story is required and must be a string");
    }

    if (!this.metadata) {
      throw new Error("Metadata is required");
    }

    if (!(this.metadata instanceof StoryMetadataDto)) {
      this.metadata = new StoryMetadataDto(this.metadata);
    }
  }
}
