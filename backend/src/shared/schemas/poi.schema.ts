import { z } from "zod";
import { LocationSchema } from "./location.schema.ts";

// POI discovery request schema
export const POIDiscoveryRequestSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  radiusMeters: z.number().min(100).max(50000).optional().default(5000),
  maxResults: z.number().min(1).max(100).optional().default(20),
  sortBySignificance: z.boolean().optional().default(false),
});

// POI schema
export const POISchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  category: z.string(),
  location: LocationSchema,
  distance: z.number().optional(),
  significance: z.number().optional(),
  description: z.string().optional(),
  locationDescription: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

// POI discovery response schema
export const POIDiscoveryResponseSchema = z.object({
  pois: z.array(POISchema),
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }),
  searchRadius: z.number(),
  totalFound: z.number(),
  timestamp: z.date(),
});

// POI filter request schema
export const POIFilterRequestSchema = z.object({
  centerLocation: LocationSchema,
  pois: z.array(POISchema),
  maxDistanceMeters: z.number().min(1).max(100000),
});

// Top significant POIs request schema
export const TopSignificantPOIsRequestSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  radius: z.number().min(100).max(50000).optional().default(5000),
});

// Structured POI schema for content generation
export const StructuredPOISchema = z.object({
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

// Text POI description schema
export const TextPOIDescriptionSchema = z.object({
  type: z.literal("TextPOIDescription"),
  description: z.string().min(1),
});

export type POIDiscoveryRequest = z.infer<typeof POIDiscoveryRequestSchema>;
export type POI = z.infer<typeof POISchema>;
export type POIDiscoveryResponse = z.infer<typeof POIDiscoveryResponseSchema>;
export type POIFilterRequest = z.infer<typeof POIFilterRequestSchema>;
export type TopSignificantPOIsRequest = z.infer<
  typeof TopSignificantPOIsRequestSchema
>;
export type StructuredPOI = z.infer<typeof StructuredPOISchema>;
export type TextPOIDescription = z.infer<typeof TextPOIDescriptionSchema>;
