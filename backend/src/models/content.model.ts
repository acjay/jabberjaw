import { LocationData } from './location.model.ts';
import { PointOfInterest } from './poi.model.ts';

/**
 * Request model for content generation
 * Contains all necessary information to generate narrative content for a location
 */
export interface ContentRequest {
  /** Points of interest to include in the narrative */
  pois: PointOfInterest[];
  
  /** Current user location for context */
  userLocation: LocationData;
  
  /** Previously generated segment IDs to avoid repetition */
  previousSegments: string[];
  
  /** Target duration for the generated content in seconds (typically 180 for 3 minutes) */
  targetDuration: number;
}

/**
 * Generated content model representing the output from LLM content generation
 * Contains the narrative text and associated metadata
 */
export interface GeneratedContent {
  /** Unique identifier for the generated content */
  id: string;
  
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
}

/**
 * Stored content model for persisting generated content
 * Includes all generation metadata for content storage and retrieval
 */
export interface StoredContent {
  /** Unique identifier for the stored content */
  id: string;
  
  /** The narrative text content */
  narrative: string;
  
  /** The prompt used to generate this content */
  prompt: string;
  
  /** Points of interest that were used in content generation */
  pois: PointOfInterest[];
  
  /** Location context for the generated content */
  location: LocationData;
  
  /** Estimated duration in seconds for text-to-speech conversion */
  estimatedDuration: number;
  
  /** Source references used in content generation */
  sources: string[];
  
  /** IDs of POIs referenced in the content */
  poiReferences: string[];
  
  /** Timestamp when the content was generated */
  generatedAt: Date;
  
  /** Optional URL to the generated audio file */
  audioUrl?: string;
}

/**
 * Validation function for ContentRequest
 * Ensures all required fields are present and valid
 */
export function validateContentRequest(request: ContentRequest): boolean {
  // Validate POIs array
  if (!Array.isArray(request.pois) || request.pois.length === 0) {
    return false;
  }
  
  // Validate user location exists
  if (!request.userLocation || typeof request.userLocation !== 'object') {
    return false;
  }
  
  // Validate previous segments is an array
  if (!Array.isArray(request.previousSegments)) {
    return false;
  }
  
  // Validate target duration is a positive number
  if (typeof request.targetDuration !== 'number' || request.targetDuration <= 0) {
    return false;
  }
  
  return true;
}

/**
 * Validation function for GeneratedContent
 * Ensures all required fields are present and valid
 */
export function validateGeneratedContent(content: GeneratedContent): boolean {
  // Validate required string fields
  if (!content.id || typeof content.id !== 'string' || content.id.trim().length === 0) {
    return false;
  }
  
  if (!content.narrative || typeof content.narrative !== 'string' || content.narrative.trim().length === 0) {
    return false;
  }
  
  if (!content.prompt || typeof content.prompt !== 'string' || content.prompt.trim().length === 0) {
    return false;
  }
  
  // Validate numeric fields
  if (typeof content.estimatedDuration !== 'number' || content.estimatedDuration <= 0) {
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
  if (!(content.generatedAt instanceof Date) || isNaN(content.generatedAt.getTime())) {
    return false;
  }
  
  // Validate location exists
  if (!content.location || typeof content.location !== 'object') {
    return false;
  }
  
  return true;
}

/**
 * Validation function for StoredContent
 * Ensures all required fields are present and valid
 */
export function validateStoredContent(content: StoredContent): boolean {
  // Validate required string fields
  if (!content.id || typeof content.id !== 'string' || content.id.trim().length === 0) {
    return false;
  }
  
  if (!content.narrative || typeof content.narrative !== 'string' || content.narrative.trim().length === 0) {
    return false;
  }
  
  if (!content.prompt || typeof content.prompt !== 'string' || content.prompt.trim().length === 0) {
    return false;
  }
  
  // Validate numeric fields
  if (typeof content.estimatedDuration !== 'number' || content.estimatedDuration <= 0) {
    return false;
  }
  
  // Validate arrays
  if (!Array.isArray(content.pois) || content.pois.length === 0) {
    return false;
  }
  
  if (!Array.isArray(content.sources)) {
    return false;
  }
  
  if (!Array.isArray(content.poiReferences)) {
    return false;
  }
  
  // Validate date
  if (!(content.generatedAt instanceof Date) || isNaN(content.generatedAt.getTime())) {
    return false;
  }
  
  // Validate location exists
  if (!content.location || typeof content.location !== 'object') {
    return false;
  }
  
  // Validate optional fields if present
  if (content.audioUrl !== undefined && (typeof content.audioUrl !== 'string' || content.audioUrl.trim().length === 0)) {
    return false;
  }
  
  return true;
}

/**
 * Type guard to check if an object is a valid ContentRequest
 */
export function isContentRequest(obj: unknown): obj is ContentRequest {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    validateContentRequest(obj as ContentRequest)
  );
}

/**
 * Type guard to check if an object is a valid GeneratedContent
 */
export function isGeneratedContent(obj: unknown): obj is GeneratedContent {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    validateGeneratedContent(obj as GeneratedContent)
  );
}

/**
 * Type guard to check if an object is a valid StoredContent
 */
export function isStoredContent(obj: unknown): obj is StoredContent {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    validateStoredContent(obj as StoredContent)
  );
}

/**
 * Helper function to convert GeneratedContent to StoredContent
 * Useful when persisting generated content to storage
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
    audioUrl
  };
}

/**
 * Helper function to create a ContentRequest from basic parameters
 * Provides a convenient way to construct content requests
 */
export function createContentRequest(
  pois: PointOfInterest[],
  userLocation: LocationData,
  previousSegments: string[] = [],
  targetDuration: number = 180
): ContentRequest {
  return {
    pois,
    userLocation,
    previousSegments,
    targetDuration
  };
}