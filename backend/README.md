# Road Trip Narrator Backend

A backend service for generating engaging travel content using AI.

## Features

- **Content Generation API**: Generate travel narratives from text descriptions or structured POI data
- **Multiple LLM Support**: Supports OpenAI GPT models with fallback to mock service
- **Content Caching**: Intelligent caching to avoid duplicate content generation
- **CORS Support**: Configured for mobile app communication

## Setup

### Environment Variables

Create a `.env` file in the backend directory:

```bash
# OpenAI Configuration (optional - will use mock service if not provided)
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini

# Server Configuration
PORT=3000
```

### Installation

```bash
# Install Deno (if not already installed)
curl -fsSL https://deno.land/install.sh | sh

# No additional installation needed - Deno handles dependencies
```

### Running the Server

```bash
# Development
deno task dev

# Production
deno task start
```

### Running Tests

```bash
# Run all tests
deno task test

# Run specific test file
deno test --allow-net --allow-read --allow-env src/content-generation/services/openai-llm.service.test.ts
```

## API Endpoints

### Generate Content

**POST** `/api/content/generate`

Generate travel content from either text description or structured POI data.

#### Request Body

**Text Description Input:**

```json
{
  "input": {
    "description": "The town of Metuchen, NJ"
  },
  "targetDuration": 180,
  "contentStyle": "historical"
}
```

**Structured POI Input:**

```json
{
  "input": {
    "name": "Morton Arboretum",
    "type": "arboretum",
    "location": {
      "country": "USA",
      "state": "Illinois",
      "city": "Lisle",
      "coordinates": {
        "latitude": 41.8158,
        "longitude": -88.0702
      }
    },
    "description": "Beautiful tree collections",
    "context": "Located in DuPage County"
  },
  "targetDuration": 180,
  "contentStyle": "cultural"
}
```

#### Content Styles

- `historical` - Focus on historical events and founding stories
- `cultural` - Emphasize cultural significance and local traditions
- `geographical` - Highlight natural features and environmental aspects
- `mixed` - Balanced combination of all styles

#### Response

```json
{
  "id": "uuid",
  "content": "Generated narrative content...",
  "estimatedDuration": 185,
  "generatedAt": "2024-01-01T00:00:00.000Z",
  "sources": ["OpenAI", "gpt-4o-mini"],
  "contentStyle": "historical"
}
```

### Retrieve Content

**GET** `/api/content/:id`

Retrieve previously generated content by ID.

#### Response

```json
{
  "id": "uuid",
  "content": "Generated narrative content...",
  "prompt": "Original prompt used for generation...",
  "generatedAt": "2024-01-01T00:00:00.000Z",
  "sources": ["OpenAI", "gpt-4o-mini"],
  "contentStyle": "historical"
}
```

## LLM Integration

The service automatically chooses between OpenAI and mock service based on configuration:

- **With OPENAI_API_KEY**: Uses OpenAI GPT models for real content generation
- **Without API key**: Uses mock service for development and testing

### Supported Models

- `gpt-4o` - Highest quality, more expensive
- `gpt-4o-mini` - Good quality, cost-effective (recommended)
- `gpt-3.5-turbo` - Fastest, lowest cost

### Cost Estimation

Approximate costs per 1000 requests (assuming ~500 words per response):

- **gpt-4o-mini**: $0.50 - $2.00
- **gpt-4o**: $15.00 - $45.00

## Development

### Project Structure

```
backend/
├── src/
│   ├── content-generation/     # Content generation module
│   │   ├── dto/               # Data transfer objects
│   │   ├── services/          # Business logic services
│   │   └── content-generation.controller.ts
│   ├── models/                # Data models
│   └── main.ts               # Application entry point
├── test/                     # E2E tests
└── deno.json                # Deno configuration
```

### Adding New LLM Providers

1. Create a new service extending `LLMService`
2. Implement `generateContent()` and `generatePrompt()` methods
3. Add to the module's injectables
4. Update the service selection logic in `ContentGenerationService`

## Testing with Real OpenAI API

To test with a real OpenAI API key:

1. Set your `OPENAI_API_KEY` environment variable
2. Uncomment the real API test in `openai-llm.service.test.ts`
3. Run the test (note: this will make actual API calls and incur costs)

```bash
deno test --allow-net --allow-read --allow-env src/content-generation/services/openai-llm.service.test.ts
```
