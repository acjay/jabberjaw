import { z } from "zod";
import { StructuredPOISchema, TextPOIDescriptionSchema } from "./poi.schema.ts";

// Content style enum
export const ContentStyleSchema = z.enum([
  "historical",
  "cultural",
  "geographical",
  "mixed",
]);

// Content request schema
export const ContentRequestSchema = z.object({
  input: z.discriminatedUnion("type", [
    TextPOIDescriptionSchema,
    StructuredPOISchema,
  ]),
  targetDuration: z.number().min(30).max(600).optional().default(180),
  contentStyle: ContentStyleSchema.optional().default("mixed"),
});

// Generated content schema
export const GeneratedContentSchema = z.object({
  id: z.string(),
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

// Story seed schema
export const StorySeedSchema = z.object({
  id: z.string(),
  title: z.string(),
  summary: z.string(),
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }),
  contentStyle: ContentStyleSchema,
  targetDuration: z.number().positive(),
  createdAt: z.date(),
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
  contentStyle: ContentStyleSchema,
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

// Story response schema
export const StoryResponseSchema = z.object({
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

// Export the enum values for runtime use
export const ContentStyle = {
  HISTORICAL: "historical" as const,
  CULTURAL: "cultural" as const,
  GEOGRAPHICAL: "geographical" as const,
  MIXED: "mixed" as const,
} as const;

export type ContentStyleType = z.infer<typeof ContentStyleSchema>;
export type ContentRequest = z.infer<typeof ContentRequestSchema>;
export type GeneratedContent = z.infer<typeof GeneratedContentSchema>;
export type StorySeed = z.infer<typeof StorySeedSchema>;
export type StoryMetadata = z.infer<typeof StoryMetadataSchema>;
export type StorySeedsResponse = z.infer<typeof StorySeedsResponseSchema>;
export type StoryResponse = z.infer<typeof StoryResponseSchema>;
