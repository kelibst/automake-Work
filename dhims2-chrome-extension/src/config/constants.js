/**
 * Application Constants
 * Shared constants for the Health Data Automation Extension
 */

// Supported Systems
export const SYSTEMS = {
  DHIMS2: 'dhims2',
  LHIMS: 'lhims'
};

// System Display Names
export const SYSTEM_NAMES = {
  [SYSTEMS.DHIMS2]: 'DHIMS2',
  [SYSTEMS.LHIMS]: 'LHIMS'
};

// Storage Keys (Global)
export const STORAGE_KEYS = {
  ACTIVE_SYSTEM: 'active_system',
  SYSTEMS_CONFIG: 'systems_config',
  USER_PREFERENCES: 'user_preferences'
};

// Upload Status
export const UPLOAD_STATUS = {
  IDLE: 'idle',
  VALIDATING: 'validating',
  UPLOADING: 'uploading',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  FAILED: 'failed'
};

// API Discovery Status
export const DISCOVERY_STATUS = {
  NOT_STARTED: 'not_started',
  LISTENING: 'listening',
  CAPTURED: 'captured',
  ANALYZING: 'analyzing',
  COMPLETED: 'completed',
  FAILED: 'failed'
};

// Field Types
export const FIELD_TYPES = {
  TEXT: 'text',
  NUMBER: 'number',
  DATE: 'date',
  DROPDOWN: 'dropdown',
  RADIO: 'radio',
  CHECKBOX: 'checkbox',
  SEARCHABLE: 'searchable',
  TEXTAREA: 'textarea'
};

// Date Formats
export const DATE_FORMATS = {
  ISO: 'YYYY-MM-DD',
  DISPLAY: 'MMM DD, YYYY',
  FULL: 'YYYY-MM-DD HH:mm:ss',
  TIME: 'HH:mm:ss'
};

// Validation Rules
export const VALIDATION = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_FILE_TYPES: ['.xlsx', '.xls', '.csv'],
  MIN_RECORDS: 1,
  MAX_RECORDS: 1000
};

// Notification Types
export const NOTIFICATION_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info'
};

// Error Codes
export const ERROR_CODES = {
  // Network Errors
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  API_ERROR: 'API_ERROR',

  // Validation Errors
  INVALID_FILE: 'INVALID_FILE',
  INVALID_DATA: 'INVALID_DATA',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',

  // Configuration Errors
  NO_CONFIG: 'NO_CONFIG',
  INVALID_CONFIG: 'INVALID_CONFIG',
  DISCOVERY_NOT_COMPLETE: 'DISCOVERY_NOT_COMPLETE',

  // System Errors
  UNKNOWN_SYSTEM: 'UNKNOWN_SYSTEM',
  SYSTEM_NOT_AVAILABLE: 'SYSTEM_NOT_AVAILABLE'
};

// Error Messages
export const ERROR_MESSAGES = {
  [ERROR_CODES.NETWORK_ERROR]: 'Network connection failed. Please check your internet connection.',
  [ERROR_CODES.TIMEOUT_ERROR]: 'Request timed out. Please try again.',
  [ERROR_CODES.API_ERROR]: 'API request failed. Please contact support.',
  [ERROR_CODES.INVALID_FILE]: 'Invalid file format. Please upload a valid Excel or CSV file.',
  [ERROR_CODES.INVALID_DATA]: 'Invalid data format. Please check your data and try again.',
  [ERROR_CODES.MISSING_REQUIRED_FIELD]: 'Required field is missing. Please complete all required fields.',
  [ERROR_CODES.NO_CONFIG]: 'System not configured. Please complete API discovery first.',
  [ERROR_CODES.INVALID_CONFIG]: 'Invalid configuration. Please re-run API discovery.',
  [ERROR_CODES.DISCOVERY_NOT_COMPLETE]: 'API discovery not complete. Please submit a test record.',
  [ERROR_CODES.UNKNOWN_SYSTEM]: 'Unknown system. Please select a valid system.',
  [ERROR_CODES.SYSTEM_NOT_AVAILABLE]: 'System not available. Please check your network connection.'
};

// UI Constants
export const UI = {
  ANIMATION_DURATION: 300, // milliseconds
  DEBOUNCE_DELAY: 500, // milliseconds
  TOAST_DURATION: 3000, // milliseconds
  PROGRESS_UPDATE_INTERVAL: 100 // milliseconds
};

// Export all constants as a single object (optional)
export default {
  SYSTEMS,
  SYSTEM_NAMES,
  STORAGE_KEYS,
  UPLOAD_STATUS,
  DISCOVERY_STATUS,
  FIELD_TYPES,
  DATE_FORMATS,
  VALIDATION,
  NOTIFICATION_TYPES,
  ERROR_CODES,
  ERROR_MESSAGES,
  UI
};
