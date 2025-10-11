# Project Structure & Organization

## Monorepo Layout

```
jabberjaw/
├── backend/           # Deno backend service
├── android/           # Android mobile app (to be implemented)
├── ios/               # iOS mobile app (planned)
└── README.md          # Project overview
```

## Backend Architecture

The backend follows a modular architecture using Danet's module system:

```
backend/src/
├── app.module.ts                    # Root application module
├── main.ts                          # Application entry point
├── content-generation/              # Content generation module
│   ├── content-generation.controller.ts
│   ├── content-generation.module.ts
│   ├── dto/                        # Data transfer objects
│   └── services/                   # Business logic services
├── orchestration/                   # Workflow orchestration module
│   ├── orchestration.controller.ts
│   ├── orchestration.service.ts
│   ├── orchestration.module.ts
│   └── dto/                        # Request/response DTOs
├── poi-discovery/                   # POI identification module
│   ├── poi-discovery.controller.ts
│   ├── poi-discovery.module.ts
│   └── services/                   # POI processing services
└── models/                         # Shared data models
```

## Module Organization Patterns

- **Controllers**: Handle HTTP requests and responses
- **Services**: Contain business logic and external integrations
- **DTOs**: Define request/response data structures
- **Models**: Shared data models across modules
- **Index files**: Export public APIs from modules

## File Naming Conventions

- **Controllers**: `*.controller.ts`
- **Services**: `*.service.ts`
- **Modules**: `*.module.ts`
- **DTOs**: `*.dto.ts`
- **Models**: `*.model.ts`
- **Tests**: `*.test.ts` (co-located with source)
- **E2E Tests**: `*.e2e.test.ts` (in `test/` directory)

## Import Strategy

- Use JSR imports for external dependencies
- Relative imports for local modules
- Index files (`index.ts`) for clean module exports
- Barrel exports to simplify imports

## Configuration Files

- `deno.json` - Deno configuration, tasks, and dependencies (TypeScript config included)
- `.env` - Environment variables (local development)
- `.env.example` - Environment variable template

## Testing Structure

- Unit tests co-located with source files
- E2E tests in dedicated `backend/test/` directory
- Test utilities and mocks in service directories
- Separate test configurations for unit vs e2e tests
