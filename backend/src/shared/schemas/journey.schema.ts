import { z } from "zod";
import { StorySeedsResponseSchema, FullStorySchema } from "./content.schema.ts";

// Journey location request schema
export const JourneyLocationRequestSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  timestamp: z.date().optional(),
  accuracy: z.number().positive().optional(),
  speed: z.number().nonnegative().optional(),
  heading: z.number().min(0).max(360).optional(),
});

// Journey location response schema (alias for story seeds response)
export const JourneyLocationResponseSchema = StorySeedsResponseSchema;

// Roads snap request schema
export const RoadsSnapRequestSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

// Road info schema (Google Roads API response)
// Flexible schema that handles both full API responses and simplified fallback responses
export const RoadInfoSchema = z.object({
  // Basic road identification (always present)
  name: z.string().optional(), // Fallback field name
  roadName: z.string().optional(), // Full API response field name

  // Full API response fields (optional for fallback compatibility)
  placeId: z.string().optional(),
  snappedLocation: z
    .object({
      latitude: z.number(),
      longitude: z.number(),
    })
    .optional(),
  originalLocation: z
    .object({
      latitude: z.number(),
      longitude: z.number(),
    })
    .optional(),
  distanceFromOriginal: z.number().optional(),
  confidence: z.number().optional(),
});

// Connection test response schema
export const ConnectionTestResponseSchema = z.object({
  configured: z.boolean(),
  connectionTest: z.boolean(),
  timestamp: z.string(),
});

// Roads snap response schema
export const RoadsSnapResponseSchema = z.object({
  roadInfo: RoadInfoSchema.nullable(),
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }),
  timestamp: z.string(),
});

// Roads nearest response schema
export const RoadsNearestResponseSchema = z.object({
  roads: z.array(RoadInfoSchema),
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }),
  timestamp: z.string(),
});

// Health check response schema
export const HealthResponseSchema = z.object({
  status: z.string(),
  service: z.string(),
  timestamp: z.date().optional(),
  stories: z.number().optional(),
});

export type JourneyLocationRequest = z.infer<
  typeof JourneyLocationRequestSchema
>;
export type JourneyLocationResponse = z.infer<
  typeof JourneyLocationResponseSchema
>;
export type RoadsSnapRequest = z.infer<typeof RoadsSnapRequestSchema>;
export type RoadInfo = z.infer<typeof RoadInfoSchema>;
export type ConnectionTestResponse = z.infer<
  typeof ConnectionTestResponseSchema
>;
export type RoadsSnapResponse = z.infer<typeof RoadsSnapResponseSchema>;
export type RoadsNearestResponse = z.infer<typeof RoadsNearestResponseSchema>;
export type HealthResponse = z.infer<typeof HealthResponseSchema>;
