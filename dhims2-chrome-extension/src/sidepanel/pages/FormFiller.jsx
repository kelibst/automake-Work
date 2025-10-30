import React, { useState, useEffect } from 'react';
import { Upload, Table, Settings, Play, Pause, SkipForward, SkipBack, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import ExcelParser from '../../utils/excel-parser';
import StorageManager from '../../utils/storage-manager';
import FormFieldMapper from '../components/FormFieldMapper';

function FormFiller() {
  // Step management
  const [currentStep, setCurrentStep] = useState(1); // 1: Upload, 2: Map, 3: Fill

  // File and data state
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [parsedData, setParsedData] = useState(null);
  const [selectedSheet, setSelectedSheet] = useState(null);

  // Template and mapping state
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [fieldMapping, setFieldMapping] = useState(null);
  const [showTemplateCreator, setShowTemplateCreator] = useState(false);
  const [activeSystem, setActiveSystem] = useState('dhims2');

  // Row navigation state
  const [selectedRow, setSelectedRow] = useState(0);
  const [totalRows, setTotalRows] = useState(0);

  // Fill state
  const [isFilling, setIsFilling] = useState(false);
  const [autoFillMode, setAutoFillMode] = useState(false);
  const [fillProgress, setFillProgress] = useState(null);
  const [fillErrors, setFillErrors] = useState([]);
  const [filledRows, setFilledRows] = useState(new Set());

  // Load templates on mount
  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const savedTemplates = await StorageManager.getFormTemplates(activeSystem);
      setTemplates(savedTemplates || []);
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  // Handle template save
  const handleTemplateSave = async (template) => {
    try {
      await StorageManager.saveFormTemplate(template, activeSystem);
      await loadTemplates();
      setShowTemplateCreator(false);

      // Auto-select the newly created/edited template
      setSelectedTemplate(template);
      setFieldMapping(template.fields);
      setCurrentStep(3);

      alert('Template saved successfully!');
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Failed to save template: ' + error.message);
    }
  };

  // Handle file upload
  const handleFileUpload = async (event) => {
    const uploadedFile = event.target.files[0];
    if (!uploadedFile) return;

    try {
      // Validate file
      const validation = ExcelParser.validateFile(uploadedFile);
      if (!validation.valid) {
        alert(validation.error);
        return;
      }

      // Parse all sheets
      const result = await ExcelParser.parseAllSheets(uploadedFile);
      setFile(uploadedFile);
      setFileName(result.fileName);
      setParsedData(result);

      // Auto-select first sheet if only one exists
      if (result.availableSheets.length === 1) {
        handleSheetSelect(result.availableSheets[0]);
      }
    } catch (error) {
      console.error('Error parsing file:', error);
      alert('Failed to parse Excel file: ' + error.message);
    }
  };

  // Handle sheet selection
  const handleSheetSelect = async (sheetName) => {
    try {
      const result = await ExcelParser.parseFile(file, sheetName);
      setSelectedSheet(sheetName);
      setParsedData(result);
      setTotalRows(result.records.length);
      setSelectedRow(0);
    } catch (error) {
      console.error('Error parsing sheet:', error);
      alert('Failed to parse sheet: ' + error.message);
    }
  };

  // Handle template selection
  const handleTemplateSelect = (templateId) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplate(template);
      setFieldMapping(template.fields);
      setCurrentStep(3); // Move to fill step
    }
  };

  // Navigate to previous row
  const handlePreviousRow = () => {
    if (selectedRow > 0) {
      setSelectedRow(selectedRow - 1);
    }
  };

  // Navigate to next row
  const handleNextRow = () => {
    if (selectedRow < totalRows - 1) {
      setSelectedRow(selectedRow + 1);
    }
  };

  // Jump to specific row
  const handleJumpToRow = (rowNumber) => {
    const index = parseInt(rowNumber) - 1;
    if (index >= 0 && index < totalRows) {
      setSelectedRow(index);
    }
  };

  // Fill current row
  const handleFillForm = async () => {
    if (!fieldMapping || !parsedData || !parsedData.records[selectedRow]) {
      alert('No data or mapping available');
      return;
    }

    setIsFilling(true);
    setFillProgress({ current: 0, total: fieldMapping.length, currentField: '' });
    setFillErrors([]);

    try {
      // Get active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab) {
        throw new Error('No active tab found');
      }

      // Send fill form message to content script
      const response = await chrome.tabs.sendMessage(tab.id, {
        type: 'FILL_FORM',
        mapping: fieldMapping,
        rowData: parsedData.records[selectedRow],
        rowNumber: selectedRow + 1
      });

      if (response.success) {
        // Mark row as filled
        const newFilledRows = new Set(filledRows);
        newFilledRows.add(selectedRow);
        setFilledRows(newFilledRows);

        // Show success message
        alert('Form filled successfully! Please review and submit.');

        // Auto-advance to next row if not on last row
        if (selectedRow < totalRows - 1) {
          setTimeout(() => {
            handleNextRow();
          }, 1000);
        }
      } else {
        throw new Error(response.error || 'Form filling failed');
      }
    } catch (error) {
      console.error('Error filling form:', error);
      alert('Failed to fill form: ' + error.message);
    } finally {
      setIsFilling(false);
      setFillProgress(null);
    }
  };

  // Start auto-fill mode
  const handleStartAutoFill = async () => {
    setAutoFillMode(true);
    // TODO: Implement auto-fill loop
    alert('Auto-fill mode coming soon!');
    setAutoFillMode(false);
  };

  // Get current row data
  const getCurrentRowData = () => {
    if (!parsedData || !parsedData.records[selectedRow]) return null;
    return parsedData.records[selectedRow];
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Form Auto-Fill</h1>
          <p className="text-sm text-gray-600 mt-1">
            Upload Excel, map fields once, then automatically fill forms
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center space-x-2">
          <div className={`flex items-center space-x-2 px-3 py-1 rounded ${currentStep >= 1 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400'}`}>
            <Upload size={16} />
            <span className="text-sm font-medium">Upload</span>
          </div>
          <div className="w-8 h-0.5 bg-gray-300" />
          <div className={`flex items-center space-x-2 px-3 py-1 rounded ${currentStep >= 2 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400'}`}>
            <Settings size={16} />
            <span className="text-sm font-medium">Map</span>
          </div>
          <div className="w-8 h-0.5 bg-gray-300" />
          <div className={`flex items-center space-x-2 px-3 py-1 rounded ${currentStep >= 3 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400'}`}>
            <Play size={16} />
            <span className="text-sm font-medium">Fill</span>
          </div>
        </div>
      </div>

      {/* Step 1: Upload Excel */}
      {currentStep === 1 && (
        <div className="space-y-4">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-12">
            <div className="flex flex-col items-center space-y-4">
              <Upload size={48} className="text-gray-400" />
              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900">Upload Excel File</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Upload your patient data Excel file to get started
                </p>
              </div>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer"
              >
                Choose File
              </label>
            </div>
          </div>

          {/* Sheet selection */}
          {parsedData && parsedData.availableSheets && (
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Select Sheet</h3>
              <div className="grid grid-cols-2 gap-2">
                {parsedData.availableSheets.map(sheet => (
                  <button
                    key={sheet}
                    onClick={() => handleSheetSelect(sheet)}
                    className={`px-4 py-2 rounded border ${
                      selectedSheet === sheet
                        ? 'bg-blue-50 border-blue-500 text-blue-700'
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {sheet}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Preview and next button */}
          {parsedData && selectedSheet && (
            <div className="space-y-4">
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-900">Data Preview</h3>
                  <span className="text-sm text-gray-600">{totalRows} records</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        {parsedData.headers.map((header, index) => (
                          <th key={index} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {parsedData.records.slice(0, 3).map((record, rowIndex) => (
                        <tr key={rowIndex}>
                          {parsedData.headers.map((header, colIndex) => (
                            <td key={colIndex} className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">
                              {record[header] || '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <button
                onClick={() => setCurrentStep(2)}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Next: Map Fields
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Select or create template */}
      {currentStep === 2 && (
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Select Field Mapping Template</h3>

            {templates.length > 0 ? (
              <div className="space-y-2">
                {templates.map(template => (
                  <div
                    key={template.id}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleTemplateSelect(template.id)}
                  >
                    <div>
                      <h4 className="font-medium text-gray-900">{template.name}</h4>
                      <p className="text-sm text-gray-500">
                        {template.fields.length} fields mapped • {template.system.toUpperCase()}
                      </p>
                    </div>
                    <button className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200">
                      Use Template
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">No templates found</p>
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-gray-200">
              <button
                onClick={() => {
                  if (!parsedData || !parsedData.headers) {
                    alert('Please upload an Excel file first');
                    return;
                  }
                  setShowTemplateCreator(true);
                }}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Create New Template
              </button>
            </div>
          </div>

          <button
            onClick={() => setCurrentStep(1)}
            className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            Back to Upload
          </button>
        </div>
      )}

      {/* Step 3: Fill forms */}
      {currentStep === 3 && (
        <div className="space-y-4">
          {/* Row navigation */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Row Navigation</h3>
              <span className="text-sm text-gray-600">
                Row {selectedRow + 1} of {totalRows}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handlePreviousRow}
                disabled={selectedRow === 0}
                className="p-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <SkipBack size={20} />
              </button>

              <input
                type="number"
                min="1"
                max={totalRows}
                value={selectedRow + 1}
                onChange={(e) => handleJumpToRow(e.target.value)}
                className="w-20 px-3 py-2 border border-gray-300 rounded text-center"
              />

              <button
                onClick={handleNextRow}
                disabled={selectedRow === totalRows - 1}
                className="p-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <SkipForward size={20} />
              </button>

              <div className="flex-1" />

              {filledRows.has(selectedRow) && (
                <span className="flex items-center space-x-1 text-green-600">
                  <CheckCircle size={16} />
                  <span className="text-sm">Filled</span>
                </span>
              )}
            </div>
          </div>

          {/* Current row data preview */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Current Row Data</h3>
            <div className="space-y-2">
              {getCurrentRowData() && fieldMapping && fieldMapping.slice(0, 5).map((field, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{field.formField}:</span>
                  <span className="font-medium text-gray-900">
                    {getCurrentRowData()[field.excelColumn] || '-'}
                  </span>
                </div>
              ))}
              {fieldMapping && fieldMapping.length > 5 && (
                <p className="text-xs text-gray-500 text-center">
                  ...and {fieldMapping.length - 5} more fields
                </p>
              )}
            </div>
          </div>

          {/* Fill controls */}
          <div className="space-y-2">
            <button
              onClick={handleFillForm}
              disabled={isFilling}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isFilling ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  <span>Filling Form...</span>
                </>
              ) : (
                <>
                  <Play size={20} />
                  <span>Fill Form</span>
                </>
              )}
            </button>

            <button
              onClick={handleStartAutoFill}
              disabled={autoFillMode}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              Auto-Fill All Rows (Coming Soon)
            </button>
          </div>

          {/* Progress indicator */}
          {fillProgress && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-900">Filling form...</span>
                <span className="text-sm text-blue-700">
                  {fillProgress.current} / {fillProgress.total} fields
                </span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(fillProgress.current / fillProgress.total) * 100}%` }}
                />
              </div>
              {fillProgress.currentField && (
                <p className="text-xs text-blue-700 mt-2">
                  Current: {fillProgress.currentField}
                </p>
              )}
            </div>
          )}

          <button
            onClick={() => setCurrentStep(2)}
            className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            Back to Template Selection
          </button>
        </div>
      )}

      {/* Template Creator Modal */}
      {showTemplateCreator && (
        <FormFieldMapper
          excelHeaders={parsedData?.headers || []}
          onSave={handleTemplateSave}
          onCancel={() => setShowTemplateCreator(false)}
          system={activeSystem}
        />
      )}
    </div>
  );
}

export default FormFiller;
