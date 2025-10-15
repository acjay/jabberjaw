import { z } from "zod";
import { StructuredPOISchema, TextPOIDescriptionSchema } from "./poi.schema.ts";

// Content style enum
export const ContentStyleSchema = z.enum([
  "historical",
  "cultural",
  "geographical",
  "mixed",
]);

// Story seed schema
export const StorySeedSchema = z.object({
  storyId: z.string(),
  title: z.string(),
  summary: z.string(),
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }),
  createdAt: z.date(),
});

// Content request schema
export const FullStoryRequestSchema = z.object({
  input: z.discriminatedUnion("type", [
    TextPOIDescriptionSchema,
    StructuredPOISchema,
  ]),
  targetDuration: z.number().min(30).max(600).optional().default(180),
  contentStyle: ContentStyleSchema.optional().default("mixed"),
  storySeed: StorySeedSchema.optional(),
});

// Full story schema
export const FullStorySchema = z.object({
  storyId: z.string(),
  content: z.string(),
  duration: z.number().positive(),
  status: z.enum(["ready", "generating", "error"]).default("ready"),
  location: z
    .object({
      latitude: z.number(),
      longitude: z.number(),
    })
    .optional(),
  generatedAt: z.date().optional(),
  storyTitle: z.string().optional(),
  storySummary: z.string().optional(),
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

export type ContentStyleType = z.infer<typeof ContentStyleSchema>;
export type FullStoryRequest = z.infer<typeof FullStoryRequestSchema>;
export type FullStory = z.infer<typeof FullStorySchema>;
export type StorySeed = z.infer<typeof StorySeedSchema>;
export type StoryMetadata = z.infer<typeof StoryMetadataSchema>;
export type StorySeedsResponse = z.infer<typeof StorySeedsResponseSchema>;
