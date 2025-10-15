#!/usr/bin/env -S deno run --allow-env --allow-net

import { MockLLMService } from "../src/story/services/llm.service.ts";
import { OpenAILLMService } from "../src/story/services/openai-llm.service.ts";
import { OpenAIClient } from "../src/shared/clients/openai-client.ts";
import { ConfigurationService } from "../src/configuration/configuration.service.ts";

// Test the mock service
console.log("Testing Mock LLM Service...");
const mockService = new MockLLMService();
const mockResult = await mockService.generateStorySeedsForPOI(
  "Historic courthouse in downtown Springfield"
);

console.log("Mock service result:");
console.log(`- Found ${mockResult.seeds.length} story seeds`);
console.log(`- Sources: ${mockResult.sources?.join(", ")}`);
for (const seed of mockResult.seeds) {
  console.log(`  * ${seed.title}: ${seed.summary.substring(0, 100)}...`);
}

// Test the OpenAI service (if configured)
console.log("\nTesting OpenAI LLM Service...");
const configService = new ConfigurationService();
const openaiClient = new OpenAIClient();
const openaiService = new OpenAILLMService(openaiClient, configService);

try {
  const openaiResult = await openaiService.generateStorySeedsForPOI(
    "Metuchen Borough in Middlesex County, New Jersey, United States"
  );

  console.log("OpenAI service result:");
  console.log(`- Found ${openaiResult.seeds.length} story seeds`);
  console.log(`- Sources: ${openaiResult.sources?.join(", ")}`);
  for (const seed of openaiResult.seeds) {
    console.log(`  * ${seed.title}: ${seed.summary.substring(0, 100)}...`);
  }
} catch (error) {
  console.log(
    `OpenAI service error (expected if API key not configured): ${error.message}`
  );
}

console.log("\nStory seeds generation test completed!");
