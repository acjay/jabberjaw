# Jabberjaw Product Overview

Jabberjaw is a location-aware mobile application that generates podcast-style narration about points of interest during road trips. The system uses AI to create engaging travel content based on geographic locations and POI data.

## Core Features

- **AI-Powered Content Generation**: Creates travel narratives using LLM services (OpenAI GPT models)
- **Location Processing**: Identifies and processes points of interest along travel routes
- **Content Caching**: Intelligent caching system to avoid duplicate content generation
- **Multiple Content Styles**: Historical, cultural, geographical, and mixed narrative styles
- **Mobile Integration**: Backend API designed for mobile app consumption

## Architecture Components

- **Backend Service**: Deno-based API for content generation and journey coordination
- **Content Generation**: LLM integration with fallback to mock services
- **POI Discovery**: Location processing and highway detection services
- **Journey Module**: Coordinates location processing and content generation workflows
- **Mobile App**: Android application (planned implementation)

## Target Use Case

Travelers on road trips who want engaging, educational content about locations they're passing through, delivered in a podcast-style format that enhances their journey experience.

## Glossary

### Point of Interest

A place that can serve as the subject for narration.

### Story

The complete narrative content generated for a specific topic and location context. A Story represents the full podcast-style narration that users will hear during their journey.

### Story Title

The LLM-generated short title for a story summary that creates collision potential for interchangeable stories. Story Titles are designed to be descriptive enough that similar stories about the same topic would likely receive the same or very similar titles, enabling efficient deduplication.

### Story Summary

A paragraph-long summary that can be elaborated into a full Story. Story Summaries are generated first in the two-phase content creation process and serve as the foundation for expanding into complete narratives.

### Story Seed

The natural key combining request inputs and the Story Title that uniquely identifies a Story. The Story Seed consists of location context, subject matter, content style preferences, and the LLM-generated Story Title, forming the basis for story generation and retrieval.

### Story ID

The surrogate key that uniquely identifies a story in the system. Story IDs are used for tracking user playback history, caching generated content, and managing the relationship between Story Seeds and their corresponding full Stories.
