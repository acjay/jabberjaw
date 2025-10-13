# Jabberjaw

A location-aware mobile application that generates podcast-style narration about points of interest during road trips.

## Project Structure

This is a monorepo containing:

- `backend/` - Danet (Deno) backend service for story generation and journey coordination
- `android/` - Android mobile application (to be implemented)
- `ios/` - iOS mobile application (planned)

## Prerequisites

- Deno 1.40+ (https://deno.land/manual/getting_started/installation)
- Android Studio (for mobile development)

## Getting Started

### Installation

No package installation needed! Deno handles dependencies automatically.

### Development

```bash
# Start backend development server
cd backend && deno task dev

# Run tests
cd backend && deno task test

# Lint code
cd backend && deno task lint

# Format code
cd backend && deno task fmt
```

### Backend Development

```bash
cd backend

# Start development server with auto-reload
deno task dev

# Start production server
deno task start

# Run tests
deno task test

# Lint code
deno task lint

# Format code
deno task fmt

# Check formatting
deno task fmt:check
```

## API Endpoints

The backend provides the following endpoints:

- `GET /` - Health check endpoint
- `GET /health` - Detailed health status

## Environment Configuration

Copy `backend/.env.example` to `backend/.env` and configure the required environment variables.

## Architecture

The system follows a modular architecture with:

- **Journey Module**: Coordinates location processing and story generation
- **Story Generation Module**: Handles POI identification and LLM integration
- **Data Storage Module**: Manages content persistence and caching

## Technology Stack

- **Backend**: Deno + Danet (Deno's answer to NestJS)
- **Dependencies**: JSR (JavaScript Registry) for all imports
- **Mobile**: Android (to be implemented), iOS (planned)
- **Testing**: Deno's built-in testing framework with BDD support
- **Formatting**: Deno's built-in formatter
- **Linting**: Deno's built-in linter

## Contributing

1. Follow Deno's formatting standards (use `deno fmt`)
2. Write tests for new functionality
3. Update documentation as needed
4. Ensure all tests pass before submitting changes

## License

Private project - All rights reserved
