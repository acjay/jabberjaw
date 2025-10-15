import { Injectable } from "@danet/core";
import { LocationData } from "../../models/location.model.ts";
import { POICategory, PointOfInterest } from "../../models/poi.model.ts";
import {
  OverpassClient,
  GoogleMapsClient,
  NominatimClient,
} from "../../shared/index.ts";
import { ConfigurationService } from "../../configuration/index.ts";

/**
 * Configuration for POI discovery queries
 */
export interface POIDiscoveryConfig {
  /** Search radius in meters */
  radiusMeters: number;
  /** Maximum number of POIs to return */
  maxResults: number;
  /** Minimum significance score (0-1) */
  minSignificance?: number;
}

/**
 * External POI API response interface
 */
interface ExternalPOIResult {
  id: string;
  name: string;
  types: string[];
  location: {
    lat: number;
    lng: number;
  };
  vicinity?: string;
  rating?: number;
  place_id?: string;
  metadata?: {
    geometricDistance?: number;
    geometry?: Array<{ lat: number; lon: number }>;
    [key: string]: any;
  };
}

/**
 * Service for discovering Points of Interest near a given location
 * Integrates with external APIs and categorizes POIs according to our taxonomy
 */
@Injectable()
export class POIIdentificationService {
  private readonly defaultConfig: POIDiscoveryConfig = {
    radiusMeters: 5000, // 5km default radius
    maxResults: 20,
    minSignificance: 0.3,
  };

  constructor(
    private readonly overpassClient: OverpassClient,
    private readonly googleMapsClient: GoogleMapsClient,
    private readonly nominatimClient: NominatimClient,
    private readonly configService: ConfigurationService
  ) {}

  /**
   * Discover POIs near a given location
   */
  async discoverPOIs(
    location: LocationData,
    config: Partial<POIDiscoveryConfig> = {}
  ): Promise<PointOfInterest[]> {
    const searchConfig = { ...this.defaultConfig, ...config };

    try {
      // Start with high-priority geographic context (municipalities and highways)
      const contextResults = await this.queryGeographicContext(
        location,
        searchConfig
      );

      // Add regular POIs from external APIs
      let poiResults: ExternalPOIResult[] = [];

      // Try Google Places API first, fallback to OpenStreetMap
      const googleResults = await this.queryGooglePlaces(
        location,
        searchConfig
      );
      if (googleResults.length > 0) {
        poiResults = googleResults;
      } else {
        // Fallback to OpenStreetMap
        const osmResults = await this.queryOpenStreetMap(
          location,
          searchConfig
        );
        poiResults = osmResults;
      }

      // Combine context and POI results
      const allResults = [...contextResults, ...poiResults];

      // Remove duplicates and limit results
      const uniqueResults = this.deduplicateResults(allResults);
      const limitedResults = uniqueResults.slice(0, searchConfig.maxResults);

      return this.categorizePOIs(limitedResults, location);
    } catch (error) {
      console.error("Error discovering POIs:", error);
      // Return mock data for development/testing
      return this.getMockPOIs(location, searchConfig.maxResults);
    }
  }

  /**
   * Query geographic context including municipalities and highways
   * This provides high-priority road trip context that regular POI APIs miss
   */
  private async queryGeographicContext(
    location: LocationData,
    config: POIDiscoveryConfig
  ): Promise<ExternalPOIResult[]> {
    const results: ExternalPOIResult[] = [];

    try {
      // Query for administrative boundaries (municipalities)
      const adminResults = await this.queryAdministrativeBoundaries(location);
      results.push(...adminResults);

      // Query for highways and major roads
      const highwayResults = await this.queryHighwaysAndRoads(
        location,
        config.radiusMeters
      );
      results.push(...highwayResults);
    } catch (error) {
      console.warn("Error querying geographic context:", error);
    }

    return results;
  }

  /**
   * Query for administrative boundaries (cities, counties, states)
   * Uses reverse geocoding to identify the municipality
   */
  private async queryAdministrativeBoundaries(
    location: LocationData
  ): Promise<ExternalPOIResult[]> {
    const results: ExternalPOIResult[] = [];

    try {
      // Try Google Geocoding API first
      const googleKey = await this.configService.getGooglePlacesApiKey();
      if (googleKey) {
        try {
          const data = await this.googleMapsClient.geocode({
            latlng: `${location.latitude},${location.longitude}`,
            key: googleKey,
          });
          if (data.results && data.results.length > 0) {
            for (const result of data.results) {
              for (const component of result.address_components || []) {
                const types = component.types || [];

                // Extract municipalities
                if (
                  types.includes("locality") ||
                  types.includes("administrative_area_level_3")
                ) {
                  results.push({
                    id: `municipality_${component.short_name}`,
                    name: component.long_name,
                    types: ["locality", "municipality"],
                    location: {
                      lat: location.latitude,
                      lng: location.longitude,
                    },
                    vicinity: `${component.long_name} municipality`,
                  });
                }

                // Extract counties
                if (types.includes("administrative_area_level_2")) {
                  results.push({
                    id: `county_${component.short_name}`,
                    name: component.long_name,
                    types: ["administrative_area_level_2", "county"],
                    location: {
                      lat: location.latitude,
                      lng: location.longitude,
                    },
                    vicinity: `${component.long_name} county`,
                  });
                }

                // Extract states/provinces
                if (types.includes("administrative_area_level_1")) {
                  results.push({
                    id: `state_${component.short_name}`,
                    name: component.long_name,
                    types: ["administrative_area_level_1", "state"],
                    location: {
                      lat: location.latitude,
                      lng: location.longitude,
                    },
                    vicinity: `${component.long_name} state`,
                  });
                }
              }
            }
          }
        } catch (error) {
          console.warn("Error calling Google Geocoding API:", error);
        }
      }

      // Fallback to Nominatim (OpenStreetMap) reverse geocoding
      if (results.length === 0) {
        try {
          const data = await this.nominatimClient.reverse({
            lat: location.latitude,
            lon: location.longitude,
          });
          if (data.address) {
            const address = data.address;

            // Extract city/town
            const city = address.city || address.town || address.village;
            if (city) {
              results.push({
                id: `municipality_${city.replace(/\s+/g, "_")}`,
                name: city,
                types: ["locality", "municipality"],
                location: {
                  lat: location.latitude,
                  lng: location.longitude,
                },
                vicinity: `${city} municipality`,
              });
            }

            // Extract county
            if (address.county) {
              results.push({
                id: `county_${address.county.replace(/\s+/g, "_")}`,
                name: address.county,
                types: ["administrative_area_level_2", "county"],
                location: {
                  lat: location.latitude,
                  lng: location.longitude,
                },
                vicinity: `${address.county} county`,
              });
            }

            // Extract state
            if (address.state) {
              results.push({
                id: `state_${address.state.replace(/\s+/g, "_")}`,
                name: address.state,
                types: ["administrative_area_level_1", "state"],
                location: {
                  lat: location.latitude,
                  lng: location.longitude,
                },
                vicinity: `${address.state} state`,
              });
            }
          }
        } catch (error) {
          console.warn("Error calling Nominatim API:", error);
        }
      }
    } catch (error) {
      console.warn("Error querying administrative boundaries:", error);
    }

    return results;
  }

  /**
   * Query for highways and major roads near the location
   * Uses enhanced OpenStreetMap Overpass API with progressive radius search
   * Implements Method 4 from highway-detection-methods.md
   */
  private async queryHighwaysAndRoads(
    location: LocationData,
    radiusMeters: number
  ): Promise<ExternalPOIResult[]> {
    const results: ExternalPOIResult[] = [];

    try {
      // Progressive radius search for optimal results (Method 4)
      const highways = await this.findClosestHighwaysWithProgressiveSearch(
        location,
        radiusMeters
      );

      for (const highway of highways) {
        results.push({
          id: `highway_${highway.id}`,
          name: highway.name,
          types: highway.types,
          location: {
            lat: highway.centerPoint.lat,
            lng: highway.centerPoint.lng,
          },
          vicinity: `${highway.significance} near ${location.latitude.toFixed(
            4
          )}, ${location.longitude.toFixed(4)}`,
          // Store the actual geometric distance for use in significance scoring
          metadata: {
            geometricDistance: highway.distanceToUser,
            geometry: highway.geometry,
            confidence: highway.confidence,
            detectionMethod: "enhanced_overpass",
          },
        });
      }
    } catch (error) {
      console.warn("Error querying highways and roads:", error);
    }

    return results;
  }

  /**
   * Progressive radius search for closest highways (Method 4 implementation)
   * Tries smaller radii first for optimal results, then expands if needed
   */
  private async findClosestHighwaysWithProgressiveSearch(
    location: LocationData,
    maxRadiusMeters: number
  ): Promise<
    Array<{
      id: string;
      name: string;
      types: string[];
      significance: string;
      distanceToUser: number;
      confidence: number;
      geometry: Array<{ lat: number; lon: number }>;
      centerPoint: { lat: number; lng: number };
    }>
  > {
    // Progressive radius approach - try smaller radii first for closest results
    const radii = [100, 500, 2000].filter(
      (radius) => radius <= maxRadiusMeters
    );

    for (const radius of radii) {
      const highways = await this.queryHighwaysWithEnhancedOverpass(
        location,
        radius
      );

      if (highways.length > 0) {
        // Process geometry to find truly closest highways
        const processedHighways = highways
          .map((highway) => ({
            ...highway,
            distanceToUser: this.calculateDistanceToLineSegment(
              [location.latitude, location.longitude],
              highway.geometry
            ),
            confidence: this.calculateHighwayDetectionConfidence(
              highway,
              location
            ),
          }))
          .sort((a, b) => a.distanceToUser - b.distanceToUser);

        // Return results from the first radius that finds highways
        // This ensures we get the closest possible results
        return processedHighways;
      }
    }

    return [];
  }

  /**
   * Enhanced Overpass query with better filtering and geometry processing
   * Implements the core query improvements from Method 4
   */
  private async queryHighwaysWithEnhancedOverpass(
    location: LocationData,
    radiusMeters: number
  ): Promise<
    Array<{
      id: string;
      name: string;
      types: string[];
      significance: string;
      geometry: Array<{ lat: number; lon: number }>;
      centerPoint: { lat: number; lng: number };
    }>
  > {
    const results: Array<{
      id: string;
      name: string;
      types: string[];
      significance: string;
      geometry: Array<{ lat: number; lon: number }>;
      centerPoint: { lat: number; lng: number };
    }> = [];

    // Enhanced query with better filtering - only named highways
    const query = `
      [out:json][timeout:15];
      (
        way["highway"~"^(motorway|trunk|primary|secondary)$"]["name"]
        (around:${radiusMeters},${location.latitude},${location.longitude});
        way["highway"~"^(motorway|trunk|primary|secondary)$"]["ref"]
        (around:${radiusMeters},${location.latitude},${location.longitude});
        relation["route"="road"]["highway"~"^(motorway|trunk|primary)$"]["name"]
        (around:${radiusMeters},${location.latitude},${location.longitude});
        relation["route"="road"]["highway"~"^(motorway|trunk|primary)$"]["ref"]
        (around:${radiusMeters},${location.latitude},${location.longitude});
      );
      out geom meta;
    `;

    const data = await this.overpassClient.query(query);

    for (const element of data.elements || []) {
      const tags = element.tags || {};
      let name = tags.name || tags.ref;

      if (!name) continue;

      // Determine highway type and significance
      const highway = tags.highway;
      let types = ["highway", "major_road"];
      let significance = "major_road";

      if (highway === "motorway") {
        types = ["highway", "motorway", "interstate"];
        significance = "interstate";
        name = this.formatHighwayName(name, "Interstate");
      } else if (highway === "trunk") {
        types = ["highway", "trunk", "us_highway"];
        significance = "us_highway";
        name = this.formatHighwayName(name, "US Highway");
      } else if (highway === "primary") {
        types = ["highway", "primary", "state_highway"];
        significance = "state_highway";
        name = this.formatHighwayName(name, "Highway");
      } else if (highway === "secondary") {
        types = ["highway", "secondary", "state_highway"];
        significance = "state_highway";
        name = this.formatHighwayName(name, "Highway");
      }

      // Process geometry - ensure we have valid coordinates
      const geometry = this.processHighwayGeometry(element.geometry || []);
      if (geometry.length < 2) continue; // Skip if no valid geometry

      // Calculate center point for display
      const centerPoint = this.calculateGeometryCenter(geometry);

      results.push({
        id: element.id.toString(),
        name,
        types,
        significance,
        geometry,
        centerPoint,
      });
    }

    return results;
  }

  /**
   * Process and validate highway geometry coordinates
   * Ensures we have clean, usable geometry data
   */
  private processHighwayGeometry(
    rawGeometry: Array<{ lat: number; lon: number }>
  ): Array<{ lat: number; lon: number }> {
    if (!rawGeometry || !Array.isArray(rawGeometry)) {
      return [];
    }

    // Filter out invalid coordinates and ensure proper format
    return rawGeometry
      .filter(
        (point) =>
          point &&
          typeof point.lat === "number" &&
          typeof point.lon === "number" &&
          !isNaN(point.lat) &&
          !isNaN(point.lon) &&
          Math.abs(point.lat) <= 90 &&
          Math.abs(point.lon) <= 180
      )
      .map((point) => ({
        lat: point.lat,
        lon: point.lon,
      }));
  }

  /**
   * Calculate confidence score for highway detection
   * Higher confidence for closer highways with better geometry data
   */
  private calculateHighwayDetectionConfidence(
    highway: {
      geometry: Array<{ lat: number; lon: number }>;
      types: string[];
      significance: string;
    },
    location: LocationData
  ): number {
    let confidence = 0.5; // Base confidence

    // Boost confidence based on highway type
    if (
      highway.types.includes("interstate") ||
      highway.types.includes("motorway")
    ) {
      confidence += 0.3; // Interstates are well-mapped
    } else if (
      highway.types.includes("us_highway") ||
      highway.types.includes("trunk")
    ) {
      confidence += 0.2; // US highways are well-mapped
    } else if (
      highway.types.includes("state_highway") ||
      highway.types.includes("primary")
    ) {
      confidence += 0.1; // State highways are reasonably well-mapped
    }

    // Boost confidence based on geometry quality
    if (highway.geometry.length >= 10) {
      confidence += 0.1; // Good geometry resolution
    } else if (highway.geometry.length >= 5) {
      confidence += 0.05; // Moderate geometry resolution
    }

    // Boost confidence if geometry forms a reasonable line
    if (highway.geometry.length >= 2) {
      const totalDistance = this.calculateGeometryLength(highway.geometry);
      if (totalDistance > 100) {
        // Highway segment is substantial
        confidence += 0.1;
      }
    }

    return Math.min(1.0, confidence);
  }

  /**
   * Calculate the total length of a highway geometry
   * Used for confidence scoring
   */
  private calculateGeometryLength(
    geometry: Array<{ lat: number; lon: number }>
  ): number {
    if (geometry.length < 2) return 0;

    let totalLength = 0;
    for (let i = 0; i < geometry.length - 1; i++) {
      const distance = this.calculateDistance(
        geometry[i].lat,
        geometry[i].lon,
        geometry[i + 1].lat,
        geometry[i + 1].lon
      );
      totalLength += distance;
    }

    return totalLength;
  }

  /**
   * Format highway names for better readability
   */
  private formatHighwayName(ref: string, type: string): string {
    // Handle common highway reference formats
    if (ref.match(/^I-?\d+$/i)) {
      return `Interstate ${ref.replace(/^I-?/i, "")}`;
    }
    if (ref.match(/^US-?\d+$/i)) {
      return `US Highway ${ref.replace(/^US-?/i, "")}`;
    }
    if (ref.match(/^SR-?\d+$/i) || ref.match(/^CA-?\d+$/i)) {
      return `State Route ${ref.replace(/^(SR|CA)-?/i, "")}`;
    }
    if (ref.match(/^\d+$/)) {
      return `${type} ${ref}`;
    }

    return ref;
  }

  /**
   * Query Google Places API for nearby POIs
   */
  private async queryGooglePlaces(
    location: LocationData,
    config: POIDiscoveryConfig
  ): Promise<ExternalPOIResult[]> {
    const apiKey = await this.configService.getGooglePlacesApiKey();
    if (!apiKey) {
      throw new Error("Google Places API key not configured");
    }

    // Request multiple types to get comprehensive results
    const types = [
      "tourist_attraction",
      "museum",
      "park",
      "church",
      "university",
      "stadium",
      "airport",
      "train_station",
      "city_hall",
      "library",
      "hospital",
      "cemetery",
      "bridge",
    ];

    const allResults: ExternalPOIResult[] = [];

    // Make multiple requests for different types to get comprehensive coverage
    for (const type of types.slice(0, 3)) {
      // Limit to avoid rate limits
      try {
        const data = await this.googleMapsClient.placesNearbySearch({
          location: `${location.latitude},${location.longitude}`,
          radius: config.radiusMeters.toString(),
          type,
          key: apiKey,
        });
        if (data.results && Array.isArray(data.results)) {
          allResults.push(
            ...data.results.map((result: any) => ({
              id: result.place_id || crypto.randomUUID(),
              name: result.name,
              types: result.types || [type],
              location: {
                lat: result.geometry?.location?.lat || location.latitude,
                lng: result.geometry?.location?.lng || location.longitude,
              },
              vicinity: result.vicinity,
              rating: result.rating,
              place_id: result.place_id,
            }))
          );
        }

        // Small delay to respect rate limits
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        console.warn(`Failed to query Google Places for type ${type}:`, error);
      }
    }

    // Remove duplicates based on place_id or name+location
    const uniqueResults = this.deduplicateResults(allResults);
    return uniqueResults.slice(0, config.maxResults);
  }

  /**
   * Query OpenStreetMap Overpass API for nearby POIs
   */
  private async queryOpenStreetMap(
    location: LocationData,
    config: POIDiscoveryConfig
  ): Promise<ExternalPOIResult[]> {
    const radiusKm = config.radiusMeters / 1000;

    // Overpass API query for various POI types
    const query = `
      [out:json][timeout:25];
      (
        node["tourism"](around:${config.radiusMeters},${location.latitude},${location.longitude});
        node["amenity"](around:${config.radiusMeters},${location.latitude},${location.longitude});
        node["historic"](around:${config.radiusMeters},${location.latitude},${location.longitude});
        node["leisure"](around:${config.radiusMeters},${location.latitude},${location.longitude});
        node["natural"](around:${config.radiusMeters},${location.latitude},${location.longitude});
        way["tourism"](around:${config.radiusMeters},${location.latitude},${location.longitude});
        way["amenity"](around:${config.radiusMeters},${location.latitude},${location.longitude});
        way["historic"](around:${config.radiusMeters},${location.latitude},${location.longitude});
        way["leisure"](around:${config.radiusMeters},${location.latitude},${location.longitude});
        way["natural"](around:${config.radiusMeters},${location.latitude},${location.longitude});
      );
      out center meta;
    `;

    try {
      const data = await this.overpassClient.query(query);

      return (data.elements || [])
        .filter((element: any) => element.tags && element.tags.name)
        .slice(0, config.maxResults)
        .map((element: any) => ({
          id: `osm_${element.type}_${element.id}`,
          name: element.tags.name,
          types: this.extractOSMTypes(element.tags),
          location: {
            lat: element.lat || element.center?.lat || location.latitude,
            lng: element.lon || element.center?.lon || location.longitude,
          },
          vicinity: this.buildOSMVicinity(element.tags),
        }));
    } catch (error) {
      console.error("OpenStreetMap query failed:", error);
      return [];
    }
  }

  /**
   * Extract POI types from OpenStreetMap tags
   */
  private extractOSMTypes(tags: Record<string, string>): string[] {
    const types: string[] = [];

    // Map OSM tags to our internal types
    const tagMappings: Record<string, string[]> = {
      tourism: ["tourist_attraction", "museum", "monument"],
      amenity: ["restaurant", "cafe", "hospital", "school", "library"],
      historic: ["monument", "archaeological_site", "castle"],
      leisure: ["park", "stadium", "golf_course"],
      natural: ["peak", "water", "forest"],
    };

    for (const [key, value] of Object.entries(tags)) {
      if (tagMappings[key]) {
        types.push(...tagMappings[key]);
      }
      if (key === "amenity" || key === "tourism" || key === "historic") {
        types.push(value);
      }
    }

    return types.length > 0 ? types : ["point_of_interest"];
  }

  /**
   * Build vicinity description from OSM tags
   */
  private buildOSMVicinity(tags: Record<string, string>): string {
    const parts: string[] = [];

    if (tags["addr:city"]) parts.push(tags["addr:city"]);
    if (tags["addr:state"]) parts.push(tags["addr:state"]);
    if (tags["addr:country"]) parts.push(tags["addr:country"]);

    return parts.join(", ") || "Unknown location";
  }

  /**
   * Remove duplicate POI results
   */
  private deduplicateResults(
    results: ExternalPOIResult[]
  ): ExternalPOIResult[] {
    const seen = new Set<string>();
    return results.filter((result) => {
      const key =
        result.place_id ||
        `${result.name}_${result.location.lat}_${result.location.lng}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * Categorize external POI results into our POI taxonomy
   */
  private categorizePOIs(
    externalResults: ExternalPOIResult[],
    userLocation: LocationData
  ): PointOfInterest[] {
    return externalResults.map((result) => {
      const category = this.mapToInternalCategory(result.types);
      const significance = this.calculateSignificance(result);
      const significanceScore = this.calculateSignificanceScore(
        result,
        category,
        userLocation
      );

      return {
        id: result.id,
        name: result.name,
        category,
        location: {
          latitude: result.location.lat,
          longitude: result.location.lng,
        },
        description: this.generateDescription(result),
        metadata: {
          significance: significance,
          significanceScore: significanceScore,
        },
      };
    });
  }

  /**
   * Map external API types to our internal POI categories
   */
  private mapToInternalCategory(types: string[]): POICategory {
    // Priority mapping - more specific categories first
    const categoryMappings: Record<string, POICategory> = {
      // Highways and roads (highest priority)
      highway: POICategory.MAJOR_ROAD,
      motorway: POICategory.MAJOR_ROAD,
      interstate: POICategory.MAJOR_ROAD,
      trunk: POICategory.MAJOR_ROAD,
      us_highway: POICategory.MAJOR_ROAD,
      state_highway: POICategory.MAJOR_ROAD,
      primary: POICategory.MAJOR_ROAD,
      major_road: POICategory.MAJOR_ROAD,

      // Geographic features and municipalities
      locality: POICategory.TOWN,
      municipality: POICategory.TOWN,
      city: POICategory.TOWN,
      town: POICategory.TOWN,
      village: POICategory.TOWN,
      administrative_area_level_2: POICategory.COUNTY,
      county: POICategory.COUNTY,
      administrative_area_level_1: POICategory.COUNTY, // States get county treatment for now
      state: POICategory.COUNTY,
      neighborhood: POICategory.NEIGHBORHOOD,
      natural_feature: POICategory.WATERWAY,
      mountain: POICategory.MOUNTAIN,
      peak: POICategory.MOUNTAIN,
      valley: POICategory.VALLEY,

      // Infrastructure
      route: POICategory.MAJOR_ROAD,
      bridge: POICategory.BRIDGE,
      landmark: POICategory.LANDMARK,
      airport: POICategory.AIRPORT,
      train_station: POICategory.TRAIN_STATION,
      gas_station: POICategory.REST_STOP,

      // Institutions
      university: POICategory.INSTITUTION,
      school: POICategory.INSTITUTION,
      museum: POICategory.MUSEUM,
      library: POICategory.LIBRARY,
      cultural_center: POICategory.CULTURAL_CENTER,

      // Natural areas
      park: POICategory.PARK,
      national_park: POICategory.PARK,
      forest: POICategory.PARK,

      // Cultural sites
      theater: POICategory.THEATER,
      movie_theater: POICategory.THEATER,
      art_gallery: POICategory.ART_INSTALLATION,

      // Religious sites
      church: POICategory.CHURCH,
      mosque: POICategory.RELIGIOUS_SITE,
      synagogue: POICategory.RELIGIOUS_SITE,
      temple: POICategory.TEMPLE,
      place_of_worship: POICategory.RELIGIOUS_SITE,

      // Recreation
      stadium: POICategory.STADIUM,
      golf_course: POICategory.GOLF_COURSE,
      amusement_park: POICategory.STADIUM,

      // Historical
      monument: POICategory.MEMORIAL,
      historic: POICategory.MEMORIAL,
      archaeological_site: POICategory.MEMORIAL,
      castle: POICategory.FORT,
      cemetery: POICategory.MEMORIAL,

      // Default fallback
      tourist_attraction: POICategory.LANDMARK,
      point_of_interest: POICategory.LANDMARK,
    };

    // Find the most specific category match
    for (const type of types) {
      const category = categoryMappings[type.toLowerCase()];
      if (category) {
        return category;
      }
    }

    // Fallback to landmark for unrecognized types
    return POICategory.LANDMARK;
  }

  /**
   * Calculate significance score for a POI based on road trip relevance
   * Score ranges from 0-100, with higher scores indicating greater significance
   */
  private calculateSignificanceScore(
    result: ExternalPOIResult,
    category: POICategory,
    userLocation: LocationData
  ): number {
    let score = 0;

    // Base score by category (road trip visibility and importance)
    const categoryScores: Record<POICategory, number> = {
      // Highest priority - visible from highways, on signage
      [POICategory.MAJOR_ROAD]: 95, // Highways are the most important context
      [POICategory.TOWN]: 90, // Keep municipalities high - most important context
      [POICategory.COUNTY]: 70, // Reduced from 85 - less important than nearby highways
      [POICategory.AIRPORT]: 85,
      [POICategory.BRIDGE]: 75,
      [POICategory.MOUNTAIN]: 75,
      [POICategory.WATERWAY]: 70,

      // High priority - major landmarks and infrastructure
      [POICategory.TRAIN_STATION]: 70,
      [POICategory.STADIUM]: 65,
      [POICategory.INSTITUTION]: 60,
      [POICategory.PARK]: 60,
      [POICategory.SCENIC_OVERLOOK]: 80,
      [POICategory.MEMORIAL]: 65,
      [POICategory.FORT]: 60,

      // Medium priority - notable but less visible
      [POICategory.MUSEUM]: 55,
      [POICategory.LIBRARY]: 40,
      [POICategory.CHURCH]: 50,
      [POICategory.TEMPLE]: 50,
      [POICategory.RELIGIOUS_SITE]: 45,
      [POICategory.THEATER]: 45,
      [POICategory.CULTURAL_CENTER]: 45,

      // Geographic features - varies by size/prominence
      [POICategory.VALLEY]: 55,
      [POICategory.PLATEAU]: 50,
      [POICategory.NEIGHBORHOOD]: 35,

      // Infrastructure - moderate visibility
      [POICategory.REST_STOP]: 40,
      [POICategory.LANDMARK]: 50,

      // Lower priority - less visible from roads
      [POICategory.WILDLIFE_REFUGE]: 45,
      [POICategory.MUSIC_VENUE]: 35,
      [POICategory.ART_INSTALLATION]: 30,
      [POICategory.MONASTERY]: 40,
      [POICategory.PILGRIMAGE_SITE]: 45,

      // Industrial/Agricultural - lower road trip interest
      [POICategory.FACTORY]: 25,
      [POICategory.MILL]: 30,
      [POICategory.MINING_SITE]: 35,
      [POICategory.AGRICULTURAL_FACILITY]: 20,
      [POICategory.FARM]: 25,
      [POICategory.VINEYARD]: 40,
      [POICategory.ORCHARD]: 30,
      [POICategory.FARMERS_MARKET]: 35,

      // Recreation - moderate interest
      [POICategory.RACE_TRACK]: 50,
      [POICategory.GOLF_COURSE]: 30,
      [POICategory.SKI_RESORT]: 55,

      // Military/Historical - varies by prominence
      [POICategory.MILITARY_BASE]: 45,
      [POICategory.BATTLEFIELD]: 60,

      // Transportation heritage - moderate interest
      [POICategory.HISTORIC_ROUTE]: 65,
      [POICategory.CANAL]: 50,
      [POICategory.RAILROAD_HERITAGE]: 55,

      // Geological - high interest if accessible
      [POICategory.CAVE]: 60,
      [POICategory.ROCK_FORMATION]: 65,
      [POICategory.MINERAL_SITE]: 40,
      [POICategory.FAULT_LINE]: 35,
    };

    score = categoryScores[category] || 30; // Default score

    // Boost score based on external rating
    if (result.rating) {
      if (result.rating >= 4.5) score += 15;
      else if (result.rating >= 4.0) score += 10;
      else if (result.rating >= 3.5) score += 5;
      else if (result.rating < 3.0) score -= 5;
    }

    // Boost for tourist attractions and monuments
    const highVisibilityTypes = [
      "tourist_attraction",
      "monument",
      "landmark",
      "scenic_overlook",
      "national_park",
      "state_park",
      "historic",
      "castle",
    ];

    for (const type of result.types) {
      if (highVisibilityTypes.includes(type.toLowerCase())) {
        score += 10;
        break;
      }
    }

    // Proximity-based boost for highways and roads
    const highwayTypes = [
      "highway",
      "motorway",
      "interstate",
      "trunk",
      "us_highway",
      "state_highway",
      "major_road",
    ];

    for (const type of result.types) {
      if (highwayTypes.includes(type.toLowerCase())) {
        // Use geometric distance if available (from point-to-line calculation)
        // Otherwise fall back to point-to-point distance
        let distanceToHighway: number;

        if (
          result.metadata &&
          typeof result.metadata.geometricDistance === "number"
        ) {
          // Use the accurate point-to-line distance calculated from highway geometry
          distanceToHighway = result.metadata.geometricDistance;
        } else {
          // Fallback to point-to-point distance (legacy behavior)
          distanceToHighway = this.calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            result.location.lat,
            result.location.lng
          );
        }

        // Proximity-based scoring for highways using geometric distance
        if (distanceToHighway <= 50) {
          // User is on the highway (within 50m - accounting for GPS accuracy)
          score += 15; // Maximum boost - this is the highway you're on! (Total ~110)
        } else if (distanceToHighway <= 100) {
          // User is very close to the highway (within 100m)
          score += 10; // High boost - very close to highway (Total ~105)
        } else if (distanceToHighway <= 500) {
          // User is near the highway (within 500m)
          score += 5; // Moderate boost - nearby highway (Total ~100)
        } else if (distanceToHighway <= 2000) {
          // User can see the highway (within 2km)
          score -= 15; // Moderate reduction - visible but distant (Total ~80)
        } else {
          // Highway is distant - treat like other highly visible POI
          score -= 35; // Significant reduction - treat like landmark (Total ~60)
        }
        break;
      }
    }

    // Major boost for municipalities (very important context)
    const municipalityTypes = [
      "locality",
      "municipality",
      "city",
      "town",
      "village",
    ];
    const countyTypes = [
      "county",
      "administrative_area_level_2",
      "administrative_area_level_1",
    ];

    for (const type of result.types) {
      if (municipalityTypes.includes(type.toLowerCase())) {
        score += 15; // Major boost for municipalities (towns/cities)
        break;
      } else if (countyTypes.includes(type.toLowerCase())) {
        score += 10; // Moderate boost for counties/states (less than municipalities)
        break;
      }
    }

    // Boost for places likely to be on highway signs
    const signageTypes = [
      "airport",
      "university",
      "hospital",
      "stadium",
      "downtown",
      "city_hall",
      "courthouse",
      "convention_center",
    ];

    for (const type of result.types) {
      if (signageTypes.includes(type.toLowerCase())) {
        score += 8;
        break;
      }
    }

    // Penalize very local/small establishments
    const localTypes = [
      "restaurant",
      "cafe",
      "store",
      "shop",
      "gas_station",
      "convenience_store",
      "pharmacy",
      "bank",
    ];

    for (const type of result.types) {
      if (localTypes.includes(type.toLowerCase())) {
        score -= 10;
        break;
      }
    }

    // Ensure score stays within bounds
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate significance descriptors for a POI (legacy method)
   */
  private calculateSignificance(result: ExternalPOIResult): string[] {
    const significance: string[] = [];

    // Base significance on rating and type
    if (result.rating && result.rating >= 4.0) {
      significance.push("highly_rated");
    }

    // Add significance based on POI type
    const significantTypes = [
      "museum",
      "university",
      "hospital",
      "airport",
      "train_station",
      "tourist_attraction",
      "monument",
      "park",
      "stadium",
      "church",
    ];

    for (const type of result.types) {
      if (significantTypes.includes(type.toLowerCase())) {
        significance.push("notable_landmark");
        break;
      }
    }

    // Default significance
    if (significance.length === 0) {
      significance.push("local_interest");
    }

    return significance;
  }

  /**
   * Generate a description for a POI based on external data
   */
  private generateDescription(result: ExternalPOIResult): string {
    const parts: string[] = [];

    // Add type information
    if (result.types.length > 0) {
      const primaryType = result.types[0].replace(/_/g, " ");
      parts.push(`A ${primaryType}`);
    }

    // Add location context
    if (result.vicinity) {
      parts.push(`located in ${result.vicinity}`);
    }

    // Add rating if available
    if (result.rating) {
      parts.push(`with a ${result.rating}/5 rating`);
    }

    return (
      parts.join(" ") || `${result.name} is a point of interest in the area.`
    );
  }

  /**
   * Generate mock POIs for development and testing
   */
  private getMockPOIs(
    location: LocationData,
    maxResults?: number
  ): PointOfInterest[] {
    const allMockPOIs: PointOfInterest[] = [
      {
        id: "mock_town_1",
        name: "Historic Downtown",
        category: POICategory.TOWN,
        location: {
          latitude: location.latitude + 0.01,
          longitude: location.longitude + 0.01,
        },
        description:
          "A charming historic downtown area with 19th-century architecture",
        metadata: {
          foundedYear: 1850,
          population: 15000,
          significance: ["historical", "architectural"],
          significanceScore: 90, // High score for towns
        },
      },
      {
        id: "mock_park_1",
        name: "Riverside Park",
        category: POICategory.PARK,
        location: {
          latitude: location.latitude - 0.005,
          longitude: location.longitude + 0.008,
        },
        description:
          "A scenic park along the river with walking trails and picnic areas",
        metadata: {
          elevation: 150,
          significance: ["recreational", "natural"],
          significanceScore: 60, // Medium score for parks
        },
      },
      {
        id: "mock_museum_1",
        name: "Local History Museum",
        category: POICategory.MUSEUM,
        location: {
          latitude: location.latitude + 0.003,
          longitude: location.longitude - 0.007,
        },
        description:
          "Museum showcasing the rich history and culture of the region",
        metadata: {
          foundedYear: 1925,
          significance: ["cultural", "educational"],
          significanceScore: 55, // Medium score for museums
        },
      },
      {
        id: "mock_church_1",
        name: "St. Mary's Cathedral",
        category: POICategory.CHURCH,
        location: {
          latitude: location.latitude + 0.002,
          longitude: location.longitude + 0.004,
        },
        description: "A beautiful Gothic cathedral built in the early 1900s",
        metadata: {
          foundedYear: 1905,
          significance: ["religious", "architectural"],
          significanceScore: 50, // Medium score for churches
        },
      },
      {
        id: "mock_bridge_1",
        name: "Memorial Bridge",
        category: POICategory.BRIDGE,
        location: {
          latitude: location.latitude - 0.003,
          longitude: location.longitude - 0.002,
        },
        description:
          "A historic bridge spanning the local river, built to honor veterans",
        metadata: {
          foundedYear: 1945,
          significance: ["historical", "memorial"],
          significanceScore: 75, // High score for bridges
        },
      },
      {
        id: "mock_highway_1",
        name: "Interstate 95",
        category: POICategory.MAJOR_ROAD,
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
        },
        description:
          "Major interstate highway running north-south along the East Coast",
        metadata: {
          significance: ["transportation", "infrastructure"],
          significanceScore: 100, // Maximum score - user is on the highway
        },
      },
      {
        id: "mock_municipality_1",
        name: "Springfield",
        category: POICategory.TOWN,
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
        },
        description: "Municipality in the local area",
        metadata: {
          population: 25000,
          significance: ["administrative", "municipal"],
          significanceScore: 90, // Very high score for municipalities
        },
      },
    ];

    // Respect maxResults parameter
    if (maxResults && maxResults > 0) {
      return allMockPOIs.slice(0, maxResults);
    }

    return allMockPOIs;
  }

  /**
   * Filter POIs by distance from a location
   */
  filterByDistance(
    pois: PointOfInterest[],
    centerLocation: LocationData,
    maxDistanceMeters: number
  ): PointOfInterest[] {
    return pois.filter((poi) => {
      const distance = this.calculateDistance(
        centerLocation.latitude,
        centerLocation.longitude,
        poi.location.latitude,
        poi.location.longitude
      );
      return distance <= maxDistanceMeters;
    });
  }

  /**
   * Sort POIs by significance score in descending order
   */
  sortBySignificance(pois: PointOfInterest[]): PointOfInterest[] {
    return [...pois].sort((a, b) => {
      const scoreA = a.metadata.significanceScore || 0;
      const scoreB = b.metadata.significanceScore || 0;
      return scoreB - scoreA; // Descending order (highest first)
    });
  }

  /**
   * Calculate distance between two points using Haversine formula
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Convert degrees to radians
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Calculate the shortest distance from a point to a line segment (highway geometry)
   * This is the core implementation of Method 2 from highway-detection-methods.md
   */
  private calculateDistanceToLineSegment(
    point: [number, number], // [lat, lng]
    lineCoordinates: Array<{ lat: number; lon: number }>
  ): number {
    if (!lineCoordinates || lineCoordinates.length < 2) {
      return Infinity; // No valid geometry
    }

    let minDistance = Infinity;

    // Check distance to each line segment in the highway geometry
    for (let i = 0; i < lineCoordinates.length - 1; i++) {
      const segmentStart: [number, number] = [
        lineCoordinates[i].lat,
        lineCoordinates[i].lon,
      ];
      const segmentEnd: [number, number] = [
        lineCoordinates[i + 1].lat,
        lineCoordinates[i + 1].lon,
      ];

      const distanceToSegment = this.pointToLineSegmentDistance(
        point,
        segmentStart,
        segmentEnd
      );
      minDistance = Math.min(minDistance, distanceToSegment);
    }

    return minDistance;
  }

  /**
   * Calculate the shortest distance from a point to a line segment
   * Uses proper geometric calculations for accurate highway detection
   */
  private pointToLineSegmentDistance(
    point: [number, number], // [lat, lng]
    segmentStart: [number, number], // [lat, lng]
    segmentEnd: [number, number] // [lat, lng]
  ): number {
    const [px, py] = point;
    const [ax, ay] = segmentStart;
    const [bx, by] = segmentEnd;

    // Vector from A to B
    const ABx = bx - ax;
    const ABy = by - ay;

    // Vector from A to P
    const APx = px - ax;
    const APy = py - ay;

    // Calculate the dot product of AP and AB
    const AB_AB = ABx * ABx + ABy * ABy;
    const AP_AB = APx * ABx + APy * ABy;

    // Handle degenerate case where segment has zero length
    if (AB_AB === 0) {
      return this.calculateDistance(px, py, ax, ay);
    }

    // Calculate the parameter t for the closest point on the line segment
    const t = Math.max(0, Math.min(1, AP_AB / AB_AB));

    // Calculate the closest point on the line segment
    const closestX = ax + t * ABx;
    const closestY = ay + t * ABy;

    // Return the distance from the point to the closest point on the segment
    return this.calculateDistance(px, py, closestX, closestY);
  }

  /**
   * Calculate the center point of a highway geometry
   * Used for display purposes when we have full geometry
   */
  private calculateGeometryCenter(
    geometry: Array<{ lat: number; lon: number }>
  ): { lat: number; lng: number } {
    if (!geometry || geometry.length === 0) {
      return { lat: 0, lng: 0 };
    }

    if (geometry.length === 1) {
      return { lat: geometry[0].lat, lng: geometry[0].lon };
    }

    // Calculate the center point of the geometry
    const totalLat = geometry.reduce((sum, point) => sum + point.lat, 0);
    const totalLng = geometry.reduce((sum, point) => sum + point.lon, 0);

    return {
      lat: totalLat / geometry.length,
      lng: totalLng / geometry.length,
    };
  }
}
