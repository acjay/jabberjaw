export class LocationResponseDto {
  storyId!: string;
  audioUrl!: string;
  status: "generating" | "ready" | "error" = "generating";
  estimatedDuration?: number;
  message?: string;

  constructor(data: Partial<LocationResponseDto>) {
    Object.assign(this, data);

    if (!this.storyId) {
      throw new Error("storyId is required");
    }

    if (!this.audioUrl) {
      throw new Error("audioUrl is required");
    }
  }
}
