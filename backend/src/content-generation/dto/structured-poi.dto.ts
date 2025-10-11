export enum POIType {
  TOWN = 'town',
  CITY = 'city',
  LANDMARK = 'landmark',
  PARK = 'park',
  MUSEUM = 'museum',
  ARBORETUM = 'arboretum',
  HISTORICAL_SITE = 'historical_site',
  NATURAL_FEATURE = 'natural_feature',
  INSTITUTION = 'institution',
  WATERWAY = 'waterway',
  BRIDGE = 'bridge',
  MOUNTAIN = 'mountain',
  VALLEY = 'valley',
  AIRPORT = 'airport',
  TRAIN_STATION = 'train_station',
  CULTURAL_CENTER = 'cultural_center',
  THEATER = 'theater',
  RELIGIOUS_SITE = 'religious_site',
  MILITARY_SITE = 'military_site',
  AGRICULTURAL_SITE = 'agricultural_site'
}

export interface LocationInfo {
  country: string;
  state?: string;
  city?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

export class StructuredPOIDto {
  name!: string;
  type!: POIType;
  location!: LocationInfo;
  description?: string;
  context?: string;

  constructor(data: Partial<StructuredPOIDto>) {
    Object.assign(this, data);
    
    if (!this.name || typeof this.name !== 'string') {
      throw new Error('Name is required and must be a string');
    }
    
    if (!this.type || !Object.values(POIType).includes(this.type)) {
      throw new Error('Type is required and must be a valid POIType');
    }
    
    if (!this.location || !this.location.country) {
      throw new Error('Location with country is required');
    }
    
    // Validate coordinates if provided
    if (this.location.coordinates) {
      const { latitude, longitude } = this.location.coordinates;
      if (typeof latitude !== 'number' || latitude < -90 || latitude > 90) {
        throw new Error('Latitude must be a number between -90 and 90');
      }
      if (typeof longitude !== 'number' || longitude < -180 || longitude > 180) {
        throw new Error('Longitude must be a number between -180 and 180');
      }
    }
    
    // Validate optional string fields
    if (this.description && typeof this.description !== 'string') {
      throw new Error('Description must be a string');
    }
    
    if (this.context && typeof this.context !== 'string') {
      throw new Error('Context must be a string');
    }
  }
}