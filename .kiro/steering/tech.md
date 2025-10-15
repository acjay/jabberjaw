# Technology Stack & Build System

## Core Technologies

- **Runtime**: Deno 1.40+ (JavaScript/TypeScript runtime)
- **Framework**: Danet (Deno's NestJS-inspired framework)
- **Language**: TypeScript with strict mode enabled
- **Package Management**: JSR (JavaScript Registry) for all imports
- **Testing**: Deno's built-in testing framework with BDD support
- **Validation**: Zod for schema validation and type safety
- **API Documentation**: OpenAPI/Swagger integration via @danet/swagger

## Key Dependencies

- `@danet/core` - Web framework with decorators and dependency injection
- `@danet/swagger` - OpenAPI/Swagger documentation and validation
- `@std/http` - HTTP utilities
- `@std/dotenv` - Environment variable loading
- `@std/assert` - Testing assertions
- `@std/testing` - Testing utilities
- `zod` - Schema validation and type inference

## Development Commands

All development commands should be run from the `backend/` directory using Deno tasks:

```bash
cd backend

# Development
deno task dev          # Start development server with auto-reload
deno task start        # Start production server

# Testing
deno task test         # Run all tests
deno task test:unit    # Run unit tests only
deno task test:e2e     # Run end-to-end tests only

# Code quality
deno task lint         # Lint code
deno task fmt          # Format code
deno task fmt:check    # Check formatting
```

## Code Standards

- **Formatting**: Deno's built-in formatter (2 spaces, single quotes, semicolons)
- **Linting**: Deno's built-in linter with recommended rules
- **Line Width**: 100 characters maximum
- **Decorators**: Uses experimental decorators for Danet framework
- **Validation**: Zod schemas should be used for request/response validation for all internal and external APIs
- **API Documentation**: OpenAPI decorators on all controller methods

## Environment Configuration

- Environment variables loaded via `@std/dotenv`
- `.env` files for local development
- `.env.example` provides template for required variables
- Key variables: `OPENAI_API_KEY`, `OPENAI_MODEL`, `PORT`
- **Configuration Service**: Use `ConfigurationService` from `ConfigurationModule` instead of direct `Deno.env` access
- Services should inject `ConfigurationService` for environment variable access to improve testability

## Testing Approach

- Unit tests co-located with source files (`.test.ts` suffix)
- E2E tests in dedicated `test/` directory
- BDD-style testing with `describe`/`it` blocks
- Parallel test execution enabled
- Mock services for external dependencies (OpenAI fallback). Use simple Deno test constructs like stubs and spies, where possible. Avoid creating test utilities.

## Development methodology

- Ensure code compiles before completing each task (e.g. `deno check` for Deno code)
- Ensure tests still pass before completing each task (e.g. `deno task test` for Deno code)
- If APIs have been modified, validate the response with a `curl` command. The user should be running the server in `dev` mode. The command `curl -X GET http://localhost:3000/api/health -s` is trusted so that the agent can automatically verify that the server is running. Therefore, the agent should not suggest starting the server as a tool command. It should ask the user to start the server in a separate terminal if the health check fails to verify that the server is running.
- Do not leave behind deprecated code.
- Use Zod for validation where possible, rather than doing imperative validation.
  - Use Zod's discriminated unions for variants.
  - Use TypeScript enums for Zod enums.

## Other notes

- Please ignore the warning `Warning experimentalDecorators compiler option is deprecated and may be removed at any time`. Danet relies on the deprecated form of decorators, to match the behavior of NestJS. The project has has no intention to use the more standardized form.

## Schema Validation & API Design

- **Schema Location**: All Zod schemas are centralized in `src/shared/schemas/`
- **Validation Pattern**: Use `@Body(Schema)` decorator from `@danet/zod` for automatic validation
- **Type Safety**: Leverage Zod's `z.infer<>` for automatic TypeScript type generation
- **API Documentation**: Use `@ReturnedSchema(Schema)` from `@danet/zod` for response documentation
- **Schema Organization**: Schemas are grouped by domain (location, poi, content, journey)
- **Validation Errors**: Automatic HTTP 400 responses with detailed validation messages

### Schema Development Guidelines

1. **Define schemas first**: Create Zod schemas before implementing API endpoints
2. **Use schema inference**: Generate TypeScript types from schemas using `z.infer<>`
3. **Automatic validation**: Use `@Body(Schema)` decorator for request validation
4. **Document responses**: Use `@ReturnedSchema(Schema)` decorator for response documentation
5. **Bridge legacy code**: Use schema bridge utilities when integrating with existing DTOs
6. **Reuse schemas**: Share common schemas across different endpoints and modules

### Controller Pattern

```typescript
import { Body, ReturnedSchema } from "@danet/zod";
import { MyRequestSchema, MyResponseSchema, type MyRequest, type MyResponse } from "../schemas/index.ts";

@Post("endpoint")
@ReturnedSchema(MyResponseSchema)
async myEndpoint(
  @Body(MyRequestSchema) body: MyRequest
): Promise<MyResponse> {
  // Request is automatically validated
  // Response type is documented
  return result;
}
```
