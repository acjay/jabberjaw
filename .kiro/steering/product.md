# Jabberjaw Product Overview

Jabberjaw is a location-aware mobile application that generates podcast-style narration about points of interest during road trips. The system uses AI to create engaging travel content based on geographic locations and POI data.

## Core Features

- **AI-Powered Content Generation**: Creates travel narratives using LLM services (OpenAI GPT models)
- **Location Processing**: Identifies and processes points of interest along travel routes
- **Content Caching**: Intelligent caching system to avoid duplicate content generation
- **Multiple Content Styles**: Historical, cultural, geographical, and mixed narrative styles
- **Mobile Integration**: Backend API designed for mobile app consumption

## Architecture Components

- **Backend Service**: Deno-based API for content generation and orchestration
- **Content Generation**: LLM integration with fallback to mock services
- **POI Discovery**: Location processing and highway detection services
- **Orchestration**: Coordinates location processing and content generation workflows
- **Mobile App**: Android application (planned implementation)

## Target Use Case

Travelers on road trips who want engaging, educational content about locations they're passing through, delivered in a podcast-style format that enhances their journey experience.
