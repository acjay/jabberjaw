import { Module } from '@danet/core';
import { AppController } from './app.controller.ts';
import { AppService } from './app.service.ts';
import { ContentGenerationModule } from './content-generation/index.ts';
import { OrchestrationModule } from './orchestration/index.ts';
import { POIDiscoveryModule } from './poi-discovery/poi-discovery.module.ts';

@Module({
  imports: [ContentGenerationModule, OrchestrationModule, POIDiscoveryModule],
  controllers: [AppController],
  injectables: [AppService],
})
export class AppModule {}
