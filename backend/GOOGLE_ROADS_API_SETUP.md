# Google Roads API Setup

## Overview

The Google Roads API integration provides direct road identification using Google's "Snap to Roads" functionality. This is implemented as part of task 4.3.2 for highway detection method comparison.

## API Key Requirements

The Google Roads API requires a Google Cloud Platform API key with the following APIs enabled:

1. **Roads API** - Primary API for road snapping functionality
2. **Places API** - Used to get road names from place IDs
3. **Geocoding API** - Optional, used as fallback for place details

## Setup Instructions

### 1. Enable APIs in Google Cloud Console

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project or create a new one
3. Navigate to "APIs & Services" > "Library"
4. Search for and enable:
   - **Roads API**
   - **Places API** (if not already enabled)
   - **Geocoding API** (optional)

### 2. Configure API Key

The service can use either a dedicated Roads API key or reuse the existing Places API key:

**Option 1: Dedicated Roads API Key**

```bash
# In backend/.env
GOOGLE_ROADS_API_KEY=your_roads_api_key_here
GOOGLE_PLACES_API_KEY=your_places_api_key_here
```

**Option 2: Shared API Key**

```bash
# In backend/.env
GOOGLE_PLACES_API_KEY=your_shared_api_key_here
# GOOGLE_ROADS_API_KEY will automatically use GOOGLE_PLACES_API_KEY if not set
```

### 3. API Key Restrictions (Recommended)

For security, restrict your API key to specific APIs and IP addresses:

1. In Google Cloud Console, go to "APIs & Services" > "Credentials"
2. Click on your API key
3. Under "API restrictions", select "Restrict key" and choose:
   - Roads API
   - Places API
   - Geocoding API (if used)
4. Under "Application restrictions", add your server's IP addresses

## Testing the Integration

### 1. Test API Configuration

```bash
curl -X GET http://localhost:3000/api/poi/roads/test
```

Expected response:

```json
{
  "configured": true,
  "connectionTest": true,
  "timestamp": "2025-10-10T22:21:59.836Z"
}
```

### 2. Test Snap to Roads

```bash
curl -X POST http://localhost:3000/api/poi/roads/snap \
  -H "Content-Type: application/json" \
  -d '{"latitude": 40.7580, "longitude": -73.9855}'
```

Expected response:

```json
{
  "roadInfo": {
    "roadName": "Broadway",
    "placeId": "ChIJmQJIxlVYwokRLgeuocVOGVU",
    "snappedLocation": {
      "latitude": 40.758,
      "longitude": -73.9855
    },
    "originalLocation": {
      "latitude": 40.758,
      "longitude": -73.9855
    },
    "distanceFromOriginal": 4.27,
    "confidence": 0.996
  },
  "location": {
    "latitude": 40.758,
    "longitude": -73.9855
  },
  "timestamp": "2025-10-10T22:22:20.771Z"
}
```

### 3. Test Nearest Roads

```bash
curl -X POST http://localhost:3000/api/poi/roads/nearest \
  -H "Content-Type: application/json" \
  -d '{"latitude": 40.7580, "longitude": -73.9855}'
```

## API Endpoints

### GET /api/poi/roads/test

Tests the Google Roads API configuration and connectivity.

**Response:**

- `configured`: Boolean indicating if API key is configured
- `connectionTest`: Boolean indicating if API connection is working
- `timestamp`: ISO timestamp of the test

### POST /api/poi/roads/snap

Snaps a location to the nearest road using Google's Snap to Roads API.

**Request Body:**

```json
{
  "latitude": number,
  "longitude": number
}
```

**Response:**

- `roadInfo`: Road information object or null if no road found
- `location`: Original location coordinates
- `timestamp`: ISO timestamp of the request

### POST /api/poi/roads/nearest

Finds the nearest roads to a location using Google's Nearest Roads API.

**Request Body:**

```json
{
  "latitude": number,
  "longitude": number
}
```

**Response:**

- `roads`: Array of road information objects
- `location`: Original location coordinates
- `timestamp`: ISO timestamp of the request

## Error Handling

The service handles various error scenarios:

- **403 Forbidden**: API key access denied or billing issues
- **429 Too Many Requests**: Rate limit exceeded
- **400 Bad Request**: Invalid request parameters
- **Network errors**: Connection timeouts or network issues

## Rate Limiting

The Google Roads API has usage quotas and rate limits:

- **Snap to Roads**: 50 requests per second per project
- **Nearest Roads**: 50 requests per second per project

The service includes built-in delays between requests to respect rate limits.

## Cost Considerations

Google Roads API pricing (as of 2024):

- **Snap to Roads**: $0.01 per request
- **Nearest Roads**: $0.01 per request

For typical road trip usage (1 request per minute), daily costs would be minimal ($0.01-$0.02 per day).

## Troubleshooting

### Common Issues

1. **"API key not configured"**

   - Ensure `GOOGLE_ROADS_API_KEY` or `GOOGLE_PLACES_API_KEY` is set in `.env`

2. **"Google Roads API access denied"**

   - Verify Roads API is enabled in Google Cloud Console
   - Check API key restrictions and permissions
   - Ensure billing is enabled for the project

3. **"Rate limit exceeded"**

   - Implement request throttling in your application
   - Consider upgrading your quota limits

4. **"Bad Request" errors**
   - Verify latitude/longitude values are valid
   - Check request format matches API documentation

### Debug Mode

Enable debug logging by setting the log level:

```bash
# In backend/.env
LOG_LEVEL=debug
```

This will log detailed information about API requests and responses.
