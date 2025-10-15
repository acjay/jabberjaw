import { z } from "zod";
import {
  StorySubjectSchema,
  StorySeedSchema,
  type StorySubject,
  type StorySeed,
  type FullStory,
} from "./story.schema.ts";

// Content style enum
export const ContentStyleSchema = z.enum([
  "historical",
  "cultural",
  "geographical",
  "mixed",
]);

// Content request schema - uses StorySubjectSchema instead of discriminated union
export const FullStoryRequestSchema = z.object({
  storySubject: StorySubjectSchema,
  targetDuration: z.number().min(30).max(600).optional().default(180),
  contentStyle: ContentStyleSchema.optional().default("mixed"),
});

// Story metadata schema
export const StoryMetadataSchema = z.object({
  id: z.string(),
  title: z.string(),
  summary: z.string(),
  duration: z.number().positive(),
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }),
  createdAt: z.date(),
  accessCount: z.number().nonnegative().default(0),
});

// Story seeds response schema
export const StorySeedsResponseSchema = z.object({
  seeds: z.array(StorySeedSchema),
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }),
  timestamp: z.date(),
});

// Export the enum values for runtime use
export const ContentStyle = {
  HISTORICAL: "historical" as const,
  CULTURAL: "cultural" as const,
  GEOGRAPHICAL: "geographical" as const,
  MIXED: "mixed" as const,
} as const;

// Export types - importing core types from story.schema.ts and defining API boundary types
export type ContentStyleType = z.infer<typeof ContentStyleSchema>;
export type FullStoryRequest = z.infer<typeof FullStoryRequestSchema>;
export type StoryMetadata = z.infer<typeof StoryMetadataSchema>;
export type StorySeedsResponse = z.infer<typeof StorySeedsResponseSchema>;

// Re-export core types from story.schema.ts for convenience
export type { StorySubject, StorySeed, FullStory };
