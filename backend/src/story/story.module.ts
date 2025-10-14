import { Module } from "@danet/core";
import { StoryController } from "./story.controller.ts";
import {
  StoryService,
  ContentStorageService,
  MockLLMService,
  OpenAILLMService,
} from "./services/index.ts";
import { SharedModule } from "../shared/shared.module.ts";

@Module({
  imports: [SharedModule],
  controllers: [StoryController],
  injectables: [
    StoryService,
    ContentStorageService,
    MockLLMService,
    OpenAILLMService,
  ],
})
export class StoryModule {}
