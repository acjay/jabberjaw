import { Module } from '@danet/core';
import { POIDiscoveryController } from './poi-discovery.controller.ts';
import { HighwayDetectionController } from './highway-detection.controller.ts';
import { GoogleRoadsController } from './google-roads.controller.ts';
import { POIIdentificationService } from './services/poi-identification.service.ts';
import { GoogleRoadsService } from './services/google-roads.service.ts';
import { HighwayDetectionComparisonService } from './services/highway-detection-comparison.service.ts';

@Module({
  controllers: [POIDiscoveryController, HighwayDetectionController, GoogleRoadsController],
  injectables: [POIIdentificationService, GoogleRoadsService, HighwayDetectionComparisonService],
})
export class POIDiscoveryModule {}
