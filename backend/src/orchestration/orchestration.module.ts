import { Module } from '@danet/core';
import { OrchestrationController } from './orchestration.controller.ts';
import { OrchestrationService } from './orchestration.service.ts';
import { POIDiscoveryModule } from '../poi-discovery/poi-discovery.module.ts';

@Module({
  controllers: [OrchestrationController],
  injectables: [OrchestrationService],
  imports: [POIDiscoveryModule],
})
export class OrchestrationModule {}
