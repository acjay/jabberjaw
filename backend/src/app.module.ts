import { Module } from '@danet/core';
import { AppController } from './app.controller.ts';
import { AppService } from './app.service.ts';

@Module({
  controllers: [AppController],
  injectables: [AppService],
})
export class AppModule {}