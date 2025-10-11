/**
 * Location data model for GPS coordinates and related information
 * Used for tracking user location and associating content with geographic positions
 */
export interface LocationData {
  /** Latitude coordinate in decimal degrees */
  latitude: number;
  
  /** Longitude coordinate in decimal degrees */
  longitude: number;
  
  /** Timestamp when the location was recorded */
  timestamp: Date;
  
  /** GPS accuracy in meters */
  accuracy: number;
}

/**
 * Validation function for LocationData
 * Ensures coordinates are within valid ranges and accuracy is positive
 */
export function validateLocationData(location: LocationData): boolean {
  // Validate latitude range (-90 to 90)
  if (location.latitude < -90 || location.latitude > 90) {
    return false;
  }
  
  // Validate longitude range (-180 to 180)
  if (location.longitude < -180 || location.longitude > 180) {
    return false;
  }
  
  // Validate accuracy is positive
  if (location.accuracy < 0) {
    return false;
  }
  
  // Validate timestamp is a valid date
  if (!(location.timestamp instanceof Date) || isNaN(location.timestamp.getTime())) {
    return false;
  }
  
  return true;
}

/**
 * Type guard to check if an object is a valid LocationData
 */
export function isLocationData(obj: any): obj is LocationData {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.latitude === 'number' &&
    typeof obj.longitude === 'number' &&
    obj.timestamp instanceof Date &&
    typeof obj.accuracy === 'number' &&
    validateLocationData(obj)
  );
}