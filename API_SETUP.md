# API Setup Guide for Climate Gentrification Sentinel

This application now uses **real APIs** instead of hardcoded data. This guide explains how to configure the APIs for full functionality.

## Quick Setup

1. **Create environment file**: Copy the example and add your API keys

```bash
# Create .env.local file in the project root
touch .env.local
```

2. **Add the following environment variables to `.env.local`**:

```env
# WeatherAPI.com API Key (Required for climate data)
WEATHERAPI_KEY=your_weatherapi_key_here

# Google Gemini AI API Key (Optional - already configured for enhanced insights)
GEMINI_API_KEY=your_gemini_api_key_here

# Property Data API (Optional - for real property price data)
PROPERTY_API_BASE_URL=https://api.your-property-source.com
PROPERTY_API_KEY=your_property_api_key_here
```

## API Integrations

### 1. WeatherAPI.com (Weather & Climate Data)

**Status**: ✅ **Fully Integrated**

- **Purpose**: Provides real-time weather data, precipitation, humidity, and climate alerts for flood risk calculation
- **Cost**: Free tier available (1,000,000 calls/month)
- **Setup**:
  1. Visit [WeatherAPI.com](https://www.weatherapi.com/)
  2. Create a free account
  3. Get your API key from the dashboard
  4. Add `WEATHERAPI_KEY=your_key_here` to `.env.local`

**What it provides**:

- Real-time weather conditions
- 7-day weather forecast
- Precipitation data for flood risk
- Weather alerts and warnings
- Air quality data
- Historical weather data

### 2. OpenStreetMap APIs (Geographic Data)

**Status**: ✅ **Fully Integrated** (No API key required)

- **Purpose**: Provides ward boundaries and geographic data for Indian cities
- **APIs Used**:
  - **Nominatim**: Geocoding and administrative boundaries
  - **Overpass**: Advanced geographic queries
- **Cost**: Free (with usage limits)
- **Rate Limits**: 1 request per second for Nominatim

**What it provides**:

- Ward and administrative boundaries
- Geographic coordinates
- Administrative area information

### 3. Property Price APIs (Real Estate Data)

**Status**: ⚠️ **Configurable** (Fallback to simulated data)

- **Purpose**: Real estate price indices and property value data
- **Current State**: Uses realistic simulated data based on market trends
- **To integrate real property data**:
  1. Obtain access to a property price API (e.g., real estate platforms, government APIs)
  2. Set `PROPERTY_API_BASE_URL` and `PROPERTY_API_KEY` in `.env.local`

**Potential APIs to explore**:

- Real estate platform APIs
- Government property registration APIs
- Housing price index services

### 4. Google Gemini AI (Enhanced Insights)

**Status**: ✅ **Already Integrated**

- **Purpose**: Provides AI-powered insights and analysis
- **Setup**: Already configured if you have a Gemini API key

## Data Sources by City

The application supports the following cities with real API integration:

| City      | Weather Data      | Geographic Data  | Property Data |
| --------- | ----------------- | ---------------- | ------------- |
| Pune      | ✅ WeatherAPI.com | ✅ OpenStreetMap | ⚠️ Simulated  |
| Mumbai    | ✅ WeatherAPI.com | ✅ OpenStreetMap | ⚠️ Simulated  |
| Delhi     | ✅ WeatherAPI.com | ✅ OpenStreetMap | ⚠️ Simulated  |
| Bangalore | ✅ WeatherAPI.com | ✅ OpenStreetMap | ⚠️ Simulated  |

## Fallback Behavior

The application is designed to gracefully handle API failures:

1. **Weather API fails**: Falls back to simulated risk data based on geographic and seasonal patterns
2. **Geographic API fails**: Uses pre-configured ward data with realistic coordinates
3. **Property API unavailable**: Uses market-trend-based simulated data
4. **No API keys configured**: Shows warning message and uses all fallback data

## Running Without API Keys

The application will work without any API keys configured, but will show warning messages and use simulated data. This is perfect for:

- Development and testing
- Demonstrations
- When API quotas are exceeded

## Monitoring API Usage

The application logs API configuration status on startup:

- ✅ Successful API integrations
- ⚠️ Warnings for missing API keys
- 📊 Fallback data usage notifications

## Cost Considerations

- **WeatherAPI.com**: Free tier (1,000,000 calls/month) should be sufficient for development and production
- **OpenStreetMap**: Free with rate limits
- **Google Gemini**: Pay-per-use (existing configuration)
- **Property APIs**: Varies by provider

## Security Notes

- Never commit API keys to version control
- Use `.env.local` for local development
- Use environment variables in production
- Rotate API keys regularly
- Monitor API usage to prevent quota overuse

## Testing the Integration

1. Start the application with API keys configured
2. Check the console for configuration status messages
3. Perform a natural language query
4. Verify real weather data is being used (check network tab in browser dev tools)
5. Compare results with and without API keys to see the difference

---

**Note**: The application is designed to work seamlessly whether APIs are configured or not, ensuring a smooth user experience regardless of setup complexity.
