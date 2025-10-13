import { TextPOIDescriptionDto } from "./text-poi-description.dto.ts";
import { StructuredPOIDto } from "./structured-poi.dto.ts";
import { ContentStyle } from "./story-seed.dto.ts";

export { ContentStyle };

export class ContentRequestDto {
  input!: TextPOIDescriptionDto | StructuredPOIDto;
  targetDuration?: number;
  contentStyle?: ContentStyle;

  constructor(data: Partial<ContentRequestDto>) {
    Object.assign(this, data);

    if (!this.input) {
      throw new Error("Input is required");
    }

    // Validate input type
    if (
      !(this.input instanceof TextPOIDescriptionDto) &&
      !(this.input instanceof StructuredPOIDto)
    ) {
      // Try to create the appropriate DTO based on the data structure
      if (
        typeof this.input === "object" &&
        "description" in this.input &&
        Object.keys(this.input).length === 1
      ) {
        this.input = new TextPOIDescriptionDto(this.input as any);
      } else if (
        typeof this.input === "object" &&
        "name" in this.input &&
        "type" in this.input
      ) {
        this.input = new StructuredPOIDto(this.input as any);
      } else {
        throw new Error(
          "Input must be either a text description or structured POI data"
        );
      }
    }

    // Set defaults
    this.targetDuration = this.targetDuration || 180; // 3 minutes
    this.contentStyle = this.contentStyle || ContentStyle.MIXED;

    // Validate target duration
    if (this.targetDuration < 30 || this.targetDuration > 600) {
      throw new Error("Target duration must be between 30 and 600 seconds");
    }

    // Validate content style
    if (!Object.values(ContentStyle).includes(this.contentStyle)) {
      throw new Error("Content style must be a valid ContentStyle");
    }
  }
}
