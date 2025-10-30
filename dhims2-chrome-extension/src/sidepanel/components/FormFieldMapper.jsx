import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, X, Download, Upload as UploadIcon } from 'lucide-react';

function FormFieldMapper({ excelHeaders, onSave, onCancel, existingTemplate = null, system = 'dhims2' }) {
  const [templateName, setTemplateName] = useState(existingTemplate?.name || '');
  const [fields, setFields] = useState(existingTemplate?.fields || []);

  // Field type options
  const fieldTypes = [
    { value: 'text', label: 'Text Input' },
    { value: 'dropdown', label: 'Dropdown/Select' },
    { value: 'date', label: 'Date Picker' },
    { value: 'searchable', label: 'Searchable/Autocomplete' },
    { value: 'radio', label: 'Radio Button' },
    { value: 'checkbox', label: 'Checkbox' }
  ];

  // Add a new field mapping
  const handleAddField = () => {
    setFields([
      ...fields,
      {
        formField: '',
        selector: '',
        type: 'text',
        excelColumn: excelHeaders[0] || '',
        required: false,
        fuzzyMatch: true
      }
    ]);
  };

  // Remove a field mapping
  const handleRemoveField = (index) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  // Update a specific field
  const handleUpdateField = (index, key, value) => {
    const updatedFields = [...fields];
    updatedFields[index][key] = value;
    setFields(updatedFields);
  };

  // Save template
  const handleSave = () => {
    if (!templateName.trim()) {
      alert('Please enter a template name');
      return;
    }

    if (fields.length === 0) {
      alert('Please add at least one field mapping');
      return;
    }

    // Validate all fields
    for (let i = 0; i < fields.length; i++) {
      const field = fields[i];
      if (!field.formField.trim()) {
        alert(`Field ${i + 1}: Please enter a form field name`);
        return;
      }
      if (!field.selector.trim()) {
        alert(`Field ${i + 1}: Please enter a CSS selector`);
        return;
      }
      if (!field.excelColumn) {
        alert(`Field ${i + 1}: Please select an Excel column`);
        return;
      }
    }

    const template = {
      id: existingTemplate?.id || `template_${Date.now()}`,
      name: templateName,
      system,
      created: existingTemplate?.created || new Date().toISOString(),
      lastUsed: new Date().toISOString(),
      fields
    };

    onSave(template);
  };

  // Export template as JSON
  const handleExportTemplate = () => {
    const template = {
      name: templateName,
      system,
      fields
    };

    const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${templateName || 'template'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import template from JSON
  const handleImportTemplate = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target.result);
        setTemplateName(imported.name || '');
        setFields(imported.fields || []);
        alert('Template imported successfully!');
      } catch (error) {
        alert('Failed to import template: ' + error.message);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-blue-600 text-white px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">
            {existingTemplate ? 'Edit Template' : 'Create New Template'}
          </h2>
          <button
            onClick={onCancel}
            className="p-1 hover:bg-blue-700 rounded"
          >
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Template Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Template Name *
            </label>
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="e.g., Patient Entry Form"
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Import/Export */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handleExportTemplate}
              className="flex items-center space-x-2 px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm"
            >
              <Download size={16} />
              <span>Export Template</span>
            </button>
            <label className="flex items-center space-x-2 px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm cursor-pointer">
              <UploadIcon size={16} />
              <span>Import Template</span>
              <input
                type="file"
                accept=".json"
                onChange={handleImportTemplate}
                className="hidden"
              />
            </label>
          </div>

          {/* Field Mappings */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-medium text-gray-900">Field Mappings</h3>
              <button
                onClick={handleAddField}
                className="flex items-center space-x-1 px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
              >
                <Plus size={16} />
                <span>Add Field</span>
              </button>
            </div>

            {fields.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded border-2 border-dashed border-gray-300">
                <p className="text-gray-500 mb-3">No field mappings yet</p>
                <button
                  onClick={handleAddField}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Add First Field
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {fields.map((field, index) => (
                  <div
                    key={index}
                    className="border border-gray-200 rounded-lg p-4 bg-gray-50 space-y-3"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">
                        Field {index + 1}
                      </span>
                      <button
                        onClick={() => handleRemoveField(index)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {/* Form Field Name */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Form Field Name *
                        </label>
                        <input
                          type="text"
                          value={field.formField}
                          onChange={(e) => handleUpdateField(index, 'formField', e.target.value)}
                          placeholder="e.g., Patient Number"
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>

                      {/* CSS Selector */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          CSS Selector *
                        </label>
                        <input
                          type="text"
                          value={field.selector}
                          onChange={(e) => handleUpdateField(index, 'selector', e.target.value)}
                          placeholder="e.g., input[data-test='form-field-h0Ef6ykTpNB'] input"
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                        />
                      </div>

                      {/* Field Type */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Field Type *
                        </label>
                        <select
                          value={field.type}
                          onChange={(e) => handleUpdateField(index, 'type', e.target.value)}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          {fieldTypes.map(type => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Excel Column */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Excel Column *
                        </label>
                        <select
                          value={field.excelColumn}
                          onChange={(e) => handleUpdateField(index, 'excelColumn', e.target.value)}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          {excelHeaders.map(header => (
                            <option key={header} value={header}>
                              {header}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Checkboxes */}
                    <div className="flex items-center space-x-4 pt-2">
                      <label className="flex items-center space-x-2 text-sm">
                        <input
                          type="checkbox"
                          checked={field.required}
                          onChange={(e) => handleUpdateField(index, 'required', e.target.checked)}
                          className="rounded border-gray-300"
                        />
                        <span className="text-gray-700">Required</span>
                      </label>
                      {(field.type === 'dropdown' || field.type === 'select') && (
                        <label className="flex items-center space-x-2 text-sm">
                          <input
                            type="checkbox"
                            checked={field.fuzzyMatch}
                            onChange={(e) => handleUpdateField(index, 'fuzzyMatch', e.target.checked)}
                            className="rounded border-gray-300"
                          />
                          <span className="text-gray-700">Enable Fuzzy Matching</span>
                        </label>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Helper Guide */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 mb-2">💡 How to find CSS Selectors:</h4>
            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li>Open the DHIMS2 form in your browser</li>
              <li>Right-click on the form field → "Inspect"</li>
              <li>Copy the selector from the attributes (e.g., <code className="bg-blue-100 px-1">data-test</code> or <code className="bg-blue-100 px-1">id</code>)</li>
              <li>For text inputs: <code className="bg-blue-100 px-1">input[data-test='field-name'] input</code></li>
              <li>For dropdowns: <code className="bg-blue-100 px-1">select#fieldId</code> or <code className="bg-blue-100 px-1">input#WZ5rS7QuECT</code></li>
            </ol>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex items-center justify-end space-x-3 border-t">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            <Save size={16} />
            <span>Save Template</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default FormFieldMapper;
