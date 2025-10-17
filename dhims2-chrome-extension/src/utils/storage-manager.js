/**
 * Storage Manager - Handles chrome.storage operations
 * Provides simple async/await interface for storage
 */

class StorageManager {
  /**
   * Get item from storage
   * @param {string} key - Storage key
   * @returns {Promise<any>} Stored value or null
   */
  static async get(key) {
    return new Promise((resolve) => {
      chrome.storage.local.get([key], (result) => {
        resolve(result[key] || null);
      });
    });
  }

  /**
   * Set item in storage
   * @param {string} key - Storage key
   * @param {any} value - Value to store
   * @returns {Promise<void>}
   */
  static async set(key, value) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [key]: value }, () => {
        resolve();
      });
    });
  }

  /**
   * Remove item from storage
   * @param {string} key - Storage key
   * @returns {Promise<void>}
   */
  static async remove(key) {
    return new Promise((resolve) => {
      chrome.storage.local.remove([key], () => {
        resolve();
      });
    });
  }

  /**
   * Clear all storage
   * @returns {Promise<void>}
   */
  static async clear() {
    return new Promise((resolve) => {
      chrome.storage.local.clear(() => {
        resolve();
      });
    });
  }

  /**
   * Get all items
   * @returns {Promise<Object>}
   */
  static async getAll() {
    return new Promise((resolve) => {
      chrome.storage.local.get(null, (items) => {
        resolve(items);
      });
    });
  }

  /**
   * Check if key exists
   * @param {string} key - Storage key
   * @returns {Promise<boolean>}
   */
  static async has(key) {
    const value = await this.get(key);
    return value !== null;
  }

  /**
   * Get multiple keys at once
   * @param {string[]} keys - Array of keys
   * @returns {Promise<Object>}
   */
  static async getMultiple(keys) {
    return new Promise((resolve) => {
      chrome.storage.local.get(keys, (result) => {
        resolve(result);
      });
    });
  }

  /**
   * Set multiple key-value pairs at once
   * @param {Object} items - Object with key-value pairs
   * @returns {Promise<void>}
   */
  static async setMultiple(items) {
    return new Promise((resolve) => {
      chrome.storage.local.set(items, () => {
        resolve();
      });
    });
  }

  // ========== Template Management Methods ==========

  /**
   * Get all mapping templates
   * @returns {Promise<Object>} Object with template IDs as keys
   */
  static async getMappingTemplates() {
    const templates = await this.get('mappingTemplates');
    return templates || {};
  }

  /**
   * Save a mapping template
   * @param {Object} template - Template object
   * @returns {Promise<void>}
   */
  static async saveMappingTemplate(template) {
    const templates = await this.getMappingTemplates();
    templates[template.id] = template;
    await this.set('mappingTemplates', templates);
  }

  /**
   * Get a specific mapping template by ID
   * @param {string} templateId - Template ID
   * @returns {Promise<Object|null>} Template object or null
   */
  static async getMappingTemplate(templateId) {
    const templates = await this.getMappingTemplates();
    return templates[templateId] || null;
  }

  /**
   * Delete a mapping template
   * @param {string} templateId - Template ID
   * @returns {Promise<void>}
   */
  static async deleteMappingTemplate(templateId) {
    const templates = await this.getMappingTemplates();
    delete templates[templateId];
    await this.set('mappingTemplates', templates);
  }

  /**
   * Update template's last used timestamp
   * @param {string} templateId - Template ID
   * @returns {Promise<void>}
   */
  static async updateTemplateLastUsed(templateId) {
    const template = await this.getMappingTemplate(templateId);
    if (template) {
      template.lastUsed = new Date().toISOString();
      await this.saveMappingTemplate(template);
    }
  }

  /**
   * Clear all mapping templates
   * @returns {Promise<void>}
   */
  static async clearMappingTemplates() {
    await this.set('mappingTemplates', {});
  }

  /**
   * Get template count
   * @returns {Promise<number>} Number of saved templates
   */
  static async getMappingTemplateCount() {
    const templates = await this.getMappingTemplates();
    return Object.keys(templates).length;
  }

  // ========== Debug Payload Capture Methods ==========

  /**
   * Get all captured payloads for debugging
   * @returns {Promise<Array>} Array of captured payload objects
   */
  static async getCapturedPayloads() {
    const payloads = await this.get('capturedPayloads');
    return payloads || [];
  }

  /**
   * Save a captured payload
   * @param {Object} payload - Payload object to save
   * @returns {Promise<void>}
   */
  static async saveCapturedPayload(payload) {
    const payloads = await this.getCapturedPayloads();

    // Add timestamp if not present
    if (!payload.timestamp) {
      payload.timestamp = new Date().toISOString();
    }

    // Prepend to array (newest first)
    payloads.unshift(payload);

    // Keep only last 20 payloads to avoid storage bloat
    const trimmedPayloads = payloads.slice(0, 20);

    await this.set('capturedPayloads', trimmedPayloads);
  }

  /**
   * Clear all captured payloads
   * @returns {Promise<void>}
   */
  static async clearCapturedPayloads() {
    await this.set('capturedPayloads', []);
  }

  /**
   * Get debug mode status
   * @returns {Promise<boolean>}
   */
  static async getDebugMode() {
    const debugMode = await this.get('debugMode');
    return debugMode === true;
  }

  /**
   * Set debug mode status
   * @param {boolean} enabled - Whether debug mode is enabled
   * @returns {Promise<void>}
   */
  static async setDebugMode(enabled) {
    await this.set('debugMode', enabled);
  }

  // ========== API Configuration Methods ==========

  /**
   * Get API configuration (discovered endpoints, headers, etc.)
   * @returns {Promise<Object|null>}
   */
  static async getApiConfiguration() {
    return await this.get('apiConfiguration');
  }

  /**
   * Save API configuration
   * @param {Object} config - API configuration object
   * @returns {Promise<void>}
   */
  static async saveApiConfiguration(config) {
    await this.set('apiConfiguration', config);
  }

  /**
   * Clear API configuration
   * @returns {Promise<void>}
   */
  static async clearApiConfiguration() {
    await this.remove('apiConfiguration');
  }
}

// Export convenience functions for common operations
export const getCapturedPayloads = () => StorageManager.getCapturedPayloads();
export const saveCapturedPayload = (payload) => StorageManager.saveCapturedPayload(payload);
export const clearCapturedPayloads = () => StorageManager.clearCapturedPayloads();
export const getDebugMode = () => StorageManager.getDebugMode();
export const setDebugMode = (enabled) => StorageManager.setDebugMode(enabled);
export const getApiConfiguration = () => StorageManager.getApiConfiguration();
export const saveApiConfiguration = (config) => StorageManager.saveApiConfiguration(config);
export const clearApiConfiguration = () => StorageManager.clearApiConfiguration();
export const getMappingTemplates = () => StorageManager.getMappingTemplates();
export const saveMappingTemplate = (template) => StorageManager.saveMappingTemplate(template);
export const getMappingTemplate = (id) => StorageManager.getMappingTemplate(id);
export const deleteMappingTemplate = (id) => StorageManager.deleteMappingTemplate(id);

export default StorageManager;
