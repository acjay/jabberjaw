import { Injectable } from "@danet/core";

/**
 * Client for Google Maps APIs (Places, Geocoding, Roads)
 */
@Injectable()
export class GoogleMapsClient {
  /**
   * Make a request to Google Places API
   */
  async placesNearbySearch(params: {
    location: string;
    radius: string;
    type?: string;
    key: string;
  }): Promise<any> {
    const url = new URL(
      "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
    );
    Object.entries(params).forEach(([key, value]) => {
      if (value) url.searchParams.set(key, value);
    });

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(
        `Google Places API error: ${response.status} ${response.statusText}`
      );
    }

    return await response.json();
  }

  /**
   * Make a request to Google Geocoding API
   */
  async geocode(params: {
    latlng?: string;
    address?: string;
    key: string;
  }): Promise<any> {
    const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
    Object.entries(params).forEach(([key, value]) => {
      if (value) url.searchParams.set(key, value);
    });

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(
        `Google Geocoding API error: ${response.status} ${response.statusText}`
      );
    }

    return await response.json();
  }

  /**
   * Make a request to Google Roads API - Snap to Roads
   */
  async snapToRoads(params: {
    path: string;
    interpolate?: string;
    key: string;
  }): Promise<any> {
    const url = new URL("https://roads.googleapis.com/v1/snapToRoads");
    Object.entries(params).forEach(([key, value]) => {
      if (value) url.searchParams.set(key, value);
    });

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(
        `Google Roads API error: ${response.status} ${response.statusText}`
      );
    }

    return await response.json();
  }

  /**
   * Make a request to Google Roads API - Nearest Roads
   */
  async nearestRoads(params: { points: string; key: string }): Promise<any> {
    const url = new URL("https://roads.googleapis.com/v1/nearestRoads");
    Object.entries(params).forEach(([key, value]) => {
      if (value) url.searchParams.set(key, value);
    });

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(
        `Google Roads API error: ${response.status} ${response.statusText}`
      );
    }

    return await response.json();
  }

  /**
   * Make a request to Google Roads API - Speed Limits
   */
  async speedLimits(params: { path: string; key: string }): Promise<any> {
    const url = new URL("https://roads.googleapis.com/v1/speedLimits");
    Object.entries(params).forEach(([key, value]) => {
      if (value) url.searchParams.set(key, value);
    });

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(
        `Google Roads API error: ${response.status} ${response.statusText}`
      );
    }

    return await response.json();
  }

  /**
   * Make a request to Google Places API - Place Details
   */
  async placeDetails(params: {
    place_id: string;
    fields?: string;
    key: string;
  }): Promise<any> {
    const url = new URL(
      "https://maps.googleapis.com/maps/api/place/details/json"
    );
    Object.entries(params).forEach(([key, value]) => {
      if (value) url.searchParams.set(key, value);
    });

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(
        `Google Places API error: ${response.status} ${response.statusText}`
      );
    }

    return await response.json();
  }
}
