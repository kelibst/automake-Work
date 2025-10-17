import React, { useState, useEffect } from 'react';
import {
  Save,
  FolderOpen,
  Trash2,
  Download,
  Upload,
  Clock,
  FileText,
  CheckCircle2,
  X
} from 'lucide-react';

/**
 * MappingTemplateManager - Save, load, and manage mapping templates
 */
function MappingTemplateManager({
  onLoadTemplate,
  onClose,
  currentMapping,
  onSaveTemplate
}) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [error, setError] = useState(null);

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
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      alert('Please enter a template name');
      return;
    }

    if (!currentMapping || Object.keys(currentMapping).length === 0) {
      alert('No mappings to save');
      return;
    }

    try {
      const template = {
        id: `template_${Date.now()}`,
        name: templateName.trim(),
        created: new Date().toISOString(),
        lastUsed: new Date().toISOString(),
        mappings: currentMapping,
        metadata: {
          totalMapped: Object.keys(currentMapping).length
        }
      };

      // Load existing templates
      const result = await chrome.storage.local.get('mappingTemplates');
      const existingTemplates = result.mappingTemplates || {};

      // Add new template
      existingTemplates[template.id] = template;

      // Save back
      await chrome.storage.local.set({ mappingTemplates: existingTemplates });

      setTemplates(Object.values(existingTemplates));
      setTemplateName('');
      setSaveDialogOpen(false);

      alert(`Template "${template.name}" saved successfully!`);
    } catch (err) {
      console.error('Error saving template:', err);
      alert('Failed to save template: ' + err.message);
    }
  };

  const handleLoadTemplate = async (template) => {
    try {
      // Update last used timestamp
      const result = await chrome.storage.local.get('mappingTemplates');
      const existingTemplates = result.mappingTemplates || {};

      if (existingTemplates[template.id]) {
        existingTemplates[template.id].lastUsed = new Date().toISOString();
        await chrome.storage.local.set({ mappingTemplates: existingTemplates });
      }

      onLoadTemplate(template);
      onClose();
    } catch (err) {
      console.error('Error loading template:', err);
      alert('Failed to load template: ' + err.message);
    }
  };

  const handleDeleteTemplate = async (templateId) => {
    if (!confirm('Delete this template?')) {
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
      alert('Failed to delete template: ' + err.message);
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

        // Validate template structure
        if (!template.name || !template.mappings) {
          throw new Error('Invalid template format');
        }

        // Generate new ID
        template.id = `template_${Date.now()}`;
        template.created = new Date().toISOString();

        // Save template
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

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="bg-gray-50 border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <FolderOpen className="w-5 h-5 text-gray-600 mr-2" />
            <h3 className="text-base font-semibold text-gray-900">
              Mapping Templates
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="border-b border-gray-200 px-4 py-3 bg-white">
        <div className="flex gap-2">
          <button
            onClick={() => setSaveDialogOpen(true)}
            disabled={!currentMapping || Object.keys(currentMapping).length === 0}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors flex items-center justify-center ${
              !currentMapping || Object.keys(currentMapping).length === 0
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            <Save className="w-4 h-4 mr-2" />
            Save Current
          </button>
          <button
            onClick={handleImportTemplate}
            className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center"
          >
            <Upload className="w-4 h-4 mr-2" />
            Import
          </button>
        </div>
      </div>

      {/* Save dialog */}
      {saveDialogOpen && (
        <div className="border-b border-gray-200 px-4 py-3 bg-blue-50">
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Template Name
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="e.g., VRH Patient Records"
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <button
              onClick={handleSaveTemplate}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Save
            </button>
            <button
              onClick={() => {
                setSaveDialogOpen(false);
                setTemplateName('');
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Templates list */}
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
            <p className="text-sm text-gray-600 mt-3">Loading templates...</p>
          </div>
        )}

        {error && (
          <div className="p-4 m-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {!loading && !error && templates.length === 0 && (
          <div className="p-8 text-center">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-900">No templates yet</p>
            <p className="text-xs text-gray-600 mt-1">
              Save your first mapping template to reuse it later
            </p>
          </div>
        )}

        {!loading && !error && templates.length > 0 && (
          <div className="divide-y divide-gray-200">
            {templates
              .sort((a, b) => new Date(b.lastUsed) - new Date(a.lastUsed))
              .map((template) => (
                <div
                  key={template.id}
                  className="px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-gray-900 truncate">
                        {template.name}
                      </h4>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-600">
                        <span className="flex items-center">
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                          {template.metadata?.totalMapped || 0} fields
                        </span>
                        <span className="flex items-center">
                          <Clock className="w-3.5 h-3.5 mr-1" />
                          {new Date(template.lastUsed).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-1 ml-3">
                      <button
                        onClick={() => handleLoadTemplate(template)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Load template"
                      >
                        <FolderOpen className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleExportTemplate(template)}
                        className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                        title="Export template"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteTemplate(template.id)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
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
    </div>
  );
}

export default MappingTemplateManager;
