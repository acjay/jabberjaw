#!/usr/bin/env -S deno run --allow-net --allow-read --allow-env --no-check

import { OpenAILLMService } from "../src/story/services/openai-llm.service.ts";
import { MockLLMService } from "../src/story/services/llm.service.ts";
import { OpenAIClient } from "../src/shared/clients/openai-client.ts";
import { ConfigurationService } from "../src/configuration/index.ts";

/**
 * Demo script showing 2-phase story creation for Outerbridge Crossing
 * Phase 1: Generate story seeds (titles and summaries)
 * Phase 2: Generate full story content from a selected seed
 */
async function demoStoryCreation() {
  console.log("🌉 Outerbridge Crossing Story Creation Demo");
  console.log("=".repeat(50));

  // Create the Outerbridge Crossing POI
  const outerbridgeCrossing = {
    type: "StructuredPOI" as const,
    name: "Outerbridge Crossing",
    poiType: "bridge",
    location: {
      latitude: 40.5089,
      longitude: -74.2581,
    },
    description:
      "A cantilever bridge spanning the Arthur Kill between Staten Island, New York and Perth Amboy, New Jersey. Opened in 1928 and named after Eugenius Harvey Outerbridge.",
    locationDescription: "Staten Island, NY / Perth Amboy, NJ",
    category: "transportation",
    significance: 0.8,
    tags: ["bridge", "transportation", "historic", "engineering"],
  };

  // Set up LLM service - try OpenAI first, fallback to mock
  let llmService;
  let usingOpenAI = false;

  try {
    // Try to set up OpenAI service
    const configService = new ConfigurationService();
    const openaiClient = new OpenAIClient();
    const openaiService = new OpenAILLMService(openaiClient, configService);

    // Test if OpenAI is configured by trying to get the API key
    await configService.getOpenAIApiKey();
    llmService = openaiService;
    usingOpenAI = true;
    console.log("🤖 Using OpenAI LLM Service");
  } catch (error) {
    // Fallback to mock service if OpenAI is not configured
    llmService = new MockLLMService();
    console.log(
      "ℹ️  OpenAI not configured, using MockLLMService for demonstration"
    );
    console.log(
      `   (Set OPENAI_API_KEY environment variable to use real OpenAI)`
    );
  }

  console.log("\n📍 Point of Interest:");
  console.log(`Name: ${outerbridgeCrossing.name}`);
  console.log(`Type: ${outerbridgeCrossing.poiType}`);
  console.log(`Location: ${outerbridgeCrossing.locationDescription}`);
  console.log(`Description: ${outerbridgeCrossing.description}`);

  // Phase 1: Generate Story Seeds
  console.log("\n🌱 Phase 1: Generating Story Seeds...");
  console.log("-".repeat(40));

  try {
    // Create POI description for the LLM
    const poiDescription = `${outerbridgeCrossing.name}, a ${outerbridgeCrossing.poiType} in ${outerbridgeCrossing.locationDescription}. ${outerbridgeCrossing.description}`;

    const storySeeds = await llmService.generateStorySeedsForPOI(
      poiDescription
    );

    console.log(`Generated ${storySeeds.length} story seeds:\n`);

    storySeeds.forEach((seed, index) => {
      console.log(`${index + 1}. ${seed.title}`);
      console.log(`   Summary: ${seed.summary}`);
      console.log("");
    });

    if (storySeeds.length === 0) {
      console.log("❌ No story seeds generated. Exiting.");
      return;
    }

    // Phase 2: Generate Full Story from First Seed
    const selectedSeed = storySeeds[0];
    console.log("📖 Phase 2: Generating Full Story...");
    console.log("-".repeat(40));
    console.log(`Selected seed: "${selectedSeed.title}"`);

    // Create a full story seed object with required fields
    const fullStorySeed = {
      storyId: crypto.randomUUID(),
      title: selectedSeed.title,
      summary: selectedSeed.summary,
      location: outerbridgeCrossing.location,
      createdAt: new Date(),
    };

    const fullStoryRequest = {
      input: outerbridgeCrossing,
      targetDuration: 180, // 3 minutes
      contentStyle: "mixed" as const,
      storySeed: fullStorySeed,
    };

    const fullStoryResponse = await llmService.generateFullStory(
      fullStoryRequest
    );

    console.log("\n✨ Generated Full Story:");
    console.log("=".repeat(50));
    console.log(`Story ID: ${fullStorySeed.storyId}`);
    console.log(`Title: ${selectedSeed.title}`);
    console.log(`Duration: ${fullStoryResponse.estimatedDuration} seconds`);
    console.log("");
    console.log("📝 Summary:");
    console.log(selectedSeed.summary);
    console.log("");
    console.log("📚 Full Story Content:");
    console.log("-".repeat(30));
    console.log(fullStoryResponse.content);
    console.log("-".repeat(30));

    // Show that the story seed was used in generation
    console.log("\n🔍 Story Generation Details:");
    console.log(
      `- Story seed title referenced: ${
        fullStoryResponse.content
          .toLowerCase()
          .includes(selectedSeed.title.toLowerCase())
          ? "✅"
          : "❌"
      }`
    );
    console.log(
      `- Content length: ${fullStoryResponse.content.length} characters`
    );
    console.log(
      `- Word count: ${fullStoryResponse.content.split(" ").length} words`
    );
    console.log(
      `- Estimated reading time: ~${Math.ceil(
        fullStoryResponse.content.split(" ").length / 150
      )} minutes`
    );

    // Demonstrate the 2-phase process
    console.log("\n🔄 2-Phase Process Summary:");
    console.log("Phase 1 ✅ Generated story seeds with titles and summaries");
    console.log("Phase 2 ✅ Expanded selected seed into full story content");
    console.log(
      `Story seed "${selectedSeed.title}" was used to focus the full story generation`
    );

    // Show the prompt that would be generated
    console.log("\n📋 Generated Prompt Preview:");
    const prompt = llmService.generatePrompt(
      outerbridgeCrossing,
      "mixed",
      fullStorySeed
    );
    console.log(prompt.substring(0, 200) + "...");

    // Show which service was used
    console.log(
      `\n🔧 Service Used: ${usingOpenAI ? "OpenAI GPT" : "Mock LLM"}`
    );
    if (usingOpenAI) {
      console.log("   Real AI-generated content with story seed integration!");
    } else {
      console.log(
        "   Set OPENAI_API_KEY environment variable to use real OpenAI"
      );
    }
  } catch (error) {
    console.error("❌ Error during story creation:", error);
  }
}

if (import.meta.main) {
  await demoStoryCreation();
}
