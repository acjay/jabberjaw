import { LocationData } from './location.model.ts';

/**
 * Comprehensive enumeration of Point of Interest categories
 * Based on the expanded category list from the design document
 */
export enum POICategory {
  // Geographic features
  TOWN = 'town',
  COUNTY = 'county',
  NEIGHBORHOOD = 'neighborhood',
  WATERWAY = 'waterway',
  MOUNTAIN = 'mountain',
  VALLEY = 'valley',
  PLATEAU = 'plateau',

  // Infrastructure
  MAJOR_ROAD = 'major_road',
  BRIDGE = 'bridge',
  LANDMARK = 'landmark',
  AIRPORT = 'airport',
  TRAIN_STATION = 'train_station',
  REST_STOP = 'rest_stop',

  // Institutions
  INSTITUTION = 'institution',
  MUSEUM = 'museum',
  LIBRARY = 'library',
  CULTURAL_CENTER = 'cultural_center',

  // Natural areas
  PARK = 'park',
  WILDLIFE_REFUGE = 'wildlife_refuge',
  SCENIC_OVERLOOK = 'scenic_overlook',

  // Cultural sites
  THEATER = 'theater',
  MUSIC_VENUE = 'music_venue',
  ART_INSTALLATION = 'art_installation',

  // Religious sites
  RELIGIOUS_SITE = 'religious_site',
  CHURCH = 'church',
  TEMPLE = 'temple',
  MONASTERY = 'monastery',
  PILGRIMAGE_SITE = 'pilgrimage_site',

  // Industrial heritage
  FACTORY = 'factory',
  MILL = 'mill',
  MINING_SITE = 'mining_site',
  AGRICULTURAL_FACILITY = 'agricultural_facility',

  // Sports and recreation
  STADIUM = 'stadium',
  RACE_TRACK = 'race_track',
  GOLF_COURSE = 'golf_course',
  SKI_RESORT = 'ski_resort',

  // Military sites
  MILITARY_BASE = 'military_base',
  BATTLEFIELD = 'battlefield',
  MEMORIAL = 'memorial',
  FORT = 'fort',

  // Transportation history
  HISTORIC_ROUTE = 'historic_route',
  CANAL = 'canal',
  RAILROAD_HERITAGE = 'railroad_heritage',

  // Geological features
  CAVE = 'cave',
  ROCK_FORMATION = 'rock_formation',
  MINERAL_SITE = 'mineral_site',
  FAULT_LINE = 'fault_line',

  // Agricultural landmarks
  FARM = 'farm',
  VINEYARD = 'vineyard',
  ORCHARD = 'orchard',
  FARMERS_MARKET = 'farmers_market',
}

/**
 * Metadata associated with a Point of Interest
 * Contains optional contextual information that varies by POI type
 */
export interface POIMetadata {
  /** Population for towns, counties, neighborhoods */
  population?: number;

  /** Year the location was founded or established */
  foundedYear?: number;

  /** Elevation above sea level in meters */
  elevation?: number;

  /** Array of significance descriptors (historical, cultural, geological, etc.) */
  significance: string[];

  /** Numerical significance score (0-100) for road trip relevance */
  significanceScore?: number;
}

/**
 * Point of Interest model representing notable locations and landmarks
 * Used for content generation and geographic context
 */
export interface PointOfInterest {
  /** Unique identifier for the POI */
  id: string;

  /** Display name of the point of interest */
  name: string;

  /** Category classification for content generation */
  category: POICategory;

  /** Geographic coordinates of the POI */
  location: {
    latitude: number;
    longitude: number;
  };

  /** Descriptive text about the POI */
  description: string;

  /** Additional contextual metadata */
  metadata: POIMetadata;
}

/**
 * Validation function for PointOfInterest
 * Ensures all required fields are present and valid
 */
export function validatePointOfInterest(poi: PointOfInterest): boolean {
  // Validate required string fields
  if (!poi.id || typeof poi.id !== 'string' || poi.id.trim().length === 0) {
    return false;
  }

  if (!poi.name || typeof poi.name !== 'string' || poi.name.trim().length === 0) {
    return false;
  }

  if (!poi.description || typeof poi.description !== 'string') {
    return false;
  }

  // Validate category is a valid enum value
  if (!Object.values(POICategory).includes(poi.category)) {
    return false;
  }

  // Validate location coordinates
  if (
    !poi.location ||
    typeof poi.location.latitude !== 'number' ||
    typeof poi.location.longitude !== 'number' ||
    poi.location.latitude < -90 || poi.location.latitude > 90 ||
    poi.location.longitude < -180 || poi.location.longitude > 180
  ) {
    return false;
  }

  // Validate metadata structure
  if (!poi.metadata || typeof poi.metadata !== 'object') {
    return false;
  }

  if (!Array.isArray(poi.metadata.significance)) {
    return false;
  }

  // Validate optional numeric fields if present
  if (
    poi.metadata.population !== undefined &&
    (typeof poi.metadata.population !== 'number' || poi.metadata.population < 0)
  ) {
    return false;
  }

  if (
    poi.metadata.foundedYear !== undefined &&
    (typeof poi.metadata.foundedYear !== 'number' || poi.metadata.foundedYear < 0)
  ) {
    return false;
  }

  if (
    poi.metadata.elevation !== undefined &&
    typeof poi.metadata.elevation !== 'number'
  ) {
    return false;
  }

  return true;
}

/**
 * Type guard to check if an object is a valid PointOfInterest
 */
export function isPointOfInterest(obj: any): obj is PointOfInterest {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    validatePointOfInterest(obj)
  );
}

/**
 * Helper function to get POI categories by type grouping
 */
export function getPOICategoriesByGroup(): Record<string, POICategory[]> {
  return {
    geographic: [
      POICategory.TOWN,
      POICategory.COUNTY,
      POICategory.NEIGHBORHOOD,
      POICategory.WATERWAY,
      POICategory.MOUNTAIN,
      POICategory.VALLEY,
      POICategory.PLATEAU,
    ],
    infrastructure: [
      POICategory.MAJOR_ROAD,
      POICategory.BRIDGE,
      POICategory.LANDMARK,
      POICategory.AIRPORT,
      POICategory.TRAIN_STATION,
      POICategory.REST_STOP,
    ],
    institutions: [
      POICategory.INSTITUTION,
      POICategory.MUSEUM,
      POICategory.LIBRARY,
      POICategory.CULTURAL_CENTER,
    ],
    natural: [
      POICategory.PARK,
      POICategory.WILDLIFE_REFUGE,
      POICategory.SCENIC_OVERLOOK,
    ],
    cultural: [
      POICategory.THEATER,
      POICategory.MUSIC_VENUE,
      POICategory.ART_INSTALLATION,
    ],
    religious: [
      POICategory.RELIGIOUS_SITE,
      POICategory.CHURCH,
      POICategory.TEMPLE,
      POICategory.MONASTERY,
      POICategory.PILGRIMAGE_SITE,
    ],
    industrial: [
      POICategory.FACTORY,
      POICategory.MILL,
      POICategory.MINING_SITE,
      POICategory.AGRICULTURAL_FACILITY,
    ],
    recreation: [
      POICategory.STADIUM,
      POICategory.RACE_TRACK,
      POICategory.GOLF_COURSE,
      POICategory.SKI_RESORT,
    ],
    military: [
      POICategory.MILITARY_BASE,
      POICategory.BATTLEFIELD,
      POICategory.MEMORIAL,
      POICategory.FORT,
    ],
    transportation: [
      POICategory.HISTORIC_ROUTE,
      POICategory.CANAL,
      POICategory.RAILROAD_HERITAGE,
    ],
    geological: [
      POICategory.CAVE,
      POICategory.ROCK_FORMATION,
      POICategory.MINERAL_SITE,
      POICategory.FAULT_LINE,
    ],
    agricultural: [
      POICategory.FARM,
      POICategory.VINEYARD,
      POICategory.ORCHARD,
      POICategory.FARMERS_MARKET,
    ],
  };
}
