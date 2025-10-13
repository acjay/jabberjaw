import { Injectable } from "@danet/core";
import { FetchHttpClient } from "../fetch-http-client.ts";

/**
 * Client for Nominatim (OpenStreetMap) geocoding API
 */
@Injectable()
export class NominatimClient {
  private readonly baseUrl = "https://nominatim.openstreetmap.org";
  private readonly userAgent = "RoadTripNarrator/1.0";

  constructor(private readonly httpClient: FetchHttpClient) {}

  /**
   * Reverse geocoding - get address from coordinates
   */
  async reverse(params: {
    lat: number;
    lon: number;
    format?: string;
    addressdetails?: string;
  }): Promise<any> {
    const url = new URL(`${this.baseUrl}/reverse`);

    // Set default parameters
    const queryParams = {
      format: "json",
      addressdetails: "1",
      ...params,
      lat: params.lat.toString(),
      lon: params.lon.toString(),
    };

    Object.entries(queryParams).forEach(([key, value]) => {
      if (value) url.searchParams.set(key, value);
    });

    const response = await this.httpClient.get(url.toString(), {
      headers: {
        "User-Agent": this.userAgent,
      },
    });

    if (!response.ok) {
      throw new Error(
        `Nominatim API error: ${response.status} ${response.statusText}`
      );
    }

    return await response.json();
  }

  /**
   * Forward geocoding - get coordinates from address
   */
  async search(params: {
    q?: string;
    street?: string;
    city?: string;
    county?: string;
    state?: string;
    country?: string;
    postalcode?: string;
    format?: string;
    addressdetails?: string;
    limit?: string;
  }): Promise<any> {
    const url = new URL(`${this.baseUrl}/search`);

    // Set default parameters
    const queryParams = {
      format: "json",
      addressdetails: "1",
      limit: "1",
      ...params,
    };

    Object.entries(queryParams).forEach(([key, value]) => {
      if (value) url.searchParams.set(key, value);
    });

    const response = await this.httpClient.get(url.toString(), {
      headers: {
        "User-Agent": this.userAgent,
      },
    });

    if (!response.ok) {
      throw new Error(
        `Nominatim API error: ${response.status} ${response.statusText}`
      );
    }

    return await response.json();
  }
}
