import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Info,
  FileText,
  Trash2,
  Download,
  Upload,
  CheckCircle2,
  Clock
} from 'lucide-react';

function Settings() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('general'); // general, templates

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const result = await chrome.storage.local.get('mappingTemplates');
      const savedTemplates = result.mappingTemplates || {};
      setTemplates(Object.values(savedTemplates));
    } catch (err) {
      console.error('Error loading templates:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTemplate = async (templateId) => {
    if (!confirm('Delete this template permanently?')) {
      return;
    }

    try {
      const result = await chrome.storage.local.get('mappingTemplates');
      const existingTemplates = result.mappingTemplates || {};
      delete existingTemplates[templateId];
      await chrome.storage.local.set({ mappingTemplates: existingTemplates });
      setTemplates(Object.values(existingTemplates));
    } catch (err) {
      console.error('Error deleting template:', err);
      alert('Failed to delete template');
    }
  };

  const handleExportTemplate = (template) => {
    const dataStr = JSON.stringify(template, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${template.name.replace(/\s+/g, '_')}_mapping.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportTemplate = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const text = await file.text();
        const template = JSON.parse(text);

        if (!template.name || !template.mappings) {
          throw new Error('Invalid template format');
        }

        template.id = `template_${Date.now()}`;
        template.created = new Date().toISOString();

        const result = await chrome.storage.local.get('mappingTemplates');
        const existingTemplates = result.mappingTemplates || {};
        existingTemplates[template.id] = template;

        await chrome.storage.local.set({ mappingTemplates: existingTemplates });
        setTemplates(Object.values(existingTemplates));

        alert(`Template "${template.name}" imported successfully!`);
      } catch (err) {
        console.error('Error importing template:', err);
        alert('Failed to import template: ' + err.message);
      }
    };

    input.click();
  };

  const handleClearAllTemplates = async () => {
    if (!confirm('Delete ALL templates? This cannot be undone.')) {
      return;
    }

    try {
      await chrome.storage.local.set({ mappingTemplates: {} });
      setTemplates([]);
      alert('All templates deleted');
    } catch (err) {
      console.error('Error clearing templates:', err);
      alert('Failed to clear templates');
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
        <div className="flex items-center">
          <SettingsIcon className="w-6 h-6 text-gray-600 mr-3" />
          <h2 className="text-xl font-bold text-gray-900">
            Settings
          </h2>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 bg-gray-50">
        <div className="flex px-6">
          <button
            onClick={() => setActiveTab('general')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'general'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            General
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'templates'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Mapping Templates
            {templates.length > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
                {templates.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'general' && (
          <div className="p-6">
            {/* Version info */}
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="flex items-start">
                <Info className="w-5 h-5 text-gray-600 flex-shrink-0 mr-3 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-gray-900 mb-1">DHIMS2 Batch Uploader</p>
                  <p className="text-gray-600">Version 1.0.0</p>
                  <p className="text-gray-600 mt-2">
                    Chrome Extension for automated patient data upload to DHIMS2
                  </p>
                </div>
              </div>
            </div>

            {/* Features */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Features</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start">
                  <CheckCircle2 className="w-4 h-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Automatic API discovery from manual form submission</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle2 className="w-4 h-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Multi-sheet Excel workbook support</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle2 className="w-4 h-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Interactive field mapping with templates</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle2 className="w-4 h-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Data validation and preview</span>
                </li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'templates' && (
          <div className="p-6">
            {/* Actions */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={handleImportTemplate}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
              >
                <Upload className="w-4 h-4 mr-2" />
                Import Template
              </button>
              <button
                onClick={handleClearAllTemplates}
                disabled={templates.length === 0}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center ${
                  templates.length === 0
                    ? 'text-gray-400 bg-gray-100 cursor-not-allowed'
                    : 'text-red-700 bg-red-50 border border-red-200 hover:bg-red-100'
                }`}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Clear All
              </button>
            </div>

            {/* Templates list */}
            {loading && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
                <p className="text-sm text-gray-600 mt-3">Loading templates...</p>
              </div>
            )}

            {!loading && templates.length === 0 && (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-900">No templates saved</p>
                <p className="text-xs text-gray-600 mt-1">
                  Create templates from the Upload page or import existing ones
                </p>
              </div>
            )}

            {!loading && templates.length > 0 && (
              <div className="space-y-3">
                {templates
                  .sort((a, b) => new Date(b.lastUsed) - new Date(a.lastUsed))
                  .map((template) => (
                    <div
                      key={template.id}
                      className="bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-base font-semibold text-gray-900 truncate mb-2">
                            {template.name}
                          </h4>
                          <div className="flex flex-wrap gap-3 text-xs text-gray-600">
                            <span className="flex items-center">
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                              {template.metadata?.totalMapped || Object.keys(template.mappings || {}).length} fields
                            </span>
                            <span className="flex items-center">
                              <Clock className="w-3.5 h-3.5 mr-1" />
                              Created {new Date(template.created).toLocaleDateString()}
                            </span>
                            {template.lastUsed !== template.created && (
                              <span className="flex items-center text-blue-600">
                                Last used {new Date(template.lastUsed).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-1 ml-3">
                          <button
                            onClick={() => handleExportTemplate(template)}
                            className="p-2 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                            title="Export template"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteTemplate(template.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Delete template"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Settings;
