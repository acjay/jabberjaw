#!/usr/bin/env -S deno run --allow-read --allow-env

import {
  FullStorySchema,
  type FullStory,
} from "./src/shared/schemas/content.schema.ts";

// Test that FullStorySchema works correctly
const testStory: FullStory = {
  storyId: "test-story-123",
  content: "This is a test story about a fascinating location.",
  duration: 180,
  status: "ready",
  location: {
    latitude: 37.7749,
    longitude: -122.4194,
  },
  generatedAt: new Date(),
  storyTitle: "Test Story Title",
  storySummary: "A brief summary of the test story.",
};

// Validate the test story against the schema
try {
  const validatedStory = FullStorySchema.parse(testStory);
  console.log("✅ FullStorySchema validation successful!");
  console.log("Story ID:", validatedStory.storyId);
  console.log("Story Title:", validatedStory.storyTitle);
  console.log("Duration:", validatedStory.duration, "seconds");
} catch (error) {
  console.error("❌ FullStorySchema validation failed:", error);
  Deno.exit(1);
}

console.log("🎉 Schema consolidation test passed!");
