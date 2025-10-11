import { Module } from '@danet/core';
import { ContentGenerationController } from './content-generation.controller.ts';
import {
  ContentGenerationService,
  ContentStorageService,
  MockLLMService,
  OpenAILLMService,
} from './services/index.ts';

@Module({
  controllers: [ContentGenerationController],
  injectables: [
    ContentGenerationService,
    ContentStorageService,
    MockLLMService,
    OpenAILLMService,
  ],
})
export class ContentGenerationModule {}
