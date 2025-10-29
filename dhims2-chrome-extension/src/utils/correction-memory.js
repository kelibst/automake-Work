/**
 * Correction Memory Manager
 * Remembers user's diagnosis code corrections across sessions and files
 */

class CorrectionMemory {
  constructor(system = 'dhims2') {
    this.system = system;
    this.storageKey = `${system}_diagnosis_corrections`;
    this.statsKey = `${system}_correction_stats`;
    this.cache = null; // In-memory cache for performance
    this.cacheTimestamp = null;
    this.CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
    this.MAX_CORRECTIONS = 1000; // Maximum corrections to store
  }

  /**
   * Normalize diagnosis code for consistent storage
   * @param {string} code - Raw diagnosis code
   * @returns {string} Normalized code
   */
  normalizeCode(code) {
    if (!code) return '';
    return String(code).toUpperCase().trim().replace(/\s+/g, '');
  }

  /**
   * Extract ICD code from various formats
   * Handles: "I64", "I64 - Stroke", "Stroke (I64)", etc.
   * @param {string} value - Input value
   * @returns {string|null} Extracted code
   */
  extractCode(value) {
    if (!value) return null;

    const str = String(value).trim();

    // Try to extract code in parentheses: "Description (I64)"
    const parenMatch = str.match(/\(([A-Z]\d{2,3}\.?\d*)\)/i);
    if (parenMatch) {
      return this.normalizeCode(parenMatch[1]);
    }

    // Try to extract code with dash: "I64 - Description"
    const dashMatch = str.match(/^([A-Z]\d{2,3}\.?\d*)\s*-/i);
    if (dashMatch) {
      return this.normalizeCode(dashMatch[1]);
    }

    // Try plain code: "I64"
    const plainMatch = str.match(/^([A-Z]\d{2,3}\.?\d*)$/i);
    if (plainMatch) {
      return this.normalizeCode(plainMatch[1]);
    }

    // Return normalized as-is if no pattern matches
    return this.normalizeCode(str);
  }

  /**
   * Load corrections from storage with caching
   * @returns {Promise<Object>} Corrections object
   */
  async load() {
    // Check cache validity
    if (this.cache && this.cacheTimestamp) {
      const age = Date.now() - this.cacheTimestamp;
      if (age < this.CACHE_DURATION) {
        return this.cache;
      }
    }

    try {
      const stored = await chrome.storage.local.get(this.storageKey);
      this.cache = stored[this.storageKey] || {};
      this.cacheTimestamp = Date.now();
      return this.cache;
    } catch (error) {
      console.error('Error loading corrections from storage:', error);
      return {};
    }
  }

  /**
   * Save corrections to storage
   * @param {Object} corrections - Corrections object
   * @returns {Promise<void>}
   */
  async save(corrections) {
    try {
      await chrome.storage.local.set({ [this.storageKey]: corrections });
      this.cache = corrections;
      this.cacheTimestamp = Date.now();

      // Update statistics
      await this.updateStats();
    } catch (error) {
      console.error('Error saving corrections to storage:', error);
      throw error;
    }
  }

  /**
   * Get a correction for a specific code
   * @param {string} originalCode - Original diagnosis code
   * @returns {Promise<Object|null>} Correction object or null
   */
  async get(originalCode) {
    const normalized = this.extractCode(originalCode);
    if (!normalized) return null;

    const corrections = await this.load();
    return corrections[normalized] || null;
  }

  /**
   * Get all corrections
   * @returns {Promise<Object>} All corrections
   */
  async getAll() {
    return await this.load();
  }

  /**
   * Add or update a correction
   * @param {string} originalCode - Original diagnosis code
   * @param {string} correctedCode - Corrected diagnosis code
   * @param {string} type - Type: 'manual_correction', 'fuzzy_match', 'user_accepted'
   * @param {number} confidence - Confidence score (0-1)
   * @param {Object} metadata - Additional metadata
   * @returns {Promise<void>}
   */
  async add(originalCode, correctedCode, type = 'manual_correction', confidence = 1.0, metadata = {}) {
    const normalized = this.extractCode(originalCode);
    const normalizedCorrected = this.extractCode(correctedCode);

    if (!normalized || !normalizedCorrected) {
      console.warn('Invalid codes for correction:', { originalCode, correctedCode });
      return;
    }

    const corrections = await this.load();
    const existing = corrections[normalized];
    const now = new Date().toISOString();

    if (existing) {
      // Update existing correction
      corrections[normalized] = {
        ...existing,
        correctedTo: normalizedCorrected,
        type,
        confidence,
        frequency: existing.frequency + 1,
        lastUsed: now,
        updatedAt: now,
        ...metadata
      };

      console.log(`📝 Updated correction: ${normalized} → ${normalizedCorrected} (used ${corrections[normalized].frequency}x)`);
    } else {
      // Add new correction
      corrections[normalized] = {
        correctedTo: normalizedCorrected,
        type,
        confidence,
        frequency: 1,
        firstSeen: now,
        lastUsed: now,
        createdAt: now,
        ...metadata
      };

      console.log(`✨ New correction saved: ${normalized} → ${normalizedCorrected}`);
    }

    // Check if we need to prune
    if (Object.keys(corrections).length > this.MAX_CORRECTIONS) {
      await this.prune(corrections);
    } else {
      await this.save(corrections);
    }
  }

  /**
   * Increment usage frequency for a correction
   * @param {string} originalCode - Original diagnosis code
   * @returns {Promise<void>}
   */
  async incrementUsage(originalCode) {
    const normalized = this.extractCode(originalCode);
    if (!normalized) return;

    const corrections = await this.load();
    if (corrections[normalized]) {
      corrections[normalized].frequency += 1;
      corrections[normalized].lastUsed = new Date().toISOString();
      await this.save(corrections);
    }
  }

  /**
   * Remove a specific correction
   * @param {string} originalCode - Original diagnosis code
   * @returns {Promise<boolean>} True if removed, false if not found
   */
  async remove(originalCode) {
    const normalized = this.extractCode(originalCode);
    if (!normalized) return false;

    const corrections = await this.load();
    if (corrections[normalized]) {
      delete corrections[normalized];
      await this.save(corrections);
      console.log(`🗑️ Removed correction: ${normalized}`);
      return true;
    }
    return false;
  }

  /**
   * Clear all corrections
   * @returns {Promise<void>}
   */
  async clear() {
    await chrome.storage.local.remove([this.storageKey, this.statsKey]);
    this.cache = {};
    this.cacheTimestamp = Date.now();
    console.log(`🧹 Cleared all corrections for ${this.system}`);
  }

  /**
   * Prune least recently used corrections
   * @param {Object} corrections - Current corrections object
   * @returns {Promise<void>}
   */
  async prune(corrections) {
    const entries = Object.entries(corrections);

    // Sort by frequency (desc) then lastUsed (desc)
    entries.sort((a, b) => {
      if (b[1].frequency !== a[1].frequency) {
        return b[1].frequency - a[1].frequency;
      }
      return new Date(b[1].lastUsed) - new Date(a[1].lastUsed);
    });

    // Keep top 80% (MAX_CORRECTIONS * 0.8)
    const keepCount = Math.floor(this.MAX_CORRECTIONS * 0.8);
    const pruned = Object.fromEntries(entries.slice(0, keepCount));

    const removedCount = entries.length - keepCount;
    console.log(`✂️ Pruned ${removedCount} least used corrections`);

    await this.save(pruned);
  }

  /**
   * Update correction statistics
   * @returns {Promise<void>}
   */
  async updateStats() {
    try {
      const corrections = await this.load();
      const stats = {
        totalCorrections: Object.keys(corrections).length,
        lastUpdated: new Date().toISOString(),
        version: 1
      };

      await chrome.storage.local.set({ [this.statsKey]: stats });
    } catch (error) {
      console.error('Error updating stats:', error);
    }
  }

  /**
   * Get correction statistics
   * @returns {Promise<Object>} Statistics object
   */
  async getStats() {
    try {
      const result = await chrome.storage.local.get(this.statsKey);
      return result[this.statsKey] || {
        totalCorrections: 0,
        lastUpdated: null,
        version: 1
      };
    } catch (error) {
      console.error('Error getting stats:', error);
      return { totalCorrections: 0, lastUpdated: null, version: 1 };
    }
  }

  /**
   * Export corrections as JSON
   * @returns {Promise<string>} JSON string
   */
  async export() {
    const corrections = await this.load();
    const stats = await this.getStats();

    const exportData = {
      system: this.system,
      corrections,
      stats,
      exportedAt: new Date().toISOString(),
      version: 1
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Import corrections from JSON
   * @param {string} jsonString - JSON string to import
   * @param {boolean} merge - If true, merge with existing; if false, replace
   * @returns {Promise<Object>} Import result
   */
  async import(jsonString, merge = true) {
    try {
      const importData = JSON.parse(jsonString);

      if (!importData.corrections) {
        throw new Error('Invalid import data: missing corrections');
      }

      let corrections = importData.corrections;

      if (merge) {
        const existing = await this.load();

        // Merge: keep most recent for conflicts
        Object.entries(importData.corrections).forEach(([code, correction]) => {
          if (!existing[code] ||
              new Date(correction.lastUsed) > new Date(existing[code].lastUsed)) {
            corrections[code] = correction;
          } else {
            corrections[code] = existing[code];
          }
        });
      }

      await this.save(corrections);

      const result = {
        success: true,
        imported: Object.keys(importData.corrections).length,
        total: Object.keys(corrections).length,
        merged: merge
      };

      console.log(`📥 Imported ${result.imported} corrections (merge: ${merge})`);
      return result;
    } catch (error) {
      console.error('Error importing corrections:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get most frequently used corrections
   * @param {number} limit - Number of results
   * @returns {Promise<Array>} Top corrections
   */
  async getTopCorrections(limit = 10) {
    const corrections = await this.load();
    const entries = Object.entries(corrections);

    entries.sort((a, b) => b[1].frequency - a[1].frequency);

    return entries.slice(0, limit).map(([code, data]) => ({
      code,
      ...data
    }));
  }
}

export default CorrectionMemory;
