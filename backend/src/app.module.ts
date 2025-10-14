import { Module } from "@danet/core";
import { AppController } from "./app.controller.ts";
import { AppService } from "./app.service.ts";
import { StoryModule } from "./story/index.ts";
import { JourneyModule } from "./journey/index.ts";
import { POIDiscoveryModule } from "./poi-discovery/poi-discovery.module.ts";
import { SharedModule } from "./shared/shared.module.ts";

@Module({
  imports: [SharedModule, StoryModule, JourneyModule, POIDiscoveryModule],
  controllers: [AppController],
  injectables: [AppService],
})
export class AppModule {}
