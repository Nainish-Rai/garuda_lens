// API Configuration for Real Data Integration
// Environment variables should be set in .env.local

export const API_CONFIG = {
  // WeatherAPI.com configuration
  weatherapi: {
    baseURL: "https://api.weatherapi.com/v1",
    apiKey: process.env.WEATHERAPI_KEY,
    defaultUnits: "metric",
  },

  // OpenStreetMap/Nominatim configuration
  nominatim: {
    baseURL: "https://nominatim.openstreetmap.org",
    userAgent: "ClimateGentrificationSentinel/1.0",
    format: "json",
    limit: 10,
  },

  // Overpass API for OSM data
  overpass: {
    baseURL: "https://overpass-api.de/api",
    timeout: 25,
  },

  // Property data API (configurable)
  property: {
    baseURL:
      process.env.PROPERTY_API_BASE_URL || "https://api.example-property.com",
    apiKey: process.env.PROPERTY_API_KEY,
    timeout: 10000,
  },

  // Rate limiting and error handling
  rateLimits: {
    weatherapi: 1000000, // requests per month for free tier
    nominatim: 1, // requests per second
    property: 100, // requests per hour
  },

  // Fallback and caching configuration
  cache: {
    wardDataTTL: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
    weatherDataTTL: 60 * 60 * 1000, // 1 hour
    priceDataTTL: 12 * 60 * 60 * 1000, // 12 hours
  },

  // API endpoint mappings for different cities
  cityEndpoints: {
    pune: {
      coords: { lat: 18.5204, lon: 73.8567 },
      osmId: 1652858, // Pune relation ID in OSM
      timezone: "Asia/Kolkata",
    },
    mumbai: {
      coords: { lat: 19.076, lon: 72.8777 },
      osmId: 1652359, // Mumbai relation ID in OSM
      timezone: "Asia/Kolkata",
    },
    delhi: {
      coords: { lat: 28.6139, lon: 77.209 },
      osmId: 65606, // Delhi relation ID in OSM
      timezone: "Asia/Kolkata",
    },
    bangalore: {
      coords: { lat: 12.9716, lon: 77.5946 },
      osmId: 1652681, // Bangalore relation ID in OSM
      timezone: "Asia/Kolkata",
    },
  },
};

// Helper function to check if API keys are configured
export function checkAPIKeysConfiguration() {
  const warnings = [];

  if (!API_CONFIG.weatherapi.apiKey) {
    warnings.push(
      "WeatherAPI.com API key not configured. Weather/climate data will use fallback values."
    );
  }

  if (
    !API_CONFIG.property.apiKey &&
    API_CONFIG.property.baseURL === "https://api.example-property.com"
  ) {
    warnings.push(
      "Property API not configured. Using simulated property price data."
    );
  }

  return {
    isFullyConfigured: warnings.length === 0,
    warnings,
  };
}

// Helper function to build API URLs with proper error handling
export function buildAPIURL(
  service: keyof typeof API_CONFIG,
  endpoint: string,
  params: Record<string, string> = {}
) {
  const config = API_CONFIG[service] as { baseURL?: string; apiKey?: string };
  if (!config.baseURL) {
    throw new Error(`Base URL not configured for service: ${service}`);
  }

  const url = new URL(endpoint, config.baseURL);

  // Add API key if available (only for WeatherAPI.com)
  if (service === "weatherapi" && config.apiKey) {
    params.key = config.apiKey;
  }

  // Add parameters to URL
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });

  return url.toString();
}

export default API_CONFIG;
