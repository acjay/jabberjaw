import {
  type GeocodingResponse,
  type AddressComponent,
} from "../schemas/index.ts";

/**
 * Generates a location description from geocoding data
 * Creates a hierarchical description like "Metuchen Borough, Middlesex County, New Jersey, United States"
 */
export function generateLocationDescription(
  geocodingResponse: GeocodingResponse
): string | undefined {
  if (!geocodingResponse.results || geocodingResponse.results.length === 0) {
    return undefined;
  }

  const result = geocodingResponse.results[0];
  const components = result.address_components || [];

  // Extract components by type
  const componentMap = new Map<string, AddressComponent>();

  for (const component of components) {
    for (const type of component.types) {
      componentMap.set(type, component);
    }
  }

  // Build hierarchical description
  const parts: string[] = [];

  // Add locality/municipality (city, town, borough)
  const locality =
    componentMap.get("locality") ||
    componentMap.get("administrative_area_level_3") ||
    componentMap.get("sublocality_level_1");
  if (locality) {
    parts.push(locality.long_name);
  }

  // Add county (administrative_area_level_2)
  const county = componentMap.get("administrative_area_level_2");
  if (county) {
    parts.push(county.long_name);
  }

  // Add state/province (administrative_area_level_1)
  const state = componentMap.get("administrative_area_level_1");
  if (state) {
    parts.push(state.long_name);
  }

  // Add country
  const country = componentMap.get("country");
  if (country) {
    parts.push(country.long_name);
  }

  return parts.length > 0 ? parts.join(", ") : undefined;
}

/**
 * Generates a location description for a county-level POI
 * Excludes the county itself from the description
 */
export function generateCountyLocationDescription(
  geocodingResponse: GeocodingResponse
): string | undefined {
  if (!geocodingResponse.results || geocodingResponse.results.length === 0) {
    return undefined;
  }

  const result = geocodingResponse.results[0];
  const components = result.address_components || [];

  // Extract components by type
  const componentMap = new Map<string, AddressComponent>();

  for (const component of components) {
    for (const type of component.types) {
      componentMap.set(type, component);
    }
  }

  // Build hierarchical description (excluding county level)
  const parts: string[] = [];

  // Add state/province (administrative_area_level_1)
  const state = componentMap.get("administrative_area_level_1");
  if (state) {
    parts.push(state.long_name);
  }

  // Add country
  const country = componentMap.get("country");
  if (country) {
    parts.push(country.long_name);
  }

  return parts.length > 0 ? parts.join(", ") : undefined;
}

/**
 * Determines if a POI represents a county-level entity
 */
export function isCountyLevelPOI(poiName: string, poiTypes: string[]): boolean {
  return (
    poiTypes.includes("administrative_area_level_2") ||
    poiTypes.includes("county") ||
    poiName.toLowerCase().includes("county")
  );
}
