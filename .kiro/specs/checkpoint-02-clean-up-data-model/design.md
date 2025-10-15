# Design Document

## Overview

This design outlines the approach for dramatically simplifying Jabberjaw's data model by consolidating multiple overlapping schemas, DTOs, and model classes into three core Zod schemas. The refactor will eliminate redundancy while maintaining practical functionality for both HTTP APIs and internal service interfaces.

## Architecture

### Core Data Model

The simplified data model centers around three primary schemas that represent the complete story generation and management lifecycle:

```typescript
// Core story subject representation
export const StorySubjectSchema = z.object({
  type: z.literal("StructuredPOI"),
  name: z.string().min(1),
  poiType: z.string().min(1),
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }),
  description: z.string().optional(),
  locationDescription: z.string().optional(),
  category: z.string().optional(),
  significance: z.number().optional(),
  tags: z.array(z.string()).optional(),
});

// Story seed with embedded subject
export const StorySeedSchema = z.object({
  type: z.literal("StorySeed"),
  storyId: z.string(),
  title: z.string(),
  summary: z.string(),
  storySubject: StorySubjectSchema,
  createdAt: z.date(),
});

// Complete story with embedded seed
export const FullStorySchema = z.object({
  storyId: z.string(),
  content: z.string(),
  duration: z.number().positive(),
  storySeed: StorySeedSchema,
  status: z.enum(["ready", "generating", "error"]).default("ready"),
  generatedAt: z.date().optional(),
});
```

### Schema Relationships

The schemas form a hierarchical relationship where each level contains complete context:

- **StorySubjectSchema**: Contains all POI information needed for content generation
- **StorySeedSchema**: Embeds StorySubjectSchema and adds story metadata
- **FullStorySchema**: Embeds StorySeedSchema and adds generated content

This design eliminates the need for separate lookups and ensures all necessary context is available at each level.

## Components and Interfaces

### Schema Location and Organization

All core schemas will be consolidated in `backend/src/shared/schemas/story.schema.ts` to provide a single source of truth for story-related data structures.

### API Request/Response Schemas

Additional schemas for API boundaries will remain separate but reference the core schemas:

```typescript
// API request schema for story generation
export const FullStoryRequestSchema = z.object({
  storySubject: StorySubjectSchema,
  targetDuration: z.number().min(30).max(600).optional().default(180),
  contentStyle: z
    .enum(["historical", "cultural", "geographical", "mixed"])
    .optional()
    .default("mixed"),
});

// API response schemas will use the core schemas directly
export const StorySeedsResponseSchema = z.object({
  seeds: z.array(StorySeedSchema),
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }),
  timestamp: z.date(),
});
```

### Service Interface Design

Services will be designed to accept core schema objects as primary parameters, with additional parameters for service-specific needs:

```typescript
// Example service method signatures
class StoryService {
  async generateStorySeeds(subject: StorySubject): Promise<StorySeed[]>;

  async generateFullStory(
    storySeed: StorySeed,
    targetDuration?: number,
    contentStyle?: ContentStyleType
  ): Promise<FullStory>;

  async findStoriesBySubject(
    subject: StorySubject,
    limit?: number
  ): Promise<FullStory[]>;
}
```

## Data Models

### Migration Strategy

The migration from current data structures to simplified schemas follows this approach:

1. **Schema Consolidation**: Replace multiple POI representations with single StorySubjectSchema
2. **DTO Elimination**: Remove all DTO classes that duplicate schema functionality
3. **Model Cleanup**: Delete legacy model classes in favor of Zod schema types
4. **Service Updates**: Update service methods to use schema types directly

### Type Safety

TypeScript types will be generated exclusively from Zod schemas:

```typescript
export type StorySubject = z.infer<typeof StorySubjectSchema>;
export type StorySeed = z.infer<typeof StorySeedSchema>;
export type FullStory = z.infer<typeof FullStorySchema>;
```

### Data Transformation

One-time transformation utilities will convert existing data to new schema format during migration:

```typescript
// One-time migration utilities (to be removed after migration)
export function convertLegacyPOIToStorySubject(legacyPOI: any): StorySubject {
  return StorySubjectSchema.parse({
    type: "StructuredPOI",
    name: legacyPOI.name,
    poiType: legacyPOI.type || legacyPOI.category,
    location: {
      latitude: legacyPOI.location.latitude,
      longitude: legacyPOI.location.longitude,
    },
    description: legacyPOI.description,
    locationDescription: legacyPOI.context || legacyPOI.locationDescription,
    category: legacyPOI.category,
    significance: legacyPOI.metadata?.significanceScore,
    tags: legacyPOI.tags,
  });
}
```

## Error Handling

### Validation Strategy

Zod schemas provide automatic validation with detailed error messages:

- API endpoints use `@Body(Schema)` decorators for request validation
- Service methods validate inputs using schema `.parse()` methods
- Transformation utilities use `.safeParse()` for graceful error handling

### Schema Validation

Services will only accept the new schema formats with strict validation. We can rely on the Danet decorators to do the validation at the API endpoints provided by the `backend`. But if other data needs to be validated, we should use Zod to safely parse:

```typescript
function parseStorySubject(input: unknown): StorySubject {
  return StorySubjectSchema.parse(input); // Throws on invalid input
}

function safeParseStorySubject(input: unknown): StorySubject | null {
  const result = StorySubjectSchema.safeParse(input);
  return result.success ? result.data : null;
}
```

## Testing Strategy

### Schema Testing

- Unit tests for schema validation with valid and invalid inputs
- Tests for transformation utilities to ensure proper conversion
- Integration tests for API endpoints using new schemas

### Service Testing

- Replace broken tests with new implementations using new schema types
- Remove tests for deprecated DTOs and model classes
- Create focused tests for new service method signatures

### Migration Testing

- Validation that existing functionality works with new data model

## Implementation Phases

### Phase 1: Schema Definition

- Create consolidated story.schema.ts file
- Define core schemas and type exports
- Create transformation utilities

### Phase 2: Service Updates

- Update StoryService to use new schemas
- Update JourneyService to use new schemas
- Update POI services to return StorySubject format

### Phase 3: API Updates

- Update controllers to use new schemas
- Update request/response validation
- Test API endpoints with new data structures

### Phase 4: Cleanup

- Remove legacy DTO classes
- Remove legacy model classes
- Remove unused imports and dependencies
- Update tests to use new schemas

### Phase 5: Validation

- Run full test suite to ensure functionality
- Validate API responses match expected schemas
- Performance testing to confirm improvements

## Files to be Modified

### New Files

- `backend/src/shared/schemas/story.schema.ts` - Core schema definitions

### Modified Files

- `backend/src/story/services/story.service.ts` - Use new schemas
- `backend/src/journey/journey.service.ts` - Use new schemas
- `backend/src/story/story.controller.ts` - Use new request/response schemas
- `backend/src/shared/schemas/content.schema.ts` - Update to reference core schemas
- `backend/src/shared/schemas/poi.schema.ts` - Update POI schemas

### Deleted Files

- `backend/src/story/dto/` - Entire directory and contents
- `backend/src/models/` - Entire directory and contents
- Legacy schema definitions that duplicate core functionality

## Risk Mitigation

### Breaking Changes

- One-time migration of existing data to new schema format
- Complete removal of legacy DTOs and model classes
- Comprehensive testing to ensure functionality with new schemas only
