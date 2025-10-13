import { Module } from "@danet/core";
import { FetchHttpClient } from "./fetch-http-client.ts";
import { OverpassClient } from "./clients/overpass-client.ts";
import { GoogleMapsClient } from "./clients/google-maps-client.ts";
import { NominatimClient } from "./clients/nominatim-client.ts";
import { OpenAIClient } from "./clients/openai-client.ts";

@Module({
  injectables: [
    FetchHttpClient,
    OverpassClient,
    GoogleMapsClient,
    NominatimClient,
    OpenAIClient,
  ],
})
export class SharedModule {}
