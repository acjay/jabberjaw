import { Module } from "@danet/core";
import { ConfigurationService } from "./configuration.service.ts";

@Module({
  injectables: [ConfigurationService],
})
export class ConfigurationModule {}
