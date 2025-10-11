/**
 * Core data models and interfaces for the Road Trip Narrator backend
 * 
 * This module exports all the essential data structures used throughout
 * the application for location tracking, POI management, and content generation.
 */

// Location models
export {
  type LocationData,
  validateLocationData,
  isLocationData
} from './location.model.ts';

// POI models
export {
  type PointOfInterest,
  type POIMetadata,
  POICategory,
  validatePointOfInterest,
  isPointOfInterest,
  getPOICategoriesByGroup
} from './poi.model.ts';

// Content generation models (to be added in task 2.2)
export type {
  ContentRequest,
  GeneratedContent,
  StoredContent
} from './content.model.ts';