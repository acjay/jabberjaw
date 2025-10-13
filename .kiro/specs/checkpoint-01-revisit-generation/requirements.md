# Requirements Document

## Introduction

This checkpoint addresses a fundamental redesign of the content generation system to support multiple stories per location with improved tracking and generation methodology. The development team needs to update documentation, terminology, and code to reflect the new story-based approach where content is generated in two phases: story seed generation followed by full story expansion.

## Narrative

Before we go further, I want to think a little more deeply about how the content generation should work.

Since multiple stories can be told for a given location point, we need a way of tracking what stories the user has already heard. For now, let's assume that this history is stored client-side. We'll want to identify each story uniquelly with a token, which I think we already have as the `segmentId`. Let's change this to `storyId`.

We should use `storyId` as the primary token for stories, because I am thinking that a given subject may have many distinct stories. For example, New York City alone could be the source of nearly infinite content. When a story is generated, we should direct the LLM to give us title that can be combined with the request inputs to uniquely identify the story. In other words, the inputs and the title are the natural key for the story content and the `storyId` is the surrogate key. We should not consider the location coordinates to be part of the natural key. Let's call the natural key and its components the story seed.

The LLM-provided title is pretty important, because we should try to get it to be something that will have a collision if a story would be fairly interchangeable.

Let's make a glossary in `.kiro/steering/product.md` and include the terms Story, Story Seed, Story Title.

I want to move to a different methodology of content generation. Insstead of directly generating a single segment, I want to take the story seed and generate a collection of paragraph-long story summaries, followed by story titles. These should be story summaries that can, with high conficence, be extrapolated into full stories.

We will need to use some server-side persistence to keep the associations between these natural and surrgate keys for stories, along with the generated summary. For the PoC, this can just be in the server's memory. These will all be used as the input to generate a full Story.

Our main endpoint is called `/api/location`, but let's change this to `/api/story-seeds-for-location` to be specific. It should return a list of storyIds (along with all the metadata for each story). The client can then use its playback history to determine what story should actually be played.

The client will then fetch the story text from `/api/story/:storyId`. If the full story hasn't already been generated, it should be generated at this point.

Let's update our steering and spec docs to reflect this and any changes in nomenclature. Then let's make the changes to the backend code.

This is a lot of work, so I want you to carry this out as tasks, so let's make a new spec `01-revisit-design` and renumber the other specs. Break all this work into tasks, and we'll do it step by step.

## Requirements

### Requirement 1

**User Story:** As a developer, I want updated product documentation that reflects the new story-based terminology, so that the team has a clear understanding of the system concepts.

#### Acceptance Criteria

1. WHEN reviewing product documentation THEN the system SHALL include a glossary defining Story, Story Seed, and Story Title
2. WHEN examining the glossary THEN Story SHALL be defined as the complete narrative content generated for a specific topic and location context
3. WHEN examining the glossary THEN Story Summary SHALL be defined as a paragraph-long summary that can be elaborated into a full story
4. WHEN examining the glossary THEN Story Title SHALL be defined as the LLM-generated short title for a story summary that creates collision potential for interchangeable stories
5. WHEN examining the glossary THEN Story Seed SHALL be defined as the natural key combining request inputs and the Story Title, which uniquely identifies a Story

### Requirement 2

**User Story:** As a developer, I want the existing specifications updated to use the new story-based terminology and approach, so that all documentation is consistent with the new design.

#### Acceptance Criteria

1. WHEN reviewing specification documents THEN references to "segmentId" SHALL be replaced with "storyId"
2. WHEN examining API documentation THEN endpoint descriptions SHALL reflect the two-phase generation approach
3. WHEN reviewing data models THEN terminology SHALL be consistent with story-based concepts
4. WHEN examining workflow descriptions THEN they SHALL describe story seed generation followed by full story expansion

### Requirement 3

**User Story:** As a developer, I want the codebase refactored to use storyId instead of segmentId, so that the implementation matches the new terminology.

#### Acceptance Criteria

1. WHEN examining variable names THEN "segmentId" SHALL be renamed to "storyId" throughout the codebase
2. WHEN reviewing function parameters THEN they SHALL use "storyId" terminology
3. WHEN examining type definitions THEN they SHALL reflect the new story-based naming
4. WHEN reviewing test files THEN they SHALL use updated terminology consistently
5. WHEN exploring the codebase THEN the content generation module and services SHALL be called StoryModule and StoryService

### Requirement 4

**User Story:** As a developer, I want the API endpoints updated to reflect the new story-based approach, so that the interface clearly communicates the two-phase generation methodology.

#### Acceptance Criteria

1. WHEN examining the main endpoint THEN "/api/location" SHALL be renamed to "/api/story-seeds-for-location"
2. WHEN reviewing endpoint responses THEN "/api/story-seeds-for-location" SHALL return a list of storyIds with metadata
3. WHEN examining new endpoints THEN "/api/story/:storyId" SHALL be available for fetching full story content
4. WHEN reviewing endpoint documentation THEN it SHALL describe the two-phase approach clearly

### Requirement 5

**User Story:** As a developer, I want the backend MVP spec design updated to describe the two-phase content generation approach, so that the architecture documentation reflects the new methodology.

#### Acceptance Criteria

1. WHEN updating `.kiro/specs/01-backend-provisional-mvp/design.md` THEN the content generation section SHALL describe story summary generation as the first phase
2. WHEN updating the design THEN the architecture SHALL show story seed generation followed by full story expansion
3. WHEN reviewing the updated design THEN API flow SHALL demonstrate the two-endpoint approach for story seeds and story retrieval
4. WHEN examining the design THEN data models SHALL reflect story-based terminology and relationships

### Requirement 6

**User Story:** As a developer, I want the backend MVP spec tasks updated to reflect story-based implementation, so that the task list guides developers through the new architecture.

#### Acceptance Criteria

1. WHEN updating `.kiro/specs/01-backend-provisional-mvp/tasks.md` THEN tasks SHALL focus on story seed generation rather than direct content generation
2. WHEN reviewing updated tasks THEN they SHALL include implementing story metadata persistence
3. WHEN examining the task list THEN it SHALL include creating the `/api/story-seeds-for-location` endpoint
4. WHEN reviewing tasks THEN they SHALL include implementing the `/api/story/:storyId` endpoint for full story retrieval

### Requirement 7

**User Story:** As a developer, I want the existing backend MVP spec updated to reflect the new story-based methodology, so that the implementation plan is aligned with the new architecture.

#### Acceptance Criteria

1. WHEN updating `.kiro/specs/01-backend-provisional-mvp/requirements.md` THEN all references to segments SHALL be changed to stories
2. WHEN updating `.kiro/specs/01-backend-provisional-mvp/requirements.md` THEN new user stories SHALL be added for story seed generation and story retrieval
3. WHEN updating `.kiro/specs/01-backend-provisional-mvp/design.md` THEN the architecture SHALL describe the story seed and story generation services
4. WHEN updating `.kiro/specs/01-backend-provisional-mvp/design.md` THEN API endpoints SHALL be updated to `/api/story-seeds-for-location` and `/api/story/:storyId`
5. WHEN updating `.kiro/specs/01-backend-provisional-mvp/tasks.md` THEN tasks SHALL reflect story-based implementation rather than segment-based implementation
