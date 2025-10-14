import { LocationInfo } from "./structured-poi.dto.ts";

export enum ContentStyle {
  HISTORICAL = "historical",
  CULTURAL = "cultural",
  GEOGRAPHICAL = "geographical",
  MIXED = "mixed",
}

export class StorySeedDto {
  location!: LocationInfo;
  subject!: string;
  style!: ContentStyle;
  storyTitle!: string;

  constructor(data: Partial<StorySeedDto>) {
    Object.assign(this, data);

    if (!this.location || !this.location.country) {
      throw new Error("Location with country is required");
    }

    if (!this.subject || typeof this.subject !== "string") {
      throw new Error("Subject is required and must be a string");
    }

    if (!this.style || !Object.values(ContentStyle).includes(this.style)) {
      throw new Error("Style is required and must be a valid ContentStyle");
    }

    if (!this.storyTitle || typeof this.storyTitle !== "string") {
      throw new Error("Story title is required and must be a string");
    }
  }
}
