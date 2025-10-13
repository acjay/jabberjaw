import { LocationData } from "./location.model.ts";
import { PointOfInterest } from "./poi.model.ts";

/**
 * Story seed represents the natural key for a story
 * Combines request inputs and story title to uniquely identify a story
 */
export interface StorySeed {
  /** Location context for the story */
  location: LocationData;

  /** Subject matter or topic of the story */
  subject: string;

  /** Content style preference */
  style: ContentStyle;

  /** LLM-generated title that creates collision potential for similar stories */
  storyTitle: string;
}

/**
 * Content style enumeration for story generation
 */
export enum ContentStyle {
  HISTORICAL = "historical",
  CULTURAL = "cultural",
  GEOGRAPHICAL = "geographical",
  MIXED = "mixed",
}

/**
 * Story metadata containing all information about a story
 */
export interface StoryMetadata {
  /** Unique surrogate key for the story */
  storyId: string;

  /** Natural key components that uniquely identify the story */
  storySeed: StorySeed;

  /** Paragraph-long summary that can be expanded into full story */
  storySummary: string;

  /** Full story content (generated on demand) */
  fullStory?: string;

  /** Timestamp when the story was created */
  createdAt: Date;

  /** Timestamp when the story was last updated */
  updatedAt: Date;

  /** Estimated duration in seconds for the full story */
  estimatedDuration?: number;

  /** Source references used in story generation */
  sources?: string[];

  /** IDs of POIs referenced in the story */
  poiReferences?: string[];
}

/**
 * Request model for story seed generation
 * Contains all necessary information to generate story seeds for a location
 */
export interface StorySeedRequest {
  /** Points of interest to include in the narrative */
  pois: PointOfInterest[];

  /** Current user location for context */
  userLocation: LocationData;

  /** Previously generated story IDs to avoid repetition */
  previousStories: string[];

  /** Target duration for the generated content in seconds (typically 180 for 3 minutes) */
  targetDuration: number;

  /** Preferred content style */
  contentStyle: ContentStyle;
}

/**
 * Legacy interface for backward compatibility
 * @deprecated Use StorySeedRequest instead
 */
export interface ContentRequest extends StorySeedRequest {}

/**
 * Story seeds response containing multiple story options for a location
 */
export interface StorySeedsResponse {
  /** Array of story metadata for available stories */
  storySeeds: StoryMetadata[];

  /** Location context for the story seeds */
  location: LocationData;

  /** Total number of available stories for this location */
  totalAvailable: number;
}

/**
 * Individual story response for full story retrieval
 */
export interface StoryResponse {
  /** Unique identifier for the story */
  storyId: string;

  /** Story title */
  storyTitle: string;

  /** Complete story narrative */
  fullStory: string;

  /** Complete story metadata */
  metadata: StoryMetadata;
}

/**
 * Generated story content model representing the output from LLM story generation
 * Contains the narrative text and associated metadata
 */
export interface GeneratedStoryContent {
  /** Unique identifier for the generated story */
  storyId: string;

  /** The narrative text content */
  narrative: string;

  /** Estimated duration in seconds for text-to-speech conversion */
  estimatedDuration: number;

  /** Source references used in content generation */
  sources: string[];

  /** IDs of POIs referenced in the content */
  poiReferences: string[];

  /** The prompt used to generate this content */
  prompt: string;

  /** Timestamp when the content was generated */
  generatedAt: Date;

  /** Location context for the generated content */
  location: LocationData;

  /** Story title */
  storyTitle: string;

  /** Story summary */
  storySummary: string;
}

/**
 * Legacy interface for backward compatibility
 * @deprecated Use GeneratedStoryContent instead
 */
export interface GeneratedContent
  extends Omit<
    GeneratedStoryContent,
    "storyId" | "storyTitle" | "storySummary"
  > {
  /** @deprecated Use storyId instead */
  id: string;
}

/**
 * Stored story model for persisting generated stories
 * Includes all generation metadata for story storage and retrieval
 */
export interface StoredStory {
  /** Unique identifier for the stored story */
  storyId: string;

  /** The narrative text content */
  narrative: string;

  /** The prompt used to generate this content */
  prompt: string;

  /** Points of interest that were used in story generation */
  pois: PointOfInterest[];

  /** Location context for the generated story */
  location: LocationData;

  /** Estimated duration in seconds for text-to-speech conversion */
  estimatedDuration: number;

  /** Source references used in story generation */
  sources: string[];

  /** IDs of POIs referenced in the story */
  poiReferences: string[];

  /** Timestamp when the story was generated */
  generatedAt: Date;

  /** Story title */
  storyTitle: string;

  /** Story summary */
  storySummary: string;

  /** Story seed information */
  storySeed: StorySeed;

  /** Optional URL to the generated audio file */
  audioUrl?: string;
}

/**
 * Legacy interface for backward compatibility
 * @deprecated Use StoredStory instead
 */
export interface StoredContent
  extends Omit<
    StoredStory,
    "storyId" | "storyTitle" | "storySummary" | "storySeed"
  > {
  /** @deprecated Use storyId instead */
  id: string;
}

/**
 * Validation function for StorySeedRequest
 * Ensures all required fields are present and valid
 */
export function validateStorySeedRequest(request: StorySeedRequest): boolean {
  // Validate POIs array
  if (!Array.isArray(request.pois) || request.pois.length === 0) {
    return false;
  }

  // Validate user location exists
  if (!request.userLocation || typeof request.userLocation !== "object") {
    return false;
  }

  // Validate previous stories is an array
  if (!Array.isArray(request.previousStories)) {
    return false;
  }

  // Validate target duration is a positive number
  if (
    typeof request.targetDuration !== "number" ||
    request.targetDuration <= 0
  ) {
    return false;
  }

  // Validate content style
  if (!Object.values(ContentStyle).includes(request.contentStyle)) {
    return false;
  }

  return true;
}

/**
 * Legacy validation function for backward compatibility
 * @deprecated Use validateStorySeedRequest instead
 */
export function validateContentRequest(request: ContentRequest): boolean {
  return validateStorySeedRequest(request);
}

/**
 * Validation function for GeneratedStoryContent
 * Ensures all required fields are present and valid
 */
export function validateGeneratedStoryContent(
  content: GeneratedStoryContent
): boolean {
  // Validate required string fields
  if (
    !content.storyId ||
    typeof content.storyId !== "string" ||
    content.storyId.trim().length === 0
  ) {
    return false;
  }

  if (
    !content.narrative ||
    typeof content.narrative !== "string" ||
    content.narrative.trim().length === 0
  ) {
    return false;
  }

  if (
    !content.prompt ||
    typeof content.prompt !== "string" ||
    content.prompt.trim().length === 0
  ) {
    return false;
  }

  if (
    !content.storyTitle ||
    typeof content.storyTitle !== "string" ||
    content.storyTitle.trim().length === 0
  ) {
    return false;
  }

  if (
    !content.storySummary ||
    typeof content.storySummary !== "string" ||
    content.storySummary.trim().length === 0
  ) {
    return false;
  }

  // Validate numeric fields
  if (
    typeof content.estimatedDuration !== "number" ||
    content.estimatedDuration <= 0
  ) {
    return false;
  }

  // Validate arrays
  if (!Array.isArray(content.sources)) {
    return false;
  }

  if (!Array.isArray(content.poiReferences)) {
    return false;
  }

  // Validate date
  if (
    !(content.generatedAt instanceof Date) ||
    isNaN(content.generatedAt.getTime())
  ) {
    return false;
  }

  // Validate location exists
  if (!content.location || typeof content.location !== "object") {
    return false;
  }

  return true;
}

/**
 * Legacy validation function for backward compatibility
 * @deprecated Use validateGeneratedStoryContent instead
 */
export function validateGeneratedContent(content: GeneratedContent): boolean {
  // Skip validation of story-specific fields for legacy content
  return (
    !!content.id &&
    typeof content.id === "string" &&
    content.id.trim().length > 0 &&
    !!content.narrative &&
    typeof content.narrative === "string" &&
    content.narrative.trim().length > 0 &&
    !!content.prompt &&
    typeof content.prompt === "string" &&
    content.prompt.trim().length > 0 &&
    typeof content.estimatedDuration === "number" &&
    content.estimatedDuration > 0 &&
    Array.isArray(content.sources) &&
    Array.isArray(content.poiReferences) &&
    content.generatedAt instanceof Date &&
    !isNaN(content.generatedAt.getTime()) &&
    !!content.location &&
    typeof content.location === "object"
  );
}

/**
 * Validation function for StoredStory
 * Ensures all required fields are present and valid
 */
export function validateStoredStory(story: StoredStory): boolean {
  // Validate required string fields
  if (
    !story.storyId ||
    typeof story.storyId !== "string" ||
    story.storyId.trim().length === 0
  ) {
    return false;
  }

  if (
    !story.narrative ||
    typeof story.narrative !== "string" ||
    story.narrative.trim().length === 0
  ) {
    return false;
  }

  if (
    !story.prompt ||
    typeof story.prompt !== "string" ||
    story.prompt.trim().length === 0
  ) {
    return false;
  }

  if (
    !story.storyTitle ||
    typeof story.storyTitle !== "string" ||
    story.storyTitle.trim().length === 0
  ) {
    return false;
  }

  if (
    !story.storySummary ||
    typeof story.storySummary !== "string" ||
    story.storySummary.trim().length === 0
  ) {
    return false;
  }

  // Validate numeric fields
  if (
    typeof story.estimatedDuration !== "number" ||
    story.estimatedDuration <= 0
  ) {
    return false;
  }

  // Validate arrays
  if (!Array.isArray(story.pois) || story.pois.length === 0) {
    return false;
  }

  if (!Array.isArray(story.sources)) {
    return false;
  }

  if (!Array.isArray(story.poiReferences)) {
    return false;
  }

  // Validate date
  if (
    !(story.generatedAt instanceof Date) ||
    isNaN(story.generatedAt.getTime())
  ) {
    return false;
  }

  // Validate location exists
  if (!story.location || typeof story.location !== "object") {
    return false;
  }

  // Validate story seed
  if (!story.storySeed || typeof story.storySeed !== "object") {
    return false;
  }

  // Validate optional fields if present
  if (
    story.audioUrl !== undefined &&
    (typeof story.audioUrl !== "string" || story.audioUrl.trim().length === 0)
  ) {
    return false;
  }

  return true;
}

/**
 * Legacy validation function for backward compatibility
 * @deprecated Use validateStoredStory instead
 */
export function validateStoredContent(content: StoredContent): boolean {
  // Legacy validation with reduced requirements
  return (
    !!content.id &&
    typeof content.id === "string" &&
    content.id.trim().length > 0 &&
    !!content.narrative &&
    typeof content.narrative === "string" &&
    content.narrative.trim().length > 0 &&
    !!content.prompt &&
    typeof content.prompt === "string" &&
    content.prompt.trim().length > 0 &&
    typeof content.estimatedDuration === "number" &&
    content.estimatedDuration > 0 &&
    Array.isArray(content.pois) &&
    content.pois.length > 0 &&
    Array.isArray(content.sources) &&
    Array.isArray(content.poiReferences) &&
    content.generatedAt instanceof Date &&
    !isNaN(content.generatedAt.getTime()) &&
    !!content.location &&
    typeof content.location === "object" &&
    (content.audioUrl === undefined ||
      (typeof content.audioUrl === "string" &&
        content.audioUrl.trim().length > 0))
  );
}

/**
 * Type guard to check if an object is a valid StorySeedRequest
 */
export function isStorySeedRequest(obj: unknown): obj is StorySeedRequest {
  return (
    typeof obj === "object" &&
    obj !== null &&
    validateStorySeedRequest(obj as StorySeedRequest)
  );
}

/**
 * Type guard to check if an object is a valid GeneratedStoryContent
 */
export function isGeneratedStoryContent(
  obj: unknown
): obj is GeneratedStoryContent {
  return (
    typeof obj === "object" &&
    obj !== null &&
    validateGeneratedStoryContent(obj as GeneratedStoryContent)
  );
}

/**
 * Type guard to check if an object is a valid StoredStory
 */
export function isStoredStory(obj: unknown): obj is StoredStory {
  return (
    typeof obj === "object" &&
    obj !== null &&
    validateStoredStory(obj as StoredStory)
  );
}

/**
 * Legacy type guard for backward compatibility
 * @deprecated Use isStorySeedRequest instead
 */
export function isContentRequest(obj: unknown): obj is ContentRequest {
  return isStorySeedRequest(obj);
}

/**
 * Legacy type guard for backward compatibility
 * @deprecated Use isGeneratedStoryContent instead
 */
export function isGeneratedContent(obj: unknown): obj is GeneratedContent {
  return (
    typeof obj === "object" &&
    obj !== null &&
    validateGeneratedContent(obj as GeneratedContent)
  );
}

/**
 * Legacy type guard for backward compatibility
 * @deprecated Use isStoredStory instead
 */
export function isStoredContent(obj: unknown): obj is StoredContent {
  return (
    typeof obj === "object" &&
    obj !== null &&
    validateStoredContent(obj as StoredContent)
  );
}

/**
 * Helper function to convert GeneratedStoryContent to StoredStory
 * Useful when persisting generated story content to storage
 */
export function generatedStoryContentToStoredStory(
  generated: GeneratedStoryContent,
  pois: PointOfInterest[],
  storySeed: StorySeed,
  audioUrl?: string
): StoredStory {
  return {
    storyId: generated.storyId,
    narrative: generated.narrative,
    prompt: generated.prompt,
    pois,
    location: generated.location,
    estimatedDuration: generated.estimatedDuration,
    sources: generated.sources,
    poiReferences: generated.poiReferences,
    generatedAt: generated.generatedAt,
    storyTitle: generated.storyTitle,
    storySummary: generated.storySummary,
    storySeed,
    audioUrl,
  };
}

/**
 * Helper function to create a StorySeedRequest from basic parameters
 * Provides a convenient way to construct story seed requests
 */
export function createStorySeedRequest(
  pois: PointOfInterest[],
  userLocation: LocationData,
  contentStyle: ContentStyle = ContentStyle.MIXED,
  previousStories: string[] = [],
  targetDuration: number = 180
): StorySeedRequest {
  return {
    pois,
    userLocation,
    previousStories,
    targetDuration,
    contentStyle,
  };
}

/**
 * Helper function to create StoryMetadata from basic parameters
 */
export function createStoryMetadata(
  storyId: string,
  storySeed: StorySeed,
  storySummary: string,
  fullStory?: string
): StoryMetadata {
  const now = new Date();
  return {
    storyId,
    storySeed,
    storySummary,
    fullStory,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Legacy helper function for backward compatibility
 * @deprecated Use generatedStoryContentToStoredStory instead
 */
export function generatedContentToStoredContent(
  generated: GeneratedContent,
  pois: PointOfInterest[],
  audioUrl?: string
): StoredContent {
  return {
    id: generated.id,
    narrative: generated.narrative,
    prompt: generated.prompt,
    pois,
    location: generated.location,
    estimatedDuration: generated.estimatedDuration,
    sources: generated.sources,
    poiReferences: generated.poiReferences,
    generatedAt: generated.generatedAt,
    audioUrl,
  };
}

/**
 * Legacy helper function for backward compatibility
 * @deprecated Use createStorySeedRequest instead
 */
export function createContentRequest(
  pois: PointOfInterest[],
  userLocation: LocationData,
  previousStories: string[] = [],
  targetDuration: number = 180
): ContentRequest {
  return {
    pois,
    userLocation,
    previousStories,
    targetDuration,
    contentStyle: ContentStyle.MIXED,
  };
}
