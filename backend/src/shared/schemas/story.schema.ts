import { z } from "zod";

/**
 * Core story subject representation for POI-based content generation
 */
export const StorySubjectSchema = z.object({
  type: z.literal("StructuredPOI"),
  name: z.string().min(1),
  poiType: z.string().min(1),
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }),
  description: z.string().optional(),
  locationDescription: z.string().optional(),
  category: z.string().optional(),
  significance: z.number().optional(),
  tags: z.array(z.string()).optional(),
});

/**
 * Story seed with embedded subject information
 */
export const StorySeedSchema = z.object({
  type: z.literal("StorySeed"),
  storyId: z.string(),
  title: z.string(),
  summary: z.string(),
  storySubject: StorySubjectSchema,
  createdAt: z.date(),
});

/**
 * Complete story with embedded seed
 */
export const FullStorySchema = z.object({
  storyId: z.string(),
  content: z.string(),
  duration: z.number().positive(),
  storySeed: StorySeedSchema,
  status: z.enum(["ready", "generating", "error"]).default("ready"),
  generatedAt: z.date().optional(),
});

// TypeScript type exports
export type StorySubject = z.infer<typeof StorySubjectSchema>;
export type StorySeed = z.infer<typeof StorySeedSchema>;
export type FullStory = z.infer<typeof FullStorySchema>;
