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
├── journey/                         # Journey workflow module
│   ├── journey.controller.ts
│   ├── journey.service.ts
│   ├── journey.module.ts
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

## Kiro development

We have two different types of specs in `.kiro/specs`: development specs and checkpoint specs.

The development specs are the default. They describe the executional work to be done to build and improve the app. For the most part, this will be net new code. These are named so that they sort in chronological order on the filesystem. They are prefixed with a number and hyphen, followed by a short description of the work.

Checkpoint specs descrbe the work to be done to carry out major revisions of project direction. For the most part, the requirements will be oriented to the needs of development team roles, and the tasks will indicate revisions to development specs and steering documents. There may also be tasks to do code refactors, such as renamings, but for the most part, should be delgating code tasks to the development specs. The result of completing a checkpoint spec should be that the development specs are brought up-to-date with the latest project intentions.
