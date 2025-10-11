# Highway Detection Comparison API

This document describes the Highway Detection Comparison API endpoint that implements task 4.3.4 from the road-trip-narrator specification.

## Endpoint

```
POST /api/highway/detection-comparison
```

## Purpose

This endpoint compares four different highway detection methods to evaluate their accuracy and performance:

1. **Current Method**: Point-to-point distance from user location to highway center points
2. **Point-to-Line Method**: Geometric distance calculation using highway line geometry
3. **Google Roads Method**: Direct road identification using Google's "Snap to Roads" API
4. **Enhanced Overpass Method**: Progressive radius search with geometry-based post-processing

## Request Format

```json
{
  "latitude": 40.53383335817636,
  "longitude": -74.3467882397128
}
```

### Parameters

- `latitude` (number, required): Latitude coordinate between -90 and 90
- `longitude` (number, required): Longitude coordinate between -180 and 180

## Response Format

```json
{
  "location": {
    "latitude": 40.53383335817636,
    "longitude": -74.3467882397128
  },
  "methods": {
    "current": {
      "highways": [
        {
          "name": "US Highway 1",
          "type": "highway",
          "distance": 4709.2,
          "confidence": 0.85,
          "metadata": {
            "method": "current",
            "centerPoint": {
              "latitude": 40.560221,
              "longitude": -74.3031964
            }
          }
        }
      ],
      "processingTime": 1250.5,
      "method": "current"
    },
    "pointToLine": {
      "highways": [
        {
          "name": "US Highway 1",
          "type": "highway",
          "distance": 0.0,
          "confidence": 0.95,
          "metadata": {
            "method": "pointToLine",
            "geometryPoints": 15,
            "geometricDistance": 0.0
          }
        }
      ],
      "processingTime": 2100.3,
      "method": "pointToLine"
    },
    "googleRoads": {
      "highways": [
        {
          "name": "US Highway 1",
          "type": "road",
          "distance": 5.2,
          "confidence": 0.98,
          "metadata": {
            "method": "googleRoads",
            "source": "snapToRoads",
            "placeId": "ChIJ...",
            "snappedLocation": {
              "latitude": 40.533801,
              "longitude": -74.346755
            }
          }
        }
      ],
      "processingTime": 850.1,
      "method": "googleRoads",
      "error": "Google Roads API not configured"
    },
    "enhancedOverpass": {
      "highways": [
        {
          "name": "US Highway 1",
          "type": "us_highway",
          "distance": 12.8,
          "confidence": 0.92,
          "metadata": {
            "method": "enhancedOverpass",
            "searchRadius": 100,
            "geometryPoints": 12,
            "geometricDistance": 12.8
          }
        }
      ],
      "processingTime": 1800.7,
      "method": "enhancedOverpass"
    }
  },
  "timestamp": "2025-10-11T03:04:29.123Z"
}
```

### Response Fields

#### Top Level

- `location`: Echo of the input coordinates
- `methods`: Results from all four detection methods
- `timestamp`: When the comparison was performed

#### Method Results

Each method returns:

- `highways`: Array of detected highways, sorted by distance (closest first)
- `processingTime`: Time taken in milliseconds
- `method`: Method name identifier
- `error`: Error message if the method failed (optional)

#### Highway Objects

Each highway contains:

- `name`: Formatted highway name (e.g., "Interstate 95", "US Highway 1")
- `type`: Highway classification (highway, interstate, us_highway, state_highway, road)
- `distance`: Distance from user location in meters
- `confidence`: Confidence score between 0.0 and 1.0
- `metadata`: Method-specific additional information

## Test Locations

The following test locations from `highway-detection-methods.md` can be used to validate the API:

### 1. US Route 1 Location

```json
{
  "latitude": 40.53383335817636,
  "longitude": -74.3467882397128
}
```

Expected: User should be very close to US Route 1 (≤ 50m with geometric methods)

### 2. NYC Interstate Location

```json
{
  "latitude": 40.7128,
  "longitude": -74.006
}
```

Expected: Multiple highways detected in dense urban area

### 3. San Francisco Location

```json
{
  "latitude": 37.7749,
  "longitude": -122.4194
}
```

Expected: West coast highway detection

## Usage Examples

### cURL

```bash
curl -X POST http://localhost:3000/api/highway/detection-comparison \
  -H "Content-Type: application/json" \
  -d '{"latitude": 40.53383335817636, "longitude": -74.3467882397128}'
```

### JavaScript/TypeScript

```typescript
const response = await fetch('/api/highway/detection-comparison', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    latitude: 40.53383335817636,
    longitude: -74.3467882397128,
  }),
});

const comparison = await response.json();
console.log('Highway detection results:', comparison);
```

## Error Handling

### 400 Bad Request

Invalid input parameters:

```json
{
  "statusCode": 400,
  "message": "Failed to compare highway detection methods: Invalid latitude: must be a number between -90 and 90"
}
```

### Method-Specific Errors

Individual methods may fail while others succeed. Failed methods will have:

- Empty `highways` array
- `error` field with description
- `processingTime` still recorded

## Performance Characteristics

Based on testing:

- **Current Method**: ~1-2 seconds (depends on POI API response)
- **Point-to-Line Method**: ~2-3 seconds (includes geometry processing)
- **Google Roads Method**: ~0.5-1 second (fastest when configured)
- **Enhanced Overpass Method**: ~1-3 seconds (progressive radius search)

## Configuration Requirements

### Google Roads API

To enable the Google Roads method:

1. Set `GOOGLE_ROADS_API_KEY` or `GOOGLE_PLACES_API_KEY` environment variable
2. Enable Google Roads API in Google Cloud Console
3. Configure billing (minimal cost for typical usage)

### OpenStreetMap

Point-to-Line and Enhanced Overpass methods use free OpenStreetMap data via the Overpass API.

## Success Metrics

The API helps evaluate highway detection accuracy:

- **Accuracy**: User on highway should show distance ≤ 50m (accounting for GPS accuracy)
- **Performance**: All methods should respond within 5 seconds
- **Reliability**: Methods should handle edge cases gracefully
- **Comparison**: Point-to-line and Google Roads should be more accurate than current method

## Implementation Details

The endpoint is implemented in `backend/src/poi-discovery/poi-discovery.controller.ts` with:

- Parallel execution of all four methods using `Promise.allSettled()`
- Graceful error handling for individual method failures
- Performance timing for each method
- Consistent response format across all methods
- Input validation and proper HTTP status codes

## Testing

Run the test suite:

```bash
deno test src/poi-discovery/highway-detection-comparison.test.ts --allow-net --allow-env
```

The tests verify:

- Input validation
- Response structure
- Performance timing
- Error handling
- Method-specific functionality
- Confidence scoring
- Distance sorting
