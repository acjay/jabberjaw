import { z } from "zod";

// Base location schema
export const LocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  timestamp: z.date().optional(),
  accuracy: z.number().positive().optional(),
});

// Location request schema for API endpoints
export const LocationRequestSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  radius: z.number().min(100).max(50000).optional().default(5000),
});

// Location response schema
export const LocationResponseSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  timestamp: z.date(),
});

export type Location = z.infer<typeof LocationSchema>;
export type LocationRequest = z.infer<typeof LocationRequestSchema>;
export type LocationResponse = z.infer<typeof LocationResponseSchema>;
