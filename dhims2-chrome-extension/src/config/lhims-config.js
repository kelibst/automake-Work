/**
 * LHIMS Configuration
 * Local Health Information Management System settings
 */

export const LHIMS_CONFIG = {
  // System Information
  systemName: 'LHIMS',
  displayName: 'Local Health Information Management System',

  // Base URL (local network)
  baseUrl: 'http://10.10.0.59/lhims_182/',

  // Authentication
  credentials: {
    username: 'sno-411',
    password: 'monamourd11'
  },

  // Storage keys (prefixed to avoid conflicts with DHIMS2)
  storageKeys: {
    config: 'lhims_config',
    discovered: 'lhims_discovered',
    endpoint: 'lhims_endpoint',
    fieldMappings: 'lhims_field_mappings',
    lastSync: 'lhims_last_sync'
  },

  // URL patterns for API interception
  urlPatterns: [
    'http://10.10.0.59/lhims_182/*',
    'http://10.10.0.59/lhims_182/api/*'
  ],

  // System-specific settings
  settings: {
    // Network timeout (local network should be faster)
    timeout: 5000, // 5 seconds

    // Rate limiting (requests per second)
    rateLimit: 3, // More lenient for local network

    // Retry attempts
    maxRetries: 3,

    // Batch size for uploads
    batchSize: 10
  }
};

/**
 * DHIMS2 Configuration (for comparison)
 */
export const DHIMS2_CONFIG = {
  systemName: 'DHIMS2',
  displayName: 'District Health Information Management System 2',

  baseUrl: 'https://events.chimgh.org/events/',

  storageKeys: {
    config: 'dhims2_config',
    discovered: 'dhims2_discovered',
    endpoint: 'dhims2_endpoint',
    fieldMappings: 'dhims2_field_mappings',
    lastSync: 'dhims2_last_sync'
  },

  urlPatterns: [
    'https://events.chimgh.org/events/*',
    'https://events.chimgh.org/events/api/*'
  ],

  settings: {
    timeout: 10000, // 10 seconds (internet connection)
    rateLimit: 2, // More conservative for external API
    maxRetries: 3,
    batchSize: 5
  }
};

/**
 * Get configuration for a specific system
 * @param {string} systemName - 'lhims' or 'dhims2'
 * @returns {Object} System configuration
 */
export function getSystemConfig(systemName) {
  const configs = {
    lhims: LHIMS_CONFIG,
    dhims2: DHIMS2_CONFIG
  };

  return configs[systemName.toLowerCase()] || null;
}

/**
 * Get all available systems
 * @returns {Array} List of system configurations
 */
export function getAllSystems() {
  return [
    DHIMS2_CONFIG,
    LHIMS_CONFIG
  ];
}

/**
 * Check if a URL belongs to a specific system
 * @param {string} url - URL to check
 * @param {string} systemName - System name to match against
 * @returns {boolean}
 */
export function isSystemUrl(url, systemName) {
  const config = getSystemConfig(systemName);
  if (!config) return false;

  return config.urlPatterns.some(pattern => {
    const regexPattern = pattern.replace(/\*/g, '.*');
    return new RegExp(regexPattern).test(url);
  });
}

/**
 * Detect which system a URL belongs to
 * @param {string} url - URL to analyze
 * @returns {string|null} System name or null if not recognized
 */
export function detectSystem(url) {
  if (isSystemUrl(url, 'lhims')) return 'lhims';
  if (isSystemUrl(url, 'dhims2')) return 'dhims2';
  return null;
}
