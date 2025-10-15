import { Module } from "@danet/core";
import { OverpassClient } from "./clients/overpass-client.ts";
import { GoogleMapsClient } from "./clients/google-maps-client.ts";
import { NominatimClient } from "./clients/nominatim-client.ts";
import { OpenAIClient } from "./clients/openai-client.ts";
import { ConfigurationModule } from "../configuration/index.ts";

@Module({
  imports: [ConfigurationModule],
  injectables: [
    OverpassClient,
    GoogleMapsClient,
    NominatimClient,
    OpenAIClient,
  ],
})
export class SharedModule {}
