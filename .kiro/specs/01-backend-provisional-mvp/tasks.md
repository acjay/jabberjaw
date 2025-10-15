# Implementation Plan

This implementation plan focuses on building a story-based content generation system with a two-phase approach: first generating story seeds (titles and summaries) for location discovery, then expanding selected stories into full narrative content on demand.

- [x] 1. Set up Deno project foundation and core configuration

  - Create deno.json with tasks, dependencies, and TypeScript configuration
  - Set up environment configuration service with .env support
  - Create basic project structure with src/ directory and main.ts entry point
  - Configure Danet application bootstrap with basic health check endpoint
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 2. Implement core data models and validation

  - [x] 2.1 Create location and POI data models

    - Define LocationData interface with latitude, longitude, timestamp, and accuracy
    - Create PointOfInterest interface with id, name, category, location, and source
    - Implement POICategory enum with all supported categories (town, landmark, etc.)
    - Add validation decorators for request/response DTOs
    - _Requirements: 1.1, 1.2_

  - [x] 2.2 Create story generation data models

    - Define StoryInput interface supporting both text and structured POI data
    - Create StorySeed, FullStory, and StoredStory interfaces with metadata
    - Implement request/response DTOs for story generation endpoints
    - Add validation for story generation requests including story seed and expansion operations
    - _Requirements: 2.1, 2.2, 2.3, 7.1, 7.2, 7.3, 8.1, 8.2_

  - [x]\* 2.3 Write unit tests for data models
    - Test data model validation and serialization for story-based models
    - Test POI categorization and location data validation
    - Verify DTO validation rules work correctly for story operations
    - Test story seed and full story model relationships
    - _Requirements: 5.1, 5.2_

- [x] 3. Implement Story Generation Module

  - [x] 3.1 Create LLM service with OpenAI integration

    - Implement LLMService interface with generateStorySeeds and expandStorySeed methods
    - Create OpenAI API client with proper error handling and timeouts
    - Add MockLLMService for testing without API costs
    - Implement prompt engineering for story seed generation and story expansion
    - Configure API key management and model selection
    - _Requirements: 2.1, 2.2, 3.1, 3.2, 7.1, 7.2, 8.1, 8.2_

  - [x] 3.2 Create in-memory story storage service

    - Implement StoryStorageService with Map-based storage for story seeds and full stories
    - Add methods for storing, retrieving, and caching story seeds and expanded stories
    - Implement story deduplication based on story seeds (natural keys)
    - Create cache key generation for story seed lookups
    - Add basic cache cleanup and TTL management for both story seeds and full stories
    - _Requirements: 1.4, 2.4, 7.4, 7.5, 8.3, 8.4, 8.5_

  - [x] 3.3 Implement StoryGenerationService

    - Create service that coordinates LLM and story storage services
    - Implement two-phase story generation workflow: story seeds first, then expansion on demand
    - Add support for both text and structured POI inputs for story seed generation
    - Include prompt storage alongside generated story seeds and full stories
    - Implement estimated duration calculation for full story content
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 7.1, 7.2, 7.3, 8.1, 8.2, 8.3_

  - [x] 3.4 Create Story Generation API endpoints

    - Implement POST /api/story/generate-seeds endpoint for story seed generation
    - Implement POST /api/story/expand/:storyId endpoint for story expansion
    - Implement GET /api/story/:storyId endpoint for story retrieval
    - Add request validation and error handling for story-based operations
    - Configure CORS for web client support
    - Include proper HTTP status codes and error responses
    - _Requirements: 2.1, 2.2, 2.3, 7.1, 7.2, 8.1, 8.2_

  - [x]\* 3.5 Write unit tests for Story Generation Module
    - Test LLM service integration with mock story seed and expansion responses
    - Test story storage and caching behavior for both seeds and full stories
    - Test story generation service two-phase workflow
    - Test API endpoints with various story-based input scenarios
    - _Requirements: 5.1, 5.2, 5.3_

- [x] 4. Implement POI Discovery Module

  - [x] 4.1 Create Overpass API integration service

    - Implement OverpassService for OpenStreetMap data queries
    - Create POI discovery queries with configurable radius
    - Add POI categorization logic for discovered locations
    - Implement error handling and timeout management
    - Add response parsing and data transformation
    - _Requirements: 1.1, 1.2_

  - [x] 4.2 Create Google Roads API integration service

    - Implement GoogleRoadsService for road identification
    - Add snap-to-roads functionality for location processing
    - Include API key management and rate limiting
    - Implement highway detection using Google Roads data
    - Add fallback handling when Google Roads API is unavailable
    - _Requirements: 1.1, 1.2_

  - [x] 4.3 Implement POIDiscoveryService

    - Create service that coordinates multiple POI data sources
    - Implement POI ranking and relevance scoring
    - Add duplicate POI detection and merging
    - Include distance-based filtering and sorting
    - Implement configurable search radius and result limits
    - _Requirements: 1.1, 1.2_

  - [x]\* 4.4 Write unit tests for POI Discovery Module
    - Test Overpass API integration with mock responses
    - Test Google Roads API integration and error handling
    - Test POI discovery service coordination and ranking
    - Verify POI categorization accuracy
    - _Requirements: 5.1, 5.2_

- [ ] 5. Implement Journey Module (Primary API)

  - [x] 5.1 Rename Orchestration module to Journey module and create JourneyService

    - Rename orchestration directory to journey (orchestration → journey)
    - Rename OrchestrationModule to JourneyModule
    - Rename OrchestrationService to JourneyService
    - Rename OrchestrationController to JourneyController
    - Update all imports and references throughout the codebase
    - Update app.module.ts to import JourneyModule instead of OrchestrationModule
    - Implement service that coordinates POI discovery and story seed generation
    - Add location processing workflow from coordinates to story seeds
    - Implement caching strategy to avoid duplicate story seed generation
    - Include error handling for service coordination failures
    - Add logging and monitoring for journey processing steps
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [x] 5.2 Create Journey API endpoints

    - Implement POST /api/story-seeds-for-location endpoint as primary client interface
    - Implement GET /api/story/:storyId endpoint for full story content retrieval
    - Add comprehensive request validation and error responses
    - Include proper HTTP status codes and response formatting
    - Configure CORS and security headers for client access
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 7.1, 7.2, 8.1, 8.2_

  - [x] 5.3 Implement health check and monitoring endpoints

    - Create GET /api/health endpoint with service status aggregation
    - Add individual service health checks (LLM, POI APIs, storage)
    - Implement service degradation detection and reporting
    - Include system metrics like response times and error rates
    - Add configuration endpoint for debugging (development only)
    - _Requirements: 3.3, 3.4_

  - [x]\* 5.4 Write integration tests for Journey Module
    - Test complete journey workflow from location to story seeds to full stories
    - Test error handling when dependent services fail during story operations
    - Test health check endpoint accuracy
    - Verify story-based API endpoint request/response handling
    - Test two-phase story generation workflow integration
    - _Requirements: 5.2, 5.3, 5.4_

- [x] 6. Implement comprehensive error handling and resilience

  - [x] 6.1 Add service-level error handling

    - Implement timeout handling for all external API calls
    - Add retry logic with exponential backoff for transient failures
    - Create fallback responses when services are unavailable
    - Implement circuit breaker pattern for external service calls
    - Add comprehensive error logging without exposing sensitive data
    - _Requirements: 3.1, 3.2, 3.3_

  - [x] 6.2 Create standardized error response system

    - Define ErrorResponse interface with consistent error format
    - Implement ErrorCodes enum for all possible error scenarios
    - Add error middleware for consistent error handling across endpoints
    - Include proper HTTP status code mapping for different error types
    - Add request correlation IDs for error tracking
    - _Requirements: 3.1, 3.2, 3.3_

  - [x]\* 6.3 Write error handling tests
    - Test timeout and retry mechanisms with simulated failures
    - Test circuit breaker functionality under load
    - Test error response formatting and status codes
    - Verify fallback behavior when external services fail
    - _Requirements: 5.1, 5.2_

- [x] 7. Create end-to-end integration and deployment preparation

  - [x] 7.1 Implement complete application integration

    - Wire all modules together in main Danet application
    - Configure dependency injection for all services
    - Add application-level middleware for logging and CORS
    - Implement graceful shutdown handling
    - Add startup health checks and service initialization
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 7.2 Add development and deployment configuration

    - Create comprehensive .env.example with all required variables
    - Add development scripts for local testing and debugging
    - Implement production-ready logging configuration
    - Add basic security headers and rate limiting
    - Create deployment documentation and startup instructions
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x]\* 7.3 Write end-to-end integration tests
    - Test complete user journey from location input to story seed discovery to full story retrieval
    - Test system behavior under various failure scenarios in story generation workflow
    - Verify all story-based API endpoints work together correctly
    - Test system startup and shutdown procedures with story storage
    - Test story seed caching and full story expansion integration
    - _Requirements: 5.2, 5.3, 5.4_

- [x] 8. Validate MVP completion criteria

  - [ ] 8.1 Verify journey service functionality

    - Test that POST /api/story-seeds-for-location successfully processes location data and returns story seeds
    - Verify POI discovery returns relevant points of interest for story generation
    - Confirm story seed generation produces quality story summaries and titles
    - Test story seed caching and retrieval works correctly
    - Validate that GET /api/story/:storyId successfully expands story seeds into full narratives
    - Test full story caching and retrieval functionality
    - Validate error handling provides appropriate user feedback for story operations
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 7.1, 7.2, 7.3, 7.4, 7.5, 8.1, 8.2, 8.3, 8.4, 8.5_

  - [ ] 8.2 Confirm system readiness for client integration

    - Verify all story-based API endpoints are documented and functional
    - Test CORS configuration allows web client access to story endpoints
    - Confirm health check endpoints provide accurate service status
    - Validate error responses are client-friendly for story operations
    - Test system performance under expected load for two-phase story generation
    - Verify story seed response format supports client-side story selection and history tracking
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 7.1, 7.2, 8.1, 8.2_

  - [x]\* 8.3 Create integration documentation and examples
    - Document all story-based API endpoints with request/response examples
    - Create client integration guide with code samples for story seed discovery and story retrieval
    - Add troubleshooting guide for common story generation issues
    - Include performance tuning recommendations for two-phase story generation
    - Document story seed caching behavior and story ID management
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 7.1, 7.2, 8.1, 8.2_
