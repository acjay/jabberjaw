import { Injectable } from "@danet/core";
import { GeneratedContentDto } from "../dto/index.ts";
import { StructuredPOIDto } from "../dto/structured-poi.dto.ts";
import {
  StructuredPOI,
  TextPOIDescription,
} from "../../shared/schemas/index.ts";

/**
 * Input data type for content generation - can be either text description or structured POI
 */
export type ContentInputData = TextPOIDescription | StructuredPOI;

/**
 * Extended stored content interface that includes storage-specific metadata
 */
export interface StoredContent extends GeneratedContentDto {
  /** The prompt used to generate this content */
  prompt: string;
  /** The original input data used for generation */
  inputData: ContentInputData;
  /** Timestamp when content was stored */
  storedAt: Date;
  /** Number of times this content has been retrieved */
  accessCount: number;
  /** Last time this content was accessed */
  lastAccessedAt: Date;
}

/**
 * Statistics about the content storage
 */
export interface StorageStats {
  /** Total number of stored content items */
  total: number;
  /** Total size of all content in characters */
  totalSize: number;
  /** Average content size */
  averageSize: number;
  /** Most accessed content ID */
  mostAccessedId?: string;
  /** Total access count across all content */
  totalAccesses: number;
}

/**
 * Content caching and retrieval configuration
 */
export interface CacheConfig {
  /** Maximum number of items to store in cache */
  maxItems: number;
  /** Maximum age of cached items in milliseconds */
  maxAge: number;
  /** Whether to enable similarity matching for cache hits */
  enableSimilarityMatching: boolean;
}

/**
 * In-memory content storage service that provides caching and retrieval capabilities
 * for generated content with prompts and metadata
 */
@Injectable()
export class ContentStorageService {
  private readonly contents = new Map<string, StoredContent>();
  private readonly cacheConfig: CacheConfig = {
    maxItems: 1000,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    enableSimilarityMatching: true,
  };

  /**
   * Store generated content with prompt and input data
   */
  store(
    content: GeneratedContentDto,
    prompt: string,
    inputData: ContentInputData
  ): StoredContent {
    const now = new Date();
    const storedContent: StoredContent = {
      ...content,
      prompt,
      inputData,
      storedAt: now,
      accessCount: 0,
      lastAccessedAt: now,
    };

    // Check if we need to evict old content to stay within limits
    this.evictOldContentIfNeeded();

    this.contents.set(content.id, storedContent);
    return storedContent;
  }

  /**
   * Retrieve stored content by ID
   */
  retrieve(id: string): StoredContent | null {
    const content = this.contents.get(id);
    if (content) {
      // Update access statistics
      content.accessCount++;
      content.lastAccessedAt = new Date();
      this.contents.set(id, content);
    }
    return content || null;
  }

  /**
   * List stored content with pagination and sorting
   */
  list(limit = 10, offset = 0): StoredContent[] {
    const allContents = Array.from(this.contents.values());
    return allContents
      .sort((a, b) => b.storedAt.getTime() - a.storedAt.getTime())
      .slice(offset, offset + limit);
  }

  /**
   * Delete stored content by ID
   */
  delete(id: string): boolean {
    return this.contents.delete(id);
  }

  /**
   * Clear all stored content
   */
  clear(): void {
    this.contents.clear();
  }

  /**
   * Get comprehensive storage statistics
   */
  getStats(): StorageStats {
    const contents = Array.from(this.contents.values());
    const totalSize = contents.reduce(
      (sum, content) => sum + content.content.length,
      0
    );
    const totalAccesses = contents.reduce(
      (sum, content) => sum + content.accessCount,
      0
    );

    let mostAccessedId: string | undefined;
    let maxAccesses = 0;

    for (const content of contents) {
      if (content.accessCount > maxAccesses) {
        maxAccesses = content.accessCount;
        mostAccessedId = content.id;
      }
    }

    return {
      total: contents.length,
      totalSize,
      averageSize:
        contents.length > 0 ? Math.round(totalSize / contents.length) : 0,
      mostAccessedId,
      totalAccesses,
    };
  }

  /**
   * Find similar content based on input similarity
   * Uses multiple matching strategies for comprehensive similarity detection
   */
  findSimilar(inputData: ContentInputData, limit = 5): StoredContent[] {
    if (!this.cacheConfig.enableSimilarityMatching) {
      return [];
    }

    const allContents = Array.from(this.contents.values());
    const scoredContents: Array<{ content: StoredContent; score: number }> = [];

    for (const content of allContents) {
      const score = this.calculateSimilarityScore(inputData, content.inputData);
      if (score > 0) {
        scoredContents.push({ content, score });
      }
    }

    // Sort by similarity score (highest first) and return top matches
    return scoredContents
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((item) => item.content);
  }

  /**
   * Find content by location proximity (for structured POI data)
   */
  findByLocation(
    latitude: number,
    longitude: number,
    radiusKm = 10,
    limit = 5
  ): StoredContent[] {
    const allContents = Array.from(this.contents.values());
    const nearbyContents: Array<{ content: StoredContent; distance: number }> =
      [];

    for (const content of allContents) {
      if (
        this.isStructuredPOI(content.inputData) &&
        content.inputData.location?.coordinates
      ) {
        const distance = this.calculateDistance(
          latitude,
          longitude,
          content.inputData.location.coordinates.latitude,
          content.inputData.location.coordinates.longitude
        );

        if (distance <= radiusKm) {
          nearbyContents.push({ content, distance });
        }
      }
    }

    // Sort by distance (closest first)
    return nearbyContents
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit)
      .map((item) => item.content);
  }

  /**
   * Get recently accessed content
   */
  getRecentlyAccessed(limit = 10): StoredContent[] {
    const allContents = Array.from(this.contents.values());
    return allContents
      .filter((content) => content.accessCount > 0)
      .sort((a, b) => b.lastAccessedAt.getTime() - a.lastAccessedAt.getTime())
      .slice(0, limit);
  }

  /**
   * Get most popular content by access count
   */
  getMostPopular(limit = 10): StoredContent[] {
    const allContents = Array.from(this.contents.values());
    return allContents
      .filter((content) => content.accessCount > 0)
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, limit);
  }

  /**
   * Update cache configuration
   */
  updateCacheConfig(config: Partial<CacheConfig>): void {
    Object.assign(this.cacheConfig, config);
  }

  /**
   * Get current cache configuration
   */
  getCacheConfig(): CacheConfig {
    return { ...this.cacheConfig };
  }

  /**
   * Calculate similarity score between two input data objects
   * Returns a score from 0 (no similarity) to 1 (identical)
   */
  private calculateSimilarityScore(
    input1: ContentInputData,
    input2: ContentInputData
  ): number {
    // Exact match gets highest score
    if (JSON.stringify(input1) === JSON.stringify(input2)) {
      return 1.0;
    }

    let score = 0;

    // Text description matching
    const desc1 = this.extractDescription(input1);
    const desc2 = this.extractDescription(input2);

    if (desc1 && desc2) {
      const desc1Lower = desc1.toLowerCase();
      const desc2Lower = desc2.toLowerCase();

      // Exact description match
      if (desc1Lower === desc2Lower) {
        score += 0.8;
      } // Substring match
      else if (
        desc1Lower.includes(desc2Lower) ||
        desc2Lower.includes(desc1Lower)
      ) {
        score += 0.6;
      } // Word overlap
      else {
        const words1 = desc1Lower.split(/\s+/);
        const words2 = desc2Lower.split(/\s+/);
        const commonWords = words1.filter((word) => words2.includes(word));
        if (commonWords.length > 0) {
          score +=
            0.3 * (commonWords.length / Math.max(words1.length, words2.length));
        }
      }
    }

    // Structured data matching
    if (this.isStructuredPOI(input1) && this.isStructuredPOI(input2)) {
      // Name matching
      if (input1.name && input2.name) {
        const name1 = input1.name.toLowerCase();
        const name2 = input2.name.toLowerCase();

        if (name1 === name2) {
          score += 0.4;
        } else if (name1.includes(name2) || name2.includes(name1)) {
          score += 0.2;
        }
      }

      // Type matching
      if (input1.type === input2.type) {
        score += 0.2;
      }

      // Location matching
      if (input1.location && input2.location) {
        if (input1.location.city === input2.location.city) {
          score += 0.1;
        }
        if (input1.location.state === input2.location.state) {
          score += 0.1;
        }
        if (input1.location.country === input2.location.country) {
          score += 0.05;
        }
      }
    }

    return Math.min(score, 1.0);
  }

  /**
   * Extract description text from input data
   */
  private extractDescription(inputData: ContentInputData): string | null {
    if (
      "description" in inputData &&
      typeof inputData.description === "string"
    ) {
      return inputData.description;
    }
    if (this.isStructuredPOI(inputData) && inputData.name) {
      return inputData.name;
    }
    return null;
  }

  /**
   * Type guard to check if input data is structured POI
   */
  private isStructuredPOI(
    inputData: ContentInputData
  ): inputData is StructuredPOIDto {
    return "name" in inputData && "type" in inputData;
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Convert degrees to radians
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Evict old content if we exceed cache limits
   */
  private evictOldContentIfNeeded(): void {
    const contents = Array.from(this.contents.entries());

    // Remove items that exceed max age
    const now = new Date();
    const expiredIds: string[] = [];

    for (const [id, content] of contents) {
      const age = now.getTime() - content.storedAt.getTime();
      if (age > this.cacheConfig.maxAge) {
        expiredIds.push(id);
      }
    }

    for (const id of expiredIds) {
      this.contents.delete(id);
    }

    // If still over limit, remove least recently accessed items
    if (this.contents.size >= this.cacheConfig.maxItems) {
      const sortedContents = Array.from(this.contents.entries()).sort(
        ([, a], [, b]) =>
          a.lastAccessedAt.getTime() - b.lastAccessedAt.getTime()
      );

      const itemsToRemove = this.contents.size - this.cacheConfig.maxItems + 1;
      for (let i = 0; i < itemsToRemove; i++) {
        const [id] = sortedContents[i];
        this.contents.delete(id);
      }
    }
  }
}
