import { z } from "zod";

// Common schemas used across Google Maps APIs
export const LatLngSchema = z.object({
  lat: z.number(),
  lng: z.number(),
});

export const GeometrySchema = z.object({
  location: LatLngSchema,
  viewport: z
    .object({
      northeast: LatLngSchema,
      southwest: LatLngSchema,
    })
    .optional(),
});

export const PhotoSchema = z.object({
  height: z.number(),
  width: z.number(),
  photo_reference: z.string(),
  html_attributions: z.array(z.string()),
});

export const PlusCodeSchema = z.object({
  compound_code: z.string().optional(),
  global_code: z.string(),
});

// Places API Schemas
export const PlaceSchema = z.object({
  place_id: z.string(),
  name: z.string().optional(),
  geometry: GeometrySchema,
  rating: z.number().optional(),
  types: z.array(z.string()),
  vicinity: z.string().optional(),
  price_level: z.number().min(0).max(4).optional(),
  photos: z.array(PhotoSchema).optional(),
  opening_hours: z
    .object({
      open_now: z.boolean().optional(),
    })
    .optional(),
  plus_code: PlusCodeSchema.optional(),
  user_ratings_total: z.number().optional(),
  business_status: z
    .enum(["OPERATIONAL", "CLOSED_TEMPORARILY", "CLOSED_PERMANENTLY"])
    .optional(),
});

export const PlacesNearbySearchResponseSchema = z.object({
  results: z.array(PlaceSchema),
  status: z.enum([
    "OK",
    "ZERO_RESULTS",
    "OVER_QUERY_LIMIT",
    "REQUEST_DENIED",
    "INVALID_REQUEST",
    "UNKNOWN_ERROR",
  ]),
  error_message: z.string().optional(),
  info_messages: z.array(z.string()).optional(),
  next_page_token: z.string().optional(),
});

// Place Details API Schema
export const AddressComponentSchema = z.object({
  long_name: z.string(),
  short_name: z.string(),
  types: z.array(z.string()),
});

export const PlaceDetailsSchema = z.object({
  place_id: z.string(),
  name: z.string().optional(),
  formatted_address: z.string().optional(),
  address_components: z.array(AddressComponentSchema).optional(),
  geometry: GeometrySchema.optional(),
  rating: z.number().optional(),
  types: z.array(z.string()).optional(),
  vicinity: z.string().optional(),
  price_level: z.number().min(0).max(4).optional(),
  photos: z.array(PhotoSchema).optional(),
  opening_hours: z
    .object({
      open_now: z.boolean().optional(),
      periods: z
        .array(
          z.object({
            close: z
              .object({
                day: z.number().min(0).max(6),
                time: z.string(),
              })
              .optional(),
            open: z.object({
              day: z.number().min(0).max(6),
              time: z.string(),
            }),
          })
        )
        .optional(),
      weekday_text: z.array(z.string()).optional(),
    })
    .optional(),
  plus_code: PlusCodeSchema.optional(),
  user_ratings_total: z.number().optional(),
  business_status: z
    .enum(["OPERATIONAL", "CLOSED_TEMPORARILY", "CLOSED_PERMANENTLY"])
    .optional(),
  formatted_phone_number: z.string().optional(),
  international_phone_number: z.string().optional(),
  website: z.string().optional(),
  url: z.string().optional(),
  utc_offset: z.number().optional(),
  reviews: z
    .array(
      z.object({
        author_name: z.string(),
        author_url: z.string().optional(),
        language: z.string().optional(),
        profile_photo_url: z.string().optional(),
        rating: z.number().min(1).max(5),
        relative_time_description: z.string(),
        text: z.string(),
        time: z.number(),
      })
    )
    .optional(),
});

export const PlaceDetailsResponseSchema = z.object({
  result: PlaceDetailsSchema.optional(),
  status: z.enum([
    "OK",
    "ZERO_RESULTS",
    "NOT_FOUND",
    "OVER_QUERY_LIMIT",
    "REQUEST_DENIED",
    "INVALID_REQUEST",
    "UNKNOWN_ERROR",
  ]),
  error_message: z.string().optional(),
  info_messages: z.array(z.string()).optional(),
});

// Geocoding API Schemas
export const GeocodingResultSchema = z.object({
  address_components: z.array(AddressComponentSchema),
  formatted_address: z.string(),
  geometry: z.object({
    location: LatLngSchema,
    location_type: z.enum([
      "ROOFTOP",
      "RANGE_INTERPOLATED",
      "GEOMETRIC_CENTER",
      "APPROXIMATE",
    ]),
    viewport: z.object({
      northeast: LatLngSchema,
      southwest: LatLngSchema,
    }),
    bounds: z
      .object({
        northeast: LatLngSchema,
        southwest: LatLngSchema,
      })
      .optional(),
  }),
  place_id: z.string(),
  plus_code: PlusCodeSchema.optional(),
  types: z.array(z.string()),
});

export const GeocodingResponseSchema = z.object({
  results: z.array(GeocodingResultSchema),
  status: z.enum([
    "OK",
    "ZERO_RESULTS",
    "OVER_DAILY_LIMIT",
    "OVER_QUERY_LIMIT",
    "REQUEST_DENIED",
    "INVALID_REQUEST",
    "UNKNOWN_ERROR",
  ]),
  error_message: z.string().optional(),
});

// Roads API Schemas
export const SnappedPointSchema = z.object({
  location: LatLngSchema,
  originalIndex: z.number().optional(),
  placeId: z.string(),
});

export const SnapToRoadsResponseSchema = z.object({
  snappedPoints: z.array(SnappedPointSchema),
  warningMessage: z.string().optional(),
});

export const NearestRoadsResponseSchema = z.object({
  snappedPoints: z.array(SnappedPointSchema),
});

export const SpeedLimitSchema = z.object({
  placeId: z.string(),
  speedLimit: z.number(),
  units: z.enum(["KPH", "MPH"]),
});

export const SpeedLimitsResponseSchema = z.object({
  speedLimits: z.array(SpeedLimitSchema),
  warningMessage: z.string().optional(),
});

// Type exports
export type LatLng = z.infer<typeof LatLngSchema>;
export type Geometry = z.infer<typeof GeometrySchema>;
export type Photo = z.infer<typeof PhotoSchema>;
export type PlusCode = z.infer<typeof PlusCodeSchema>;
export type Place = z.infer<typeof PlaceSchema>;
export type PlacesNearbySearchResponse = z.infer<
  typeof PlacesNearbySearchResponseSchema
>;
export type AddressComponent = z.infer<typeof AddressComponentSchema>;
export type PlaceDetails = z.infer<typeof PlaceDetailsSchema>;
export type PlaceDetailsResponse = z.infer<typeof PlaceDetailsResponseSchema>;
export type GeocodingResult = z.infer<typeof GeocodingResultSchema>;
export type GeocodingResponse = z.infer<typeof GeocodingResponseSchema>;
export type SnappedPoint = z.infer<typeof SnappedPointSchema>;
export type SnapToRoadsResponse = z.infer<typeof SnapToRoadsResponseSchema>;
export type NearestRoadsResponse = z.infer<typeof NearestRoadsResponseSchema>;
export type SpeedLimit = z.infer<typeof SpeedLimitSchema>;
export type SpeedLimitsResponse = z.infer<typeof SpeedLimitsResponseSchema>;
