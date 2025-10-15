# Implementation Plan

- [x] 1. Create core story schema definitions

  - Create `backend/src/shared/schemas/story.schema.ts` with StorySubjectSchema, StorySeedSchema, and FullStorySchema
  - Export TypeScript types using `z.infer<>` for each schema
  - _Requirements: 1.1, 2.3, 6.1_

- [ ] 2. Restructure content schema to focus on API schemas

  - Modify `backend/src/shared/schemas/content.schema.ts` to import core schemas from story.schema.ts
  - Keep ContentStyleSchema, FullStoryRequestSchema, StorySeedsResponseSchema, and StoryMetadataSchema as API boundary schemas
  - Replace duplicate StorySeedSchema and FullStorySchema definitions with imports
  - Update FullStoryRequestSchema to accept StorySubjectSchema instead of discriminated union
  - _Requirements: 1.2, 2.1, 2.2_

- [ ] 3. Update POI schema to align with story subject format

  - Modify `backend/src/shared/schemas/poi.schema.ts` to ensure StructuredPOISchema matches StorySubjectSchema
  - Remove TextPOIDescriptionSchema and related discriminated union usage
  - Update POI discovery response schemas to return data compatible with StorySubjectSchema
  - _Requirements: 1.3, 4.3_

- [ ] 4. Update story service to use new schemas

  - Modify `backend/src/story/services/story.service.ts` to use new schema types exclusively
  - Update `generateStorySeeds` method to accept StorySubject parameter and return StorySeed with embedded subject
  - Update `generateFullStory` method to work with new schema structure
  - Remove any references to legacy DTO types
  - _Requirements: 3.3, 6.2, 6.3_

- [ ] 5. Update journey service to use new schemas

  - Modify `backend/src/journey/journey.service.ts` to use new schema types
  - Update POI conversion logic to create StorySubject objects
  - Update story seed generation to embed complete subject information
  - Update full story generation to use new schema structure
  - _Requirements: 3.3, 6.1, 6.4_

- [ ] 6. Update story controller to use new schemas

  - Modify `backend/src/story/story.controller.ts` to use updated request/response schemas
  - Update API endpoint validation decorators to use new schemas
  - Ensure all endpoints return data conforming to new schema structure
  - _Requirements: 2.1, 2.2_

- [ ] 7. Remove legacy DTO classes

  - Delete entire `backend/src/story/dto/` directory and all contents
  - Update any remaining imports that reference deleted DTO files
  - _Requirements: 1.2, 3.1, 3.2, 5.1_

- [ ] 8. Remove legacy model classes

  - Delete entire `backend/src/models/` directory and all contents
  - Update any remaining imports that reference deleted model files
  - _Requirements: 1.2, 3.1, 3.2, 5.1_

- [ ] 9. Update shared schema index exports

  - Modify `backend/src/shared/schemas/index.ts` to export new story schema types
  - Remove exports for deleted DTO and model types
  - Ensure all necessary types are properly exported
  - _Requirements: 5.3_

- [ ] 10. Replace broken tests with new implementations

  - Delete existing test files that are broken due to schema changes
  - Create new test file `backend/src/shared/schemas/story.schema.test.ts` for core schema validation
  - Create new test file `backend/src/story/services/story.service.test.ts` focused on new schema usage
  - Create new test file `backend/src/journey/journey.service.test.ts` focused on new schema usage
  - _Requirements: 3.4, 5.2_

- [ ] 11. Validate implementation and cleanup
  - Run `deno check` to ensure all TypeScript compilation errors are resolved
  - Run `deno task test` to ensure all tests pass with new schema structure
  - Remove any orphaned imports or unused code references
  - Verify API endpoints work correctly with new schema validation
  - _Requirements: 5.4_
