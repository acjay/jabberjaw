import { Module } from "@danet/core";
import { JourneyController } from "./journey.controller.ts";
import { JourneyService } from "./journey.service.ts";
import { POIDiscoveryModule } from "../poi-discovery/poi-discovery.module.ts";
import { StoryModule } from "../story/story.module.ts";

@Module({
  controllers: [JourneyController],
  injectables: [JourneyService],
  imports: [POIDiscoveryModule, StoryModule],
})
export class JourneyModule {}
