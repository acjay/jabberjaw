# Design Document

## Overview

This checkpoint focuses on updating documentation, specifications, and terminology to reflect the new story-based content generation methodology. The design emphasizes documentation consistency and spec alignment rather than major code implementation, ensuring all project artifacts accurately describe the two-phase story generation approach.

## Architecture

### Documentation Update Strategy

The design follows a systematic approach to updating project documentation:

1. **Product Documentation Updates**: Update steering documents with new terminology and glossary
2. **Specification Alignment**: Revise existing backend MVP spec to reflect story-based approach
3. **Terminology Consistency**: Ensure consistent use of story-based terms across all documentation
4. **Minimal Code Changes**: Limit code changes to superficial refactoring (variable names, endpoint paths)

### Story-Based Terminology Framework

The new terminology framework introduces these key concepts:

- **Story**: Complete narrative content generated for a specific topic and location context
- **Story Seed**: Natural key combining request inputs and Story Title that uniquely identifies a Story
- **Story Title**: LLM-generated short title that creates collision potential for interchangeable stories
- **Story Summary**: Paragraph-long summary that can be elaborated into a full story
- **Story ID**: Surrogate key that uniquely identifies a story in the system

## Components and Interfaces

### Documentation Components

#### Product Steering Updates

- **Location**: `.kiro/steering/product.md`
- **Purpose**: Add glossary section with story-based terminology
- **Content**: Definitions for Story, Story Seed, Story Title, Story Summary, Story ID

#### Backend MVP Spec Updates

- **Requirements Document**: `.kiro/specs/01-backend-provisional-mvp/requirements.md`

  - Replace segment terminology with story terminology
  - Add user stories for two-phase generation approach
  - Update acceptance criteria to reflect story-based workflows

- **Design Document**: `.kiro/specs/01-backend-provisional-mvp/design.md`

  - Update architecture diagrams to show story seed generation
  - Revise API endpoint documentation
  - Update data models to reflect story-based relationships

- **Tasks Document**: `.kiro/specs/01-backend-provisional-mvp/tasks.md`
  - Modify tasks to implement story-based endpoints
  - Update task descriptions to use story terminology
  - Align implementation steps with two-phase approach

### Code Refactoring Components

#### Terminology Updates

- **Variable Names**: Change `segmentId` to `storyId` throughout codebase
- **Function Parameters**: Update parameter names to use story-based terminology
- **Type Definitions**: Modify interfaces and types to reflect new naming
- **API Endpoints**: Rename `/api/location` to `/api/story-seeds-for-location`

#### Module Naming

- Consider renaming content generation modules to story-based names
- Update service class names to reflect story terminology
- Align test file naming with updated terminology

## Data Models

### Updated Content Model Structure

The story-based approach requires updating data models to reflect:

```typescript
// Updated terminology in existing models
interface StoryMetadata {
  storyId: string; // Previously segmentId
  storySeed: StorySeed; // Natural key components
  storyTitle: string; // LLM-generated title
  storySummary: string; // Paragraph-long summary
  fullStory?: string; // Generated on demand
  createdAt: Date;
  updatedAt: Date;
}

interface StorySeed {
  location: LocationContext;
  subject: string;
  style: ContentStyle;
  storyTitle: string; // Part of natural key
}
```

### API Response Models

#### Story Seeds Endpoint Response

```typescript
interface StorySeedsResponse {
  storySeeds: StoryMetadata[];
  location: LocationContext;
  totalAvailable: number;
}
```

#### Individual Story Response

```typescript
interface StoryResponse {
  storyId: string;
  storyTitle: string;
  fullStory: string;
  metadata: StoryMetadata;
}
```

## Error Handling

### Documentation Update Errors

- **Missing Files**: Handle cases where spec files don't exist
- **Inconsistent Terminology**: Identify and flag mixed terminology usage
- **Broken References**: Update cross-references between documents

### Code Refactoring Errors

- **Compilation Issues**: Ensure renamed variables don't break builds
- **Test Failures**: Update test expectations for renamed elements
- **API Compatibility**: Maintain backward compatibility during transition

## Testing Strategy

### Documentation Validation

- **Terminology Consistency**: Verify consistent use of story-based terms
- **Cross-Reference Integrity**: Ensure all document references are updated
- **Completeness Checks**: Confirm all required sections are updated

### Code Refactoring Validation

- **Build Verification**: Ensure code compiles after terminology changes
- **Test Suite Execution**: Verify all tests pass with updated names
- **API Endpoint Testing**: Confirm renamed endpoints function correctly

### Spec Alignment Testing

- **Requirements Coverage**: Verify updated specs cover all story-based requirements
- **Design Consistency**: Ensure design aligns with updated requirements
- **Task Completeness**: Confirm tasks implement the story-based approach

## Implementation Phases

### Phase 1: Product Documentation

1. Update `.kiro/steering/product.md` with glossary
2. Verify terminology consistency across steering documents

### Phase 2: Backend MVP Spec Updates

1. Update requirements document with story-based user stories
2. Revise design document to reflect two-phase approach
3. Modify tasks to implement story-based endpoints

### Phase 3: Superficial Code Refactoring

1. Rename variables from `segmentId` to `storyId`
2. Update API endpoint paths
3. Modify type definitions and interfaces
4. Update test files with new terminology

### Phase 4: Validation and Consistency

1. Verify all documentation uses consistent terminology
2. Ensure code compiles and tests pass
3. Validate spec alignment with new approach
4. Confirm API endpoints function correctly

## Success Criteria

- All project documentation uses story-based terminology consistently
- Backend MVP spec accurately describes the two-phase generation approach
- Code compiles and tests pass after terminology updates
- API endpoints reflect the new story-based naming convention
- Cross-references between documents remain intact and accurate
