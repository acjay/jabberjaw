# Requirements Document

## Introduction

This checkpoint spec addresses the need to dramatically simplify Jabberjaw's data model by consolidating multiple overlapping schemas, DTOs, and types into a cleaner, more practical structure. The current system has evolved to include numerous auxiliary types and wrappers that create unnecessary complexity without providing significant value. The goal is to create a streamlined data model that remains practical for both HTTP API usage and internal service APIs while eliminating redundancy and improving maintainability.

## Requirements

### Requirement 1

**User Story:** As a developer working on the Jabberjaw codebase, I want a simplified data model with minimal auxiliary types, so that I can understand and maintain the code more easily without navigating through multiple overlapping schemas.

#### Acceptance Criteria

1. WHEN reviewing the story generation data model THEN the system SHALL use three core schemas as the primary data structures: StorySubjectSchema, StorySeedSchema, and FullStorySchema
2. WHEN examining the codebase THEN the system SHALL eliminate all redundant DTOs and legacy model classes that duplicate schema functionality
3. WHEN working with POI data THEN the system SHALL use only the StructuredPOI type within StorySubjectSchema instead of multiple POI representations
4. WHEN interfacing with external services THEN the system SHALL use schemas for external API data models and design services to accept core schema objects with additional parameters as needed

### Requirement 2

**User Story:** As a developer integrating with the Jabberjaw backend HTTP API, I want consistent data structures across all story-related endpoints, so that I can predict the shape of request and response data without consulting multiple schema definitions.

#### Acceptance Criteria

1. WHEN making requests to backend story endpoints THEN the system SHALL use the simplified schemas for all request validation
2. WHEN receiving responses from backend story endpoints THEN the system SHALL return data conforming to the simplified schemas
3. WHEN working with story content THEN the system SHALL use FullStorySchema that includes the complete StorySeedSchema as a nested property
4. WHEN handling story subjects THEN the system SHALL use StorySubjectSchema with a discriminated union type field set to "StructuredPOI"

### Requirement 3

**User Story:** As a developer maintaining the service layer, I want to eliminate legacy DTOs and model classes, so that I can focus on business logic without managing multiple representations of the same data.

#### Acceptance Criteria

1. WHEN examining the models directory THEN the system SHALL remove all legacy model classes that are replaced by Zod schemas
2. WHEN reviewing the DTO directory THEN the system SHALL remove all DTO classes that duplicate schema functionality
3. WHEN designing internal service interfaces THEN the system SHALL use Zod schema objects where appropriate and unbundled parameters where it improves method signature clarity
4. WHEN running tests THEN the system SHALL pass all existing functionality tests with the simplified data model

### Requirement 4

**User Story:** As a developer working with external service integrations, I want clean service boundaries that use core schemas, so that I can maintain consistent data structures throughout the system.

#### Acceptance Criteria

1. WHEN designing services that interface with external APIs THEN the system SHALL accept core schema objects as primary parameters
2. WHEN external services require additional data THEN the system SHALL use separate parameters rather than extending core schemas
3. WHEN processing external API data THEN the system SHALL transform it into core schema format at the service boundary
4. WHEN maintaining backward compatibility THEN the system SHALL provide clear migration paths from old to new data structures

### Requirement 5

**User Story:** As a developer concerned with code maintainability, I want aggressive cleanup of deprecated code, so that the codebase remains lean and focused on current functionality.

#### Acceptance Criteria

1. WHEN reviewing the codebase THEN the system SHALL remove all deprecated model classes and DTOs
2. WHEN examining test files THEN the system SHALL remove tests for deprecated functionality
3. WHEN updating imports THEN the system SHALL update all references to use the new simplified schemas
4. WHEN validating the cleanup THEN the system SHALL ensure no orphaned code or unused imports remain

### Requirement 6

**User Story:** As a developer working with the story generation pipeline, I want the StorySeedSchema to include the complete story subject information, so that I have all necessary context for content generation in a single structure.

#### Acceptance Criteria

1. WHEN creating story seeds THEN the system SHALL include the complete StorySubjectSchema as a nested property
2. WHEN storing story seeds THEN the system SHALL maintain the relationship between seeds and their subjects through the nested structure
3. WHEN retrieving story seeds THEN the system SHALL provide access to all subject details without additional lookups
4. WHEN generating full stories THEN the system SHALL reference the complete story seed including subject information
