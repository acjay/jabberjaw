# Implementation Plan

- [x] 1. Update product documentation with story-based terminology

  - Add glossary section to `.kiro/steering/product.md` with definitions for Story, Story Seed, Story Title, Story Summary, and Story ID
  - Ensure terminology is consistent with the new story-based approach
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 2. Update backend MVP spec requirements document

  - Replace all references to "segmentId" with "storyId" in `.kiro/specs/01-backend-provisional-mvp/requirements.md`
  - Add new user stories for story seed generation and story retrieval workflows
  - Update acceptance criteria to reflect the two-phase generation approach
  - _Requirements: 7.1, 7.2_

- [x] 3. Update backend MVP spec design document

  - Revise architecture section in `.kiro/specs/01-backend-provisional-mvp/design.md` to describe story seed and story generation services
  - Update API endpoint documentation to show `/api/story-seeds-for-location` and `/api/story/:storyId`
  - Modify data models to reflect story-based terminology and relationships
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 7.3, 7.4_

- [x] 4. Update backend MVP spec tasks document

  - Modify tasks in `.kiro/specs/01-backend-provisional-mvp/tasks.md` to focus on story-based implementation
  - Update task descriptions to use story terminology instead of segment terminology
  - Align implementation steps with the two-phase approach (story seeds first, then full stories)
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 7.5_

- [x] 5. Perform superficial code refactoring for terminology consistency
- [x] 5.1 Update variable names from segmentId to storyId

  - Search and replace "segmentId" with "storyId" in TypeScript files
  - Update function parameters and return types
  - _Requirements: 3.1, 3.2_

- [x] 5.2 Update type definitions and interfaces

  - Modify interfaces to use story-based naming conventions
  - Update data model definitions to reflect new terminology
  - _Requirements: 3.3_

- [x] 5.3 Rename API endpoint paths

  - Change "/api/location" to "/api/story-seeds-for-location" in controller files
  - Update route definitions and endpoint documentation
  - _Requirements: 4.1, 4.2_

- [x] 5.4 Update test files with new terminology

  - Modify test files to use "storyId" instead of "segmentId"
  - Update test expectations for renamed API endpoints
  - _Requirements: 3.4_

- [x] 6. Validate documentation consistency and code functionality
- [x] 6.1 Verify terminology consistency across all documentation

  - Check that all spec documents use story-based terminology consistently
  - Ensure cross-references between documents are updated correctly
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 6.2 Validate code compilation and basic functionality
  - Ensure TypeScript code compiles after terminology changes
  - Verify that renamed API endpoints are accessible
  - _Requirements: 3.1, 3.2, 3.3, 4.1, 4.2, 4.3_
