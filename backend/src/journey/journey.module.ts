import { Module } from "@danet/core";
import { JourneyController } from "./journey.controller.ts";
import { JourneyService } from "./journey.service.ts";
import { POIDiscoveryModule } from "../poi-discovery/poi-discovery.module.ts";
import { ContentGenerationModule } from "../content-generation/content-generation.module.ts";

@Module({
  controllers: [JourneyController],
  injectables: [JourneyService],
  imports: [POIDiscoveryModule, ContentGenerationModule],
})
export class JourneyModule {}
