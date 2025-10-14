import { Injectable } from "@danet/core";

/**
 * Client for OpenStreetMap Overpass API
 */
@Injectable()
export class OverpassClient {
  private readonly baseUrl = "https://overpass-api.de/api/interpreter";

  /**
   * Execute an Overpass query
   */
  async query(overpassQuery: string): Promise<any> {
    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `data=${encodeURIComponent(overpassQuery)}`,
    });

    if (!response.ok) {
      throw new Error(
        `Overpass API error: ${response.status} ${response.statusText}`
      );
    }

    return await response.json();
  }
}
