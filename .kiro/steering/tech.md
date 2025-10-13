# Technology Stack & Build System

## Core Technologies

- **Runtime**: Deno 1.40+ (JavaScript/TypeScript runtime)
- **Framework**: Danet (Deno's NestJS-inspired framework)
- **Language**: TypeScript with strict mode enabled
- **Package Management**: JSR (JavaScript Registry) for all imports
- **Testing**: Deno's built-in testing framework with BDD support

## Key Dependencies

- `@danet/core` - Web framework with decorators and dependency injection
- `@std/http` - HTTP utilities
- `@std/dotenv` - Environment variable loading
- `@std/assert` - Testing assertions
- `@std/testing` - Testing utilities

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

## Environment Configuration

- Environment variables loaded via `@std/dotenv`
- `.env` files for local development
- `.env.example` provides template for required variables
- Key variables: `OPENAI_API_KEY`, `OPENAI_MODEL`, `PORT`

## Testing Approach

- Unit tests co-located with source files (`.test.ts` suffix)
- E2E tests in dedicated `test/` directory
- BDD-style testing with `describe`/`it` blocks
- Parallel test execution enabled
- Mock services for external dependencies (OpenAI fallback)

## Development methodology

- Ensure code compiles before completing each task (e.g. `deno check` for Deno code)
- Ensure tests still pass before completing each task (e.g. `deno task test` for Deno code)
- If APIs have been modified, validate the response with a `curl` command. The user should be running the server in `dev` mode. The command `curl -X GET http://localhost:3000/api/health -s` is trusted so that the agent can automatically verify that the server is running. Therefore, the agent should not suggest starting the server as a tool command. It should ask the user to start the server in a separate terminal if the health check fails to verify that the server is running.
