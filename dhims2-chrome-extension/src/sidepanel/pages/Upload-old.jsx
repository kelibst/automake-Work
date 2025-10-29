import React, { useState, useEffect } from 'react';
import {
  Upload as UploadIcon,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Play,
  Pause,
  XCircle,
  FileText,
  FolderOpen,
  ArrowLeft,
  Download
} from 'lucide-react';
import ExcelParser from '../../utils/excel-parser';
import FieldMapper from '../../utils/field-mapper';
import DataValidator from '../../utils/data-validator';
import WorkbookSheetSelector from '../components/WorkbookSheetSelector';
import FieldMappingEditor from '../components/FieldMappingEditor';
import MappingPreview from '../components/MappingPreview';
import MappingTemplateManager from '../components/MappingTemplateManager';
import ProgressTracker from '../components/ProgressTracker';
import CompletionScreen from '../components/CompletionScreen';
import DEFAULT_API_CONFIG from '../../config/default-api-config';

function Upload() {
  const [apiConfig, setApiConfig] = useState(DEFAULT_API_CONFIG);
  const [file, setFile] = useState(null);
  const [selectedSheet, setSelectedSheet] = useState(null);
  const [parsedData, setParsedData] = useState(null);
  const [mapping, setMapping] = useState(null);
  const [userMapping, setUserMapping] = useState({});
  const [validation, setValidation] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [step, setStep] = useState('upload'); // upload, sheet, mapping, preview, ready, uploading, completed
  const [showTemplateManager, setShowTemplateManager] = useState(false);

  // Upload state
  const [uploadStatus, setUploadStatus] = useState(null);
  const [uploadResults, setUploadResults] = useState(null);

  // Load API config on mount
  useEffect(() => {
    loadApiConfig();
  }, []);

  // Listen for upload progress updates
  useEffect(() => {
    const messageListener = (message) => {
      if (message.type === 'UPLOAD_PROGRESS') {
        setUploadStatus(message.data);
      } else if (message.type === 'UPLOAD_COMPLETE') {
        setUploadResults(message.data);
        setStep('completed');
      }
    };

    chrome.runtime.onMessage.addListener(messageListener);
    return () => chrome.runtime.onMessage.removeListener(messageListener);
  }, []);

  const loadApiConfig = async () => {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_API_CONFIG' });
      if (response.success && response.config) {
        // Use discovered config if available, otherwise keep default
        console.log('✅ Using discovered API config');
        setApiConfig(response.config);
      } else {
        // Keep using default config
        console.log('ℹ️ Using default API config (no discovery needed)');
      }
    } catch (err) {
      console.error('Error loading API config:', err);
      console.log('ℹ️ Falling back to default API config');
      // Keep using default config (already set in initial state)
    }
  };

  /**
   * Handle file selection
   */
  const handleFileSelect = async (event) => {
    const selectedFile = event.target.files[0];
    if (!selectedFile) return;

    setError(null);
    setIsProcessing(true);

    try {
      // Validate file
      const fileValidation = ExcelParser.validateFile(selectedFile);
      if (!fileValidation.valid) {
        throw new Error(fileValidation.errors.join(', '));
      }

      setFile(selectedFile);

      // Check if file has multiple sheets
      const allSheets = await ExcelParser.parseAllSheets(selectedFile);

      if (allSheets.totalSheets > 1) {
        // Multiple sheets - go to sheet selection
        setStep('sheet');
      } else {
        // Single sheet - parse and continue
        const data = await ExcelParser.parseFile(selectedFile);
        setParsedData(data);
        setSelectedSheet(data.selectedSheet);
        setStep('mapping');
      }
    } catch (err) {
      console.error('Error processing file:', err);
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Handle sheet selection
   */
  const handleSheetSelect = async (sheetName) => {
    setSelectedSheet(sheetName);
  };

  const handleSheetConfirm = async () => {
    if (!selectedSheet || !file) return;

    setIsProcessing(true);
    try {
      const data = await ExcelParser.parseFile(file, selectedSheet);
      console.log('📊 Parsed data from sheet:', data);
      setParsedData(data);
      setStep('mapping');
    } catch (err) {
      console.error('Error parsing sheet:', err);
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Handle mapping changes
   */
  const handleMappingChange = (newMapping) => {
    setUserMapping(newMapping);
  };

  /**
   * Continue to preview after mapping
   */
  const handleContinueToPreview = async () => {
    if (!apiConfig) return;

    setIsProcessing(true);
    try {
      const mapper = new FieldMapper(apiConfig);
      const fieldMapping = mapper.createCustomMapping(userMapping, parsedData.headers);
      console.log('🗺️  Field mapping:', fieldMapping);
      setMapping(fieldMapping);

      // Validate data with fuzzy diagnosis matching
      const dataValidation = await DataValidator.validateWithFuzzyMatching(
        parsedData.records,
        fieldMapping,
        mapper
      );
      console.log('✅ Validation with fuzzy matching:', dataValidation);
      setValidation(dataValidation);

      setStep('preview');
    } catch (err) {
      console.error('Error during validation:', err);
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Load template from template manager
   */
  const handleLoadTemplate = (template) => {
    if (template.mappings) {
      setUserMapping(template.mappings);
    }
  };

  /**
   * Save current mapping as template
   */
  const handleSaveTemplate = () => {
    setShowTemplateManager(true);
  };

  /**
   * Reset and start over
   */
  const handleReset = () => {
    setFile(null);
    setSelectedSheet(null);
    setParsedData(null);
    setMapping(null);
    setUserMapping({});
    setValidation(null);
    setError(null);
    setStep('upload');
    setShowTemplateManager(false);
    setUploadStatus(null);
    setUploadResults(null);
  };

  /**
   * Start batch upload
   */
  const handleStartUpload = async () => {
    if (!apiConfig || !parsedData || !validation || !mapping) return;

    setIsProcessing(true);
    try {
      // Get valid records from validation - these already have auto-fixed diagnosis codes
      const validRecords = validation.validRecordsList?.map(v => v.record) || [];

      if (validRecords.length === 0) {
        throw new Error('No valid records to upload');
      }

      // Transform records from Excel columns to DHIMS field names
      const mapper = new FieldMapper(apiConfig);
      const transformedRecords = validRecords.map((record, index) => {
        const transformed = {};

        // Map each Excel column to DHIMS field name
        Object.entries(mapping.mapping || {}).forEach(([excelColumn, dhimsFieldName]) => {
          if (record[excelColumn] !== undefined && record[excelColumn] !== null) {
            transformed[dhimsFieldName] = record[excelColumn];
          }
        });

        // Preserve row number for tracking
        transformed._rowNumber = record._rowNumber || index + 2;

        return transformed;
      });

      console.log('📤 Starting upload:', {
        total: transformedRecords.length,
        withAutoFixes: validation.suggestions?.length || 0,
        sampleRecord: transformedRecords[0]
      });

      // Send start upload message
      const response = await chrome.runtime.sendMessage({
        type: 'START_BATCH_UPLOAD',
        apiConfig: apiConfig,
        records: transformedRecords
      });

      if (response.success) {
        setStep('uploading');
        setError(null);
      } else {
        throw new Error(response.error || 'Failed to start upload');
      }
    } catch (err) {
      console.error('Error starting upload:', err);
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Pause upload
   */
  const handlePauseUpload = async () => {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'PAUSE_UPLOAD' });
      if (!response.success) {
        console.error('Failed to pause upload:', response.error);
      }
    } catch (err) {
      console.error('Error pausing upload:', err);
    }
  };

  /**
   * Resume upload
   */
  const handleResumeUpload = async () => {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'RESUME_UPLOAD' });
      if (!response.success) {
        console.error('Failed to resume upload:', response.error);
      }
    } catch (err) {
      console.error('Error resuming upload:', err);
    }
  };

  /**
   * Cancel upload
   */
  const handleCancelUpload = async () => {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'CANCEL_UPLOAD' });
      if (response.success) {
        setStep('ready');
        setUploadStatus(null);
      }
    } catch (err) {
      console.error('Error cancelling upload:', err);
    }
  };

  /**
   * Download failed records as CSV
   */
  const handleDownloadFailed = () => {
    if (!uploadResults || !uploadResults.failedRecords) return;

    try {
      // Convert failed records to CSV
      const headers = Object.keys(uploadResults.failedRecords[0]?.record || {});
      const csvRows = [
        ['Row Number', ...headers, 'Error'].join(','),
        ...uploadResults.failedRecords.map(fr =>
          [
            fr.rowNumber,
            ...headers.map(h => JSON.stringify(fr.record[h] || '')),
            JSON.stringify(fr.error)
          ].join(',')
        )
      ];

      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `failed-records-${Date.now()}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading failed records:', err);
      setError('Failed to download CSV file');
    }
  };

  /**
   * Render sheet selection step
   */
  const renderSheetStep = () => (
    <div className="p-6">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-gray-900 mb-1">
          Select Sheet
        </h2>
        <p className="text-sm text-gray-600">
          {file?.name} contains multiple sheets
        </p>
      </div>

      <WorkbookSheetSelector
        file={file}
        selectedSheet={selectedSheet}
        onSheetSelect={handleSheetSelect}
      />

      <div className="flex gap-2 mt-4">
        <button
          onClick={handleReset}
          className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          <ArrowLeft className="w-4 h-4 inline mr-2" />
          Back
        </button>
        <button
          onClick={handleSheetConfirm}
          disabled={!selectedSheet || isProcessing}
          className={`flex-1 px-4 py-2 text-sm font-medium text-white rounded-lg ${
            selectedSheet && !isProcessing
              ? 'bg-blue-600 hover:bg-blue-700'
              : 'bg-gray-300 cursor-not-allowed'
          }`}
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 inline mr-2 animate-spin" />
              Loading...
            </>
          ) : (
            'Continue'
          )}
        </button>
      </div>
    </div>
  );

  /**
   * Render field mapping step
   */
  const renderMappingStep = () => {
    if (showTemplateManager) {
      return (
        <MappingTemplateManager
          currentMapping={userMapping}
          onLoadTemplate={handleLoadTemplate}
          onClose={() => setShowTemplateManager(false)}
        />
      );
    }

    const mapper = new FieldMapper(apiConfig);
    const dhimsFields = mapper.getDHIMSFields();
    const autoMapping = mapper.createMapping(parsedData.headers);

    return (
      <div className="flex flex-col h-full">
        <div className="px-3 py-2 border-b border-gray-200 bg-gray-50 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-bold text-gray-900 truncate">
                Map Fields
              </h2>
              <p className="text-xs text-gray-600 truncate">
                {file?.name} • {parsedData?.totalRecords} records
              </p>
            </div>
            <button
              onClick={() => setShowTemplateManager(true)}
              className="ml-2 px-2 py-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 transition-colors flex items-center flex-shrink-0"
            >
              <FolderOpen className="w-3 h-3 mr-1" />
              Templates
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden min-h-0">
          <FieldMappingEditor
            excelHeaders={parsedData.headers}
            dhimsFields={dhimsFields}
            initialMapping={autoMapping}
            onMappingChange={handleMappingChange}
            onSaveTemplate={handleSaveTemplate}
          />
        </div>

        <div className="px-3 py-2 border-t border-gray-200 bg-white flex-shrink-0">
          <div className="flex gap-2">
            <button
              onClick={() => setStep('sheet')}
              className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
            >
              <ArrowLeft className="w-3 h-3 inline mr-1" />
              Back
            </button>
            <button
              onClick={handleContinueToPreview}
              disabled={Object.keys(userMapping).length === 0}
              className={`flex-1 px-3 py-1.5 text-xs font-medium text-white rounded ${
                Object.keys(userMapping).length > 0
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-gray-300 cursor-not-allowed'
              }`}
            >
              Preview & Validate
            </button>
          </div>
        </div>
      </div>
    );
  };

  /**
   * Render file upload step
   */
  const renderUploadStep = () => (
    <div className="p-6">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4">
          <UploadIcon className="w-10 h-10 text-blue-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          Upload Excel File
        </h2>
        <p className="text-sm text-gray-600">
          Select an Excel file with patient records
        </p>
      </div>

      {/* API Config Status */}
      {apiConfig && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center">
              <CheckCircle2 className="w-4 h-4 text-green-600 mr-2" />
              <span className="text-green-900 font-medium">
                API Configuration Ready
              </span>
            </div>
            <span className="text-xs text-green-700">
              {apiConfig.discovered && apiConfig.timestamp ? 'Discovered' : 'Default'}
            </span>
          </div>
          <p className="text-xs text-green-700 mt-1 ml-6">
            Endpoint: {apiConfig.endpoint?.url?.split('/').slice(-2).join('/')}
          </p>
        </div>
      )}

      {/* File upload area */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
        <input
          type="file"
          id="file-upload"
          accept=".xlsx,.xls"
          onChange={handleFileSelect}
          className="hidden"
          disabled={isProcessing}
        />
        <label
          htmlFor="file-upload"
          className="cursor-pointer"
        >
          <FileSpreadsheet className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-900 mb-1">
            Click to upload Excel file
          </p>
          <p className="text-xs text-gray-500">
            .xlsx or .xls files only (max 10MB)
          </p>
        </label>
      </div>

      {isProcessing && (
        <div className="mt-4 flex items-center justify-center text-blue-600">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          <span className="text-sm">Processing file...</span>
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mr-2 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-900">Error</p>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-6 bg-gray-50 rounded-lg p-4">
        <h3 className="font-medium text-gray-900 mb-2 text-sm">Requirements:</h3>
        <ul className="space-y-1 text-sm text-gray-700">
          <li className="flex items-start">
            <span className="text-blue-600 mr-2">•</span>
            <span>First row must contain column headers</span>
          </li>
          <li className="flex items-start">
            <span className="text-blue-600 mr-2">•</span>
            <span>Each row represents one patient record</span>
          </li>
          <li className="flex items-start">
            <span className="text-blue-600 mr-2">•</span>
            <span>Required fields: Patient Name, Age, Gender, etc.</span>
          </li>
        </ul>
      </div>
    </div>
  );

  /**
   * Render data preview step
   */
  const renderPreviewStep = () => (
    <div className="p-6">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-gray-900 mb-1">
          Data Preview
        </h2>
        <p className="text-sm text-gray-600">
          {parsedData?.totalRecords} records loaded from {file?.name}
        </p>
      </div>

      {/* Validation Summary */}
      {validation && (
        <div className={`mb-4 p-4 rounded-lg border ${
          validation.canProceed
            ? 'bg-green-50 border-green-200'
            : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-start">
            {validation.canProceed ? (
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mr-2 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mr-2 mt-0.5" />
            )}
            <div className="flex-1">
              <p className="text-sm font-medium mb-2">
                {validation.canProceed
                  ? '✅ All records are valid'
                  : `❌ ${validation.invalidRecords} invalid records`
                }
              </p>
              <div className="text-xs space-y-1">
                <p>Total: {validation.totalRecords} | Valid: {validation.validRecords} | Invalid: {validation.invalidRecords}</p>
                {validation.warnings.length > 0 && (
                  <p className="text-yellow-700">⚠️  {validation.warnings.length} warnings</p>
                )}
              </div>
            </div>
          </div>

          {/* Show errors */}
          {validation.errors.length > 0 && (
            <div className="mt-3 max-h-32 overflow-y-auto">
              <p className="text-xs font-medium text-red-900 mb-1">Errors:</p>
              <ul className="text-xs text-red-700 space-y-0.5">
                {validation.errors.slice(0, 5).map((err, i) => (
                  <li key={i}>• {err}</li>
                ))}
                {validation.errors.length > 5 && (
                  <li>... and {validation.errors.length - 5} more errors</li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Auto-Fixed Diagnosis Codes */}
      {validation?.suggestions && validation.suggestions.length > 0 && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start mb-3">
            <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0 mr-2 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900 mb-1">
                ✅ Auto-Fixed Diagnosis Codes ({validation.suggestions.length})
              </p>
              <p className="text-xs text-blue-700">
                The following diagnosis codes were automatically matched to similar codes in DHIS2.
                Please review these changes.
              </p>
            </div>
          </div>

          <div className="space-y-3 max-h-64 overflow-y-auto">
            {validation.suggestions.map((sug, index) => (
              <div key={index} className="p-3 bg-white border border-blue-100 rounded text-xs">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-medium text-gray-700">Row {sug.rowNumber}</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    sug.confidence >= 0.9 ? 'bg-green-100 text-green-700' :
                    sug.confidence >= 0.8 ? 'bg-blue-100 text-blue-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {Math.round(sug.confidence * 100)}% match
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center">
                    <span className="text-gray-500 w-20">Original:</span>
                    <span className="font-mono text-red-600">{sug.original}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-gray-500 w-20">Using:</span>
                    <span className="font-mono text-green-600">{sug.suggested}</span>
                  </div>
                  <div className="flex items-start">
                    <span className="text-gray-500 w-20">Name:</span>
                    <span className="text-gray-700 flex-1">{sug.suggestedName}</span>
                  </div>
                </div>

                {sug.alternatives && sug.alternatives.length > 0 && (
                  <details className="mt-2">
                    <summary className="text-xs text-blue-600 cursor-pointer hover:text-blue-700">
                      View {sug.alternatives.length} alternative{sug.alternatives.length > 1 ? 's' : ''}
                    </summary>
                    <div className="mt-2 pl-4 space-y-1">
                      {sug.alternatives.map((alt, i) => (
                        <div key={i} className="text-xs text-gray-600">
                          • {alt.code}: {alt.name} ({Math.round(alt.similarity * 100)}%)
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Field Mapping Summary */}
      {mapping && (
        <div className="mb-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
            <p className="text-sm font-medium text-blue-900 mb-2">
              Field Mapping: {mapping.totalMapped} / {parsedData.headers.length} columns mapped
            </p>
            {mapping.unmapped.length > 0 && (
              <p className="text-xs text-blue-700">
                ⚠️  Unmapped: {mapping.unmapped.join(', ')}
              </p>
            )}
          </div>

          {/* Show mapping preview */}
          <MappingPreview
            records={parsedData.records}
            mapping={mapping.mapping}
            fieldMapper={new FieldMapper(apiConfig)}
          />
        </div>
      )}

      {/* Sample Data */}
      <div className="mb-4">
        <p className="text-sm font-medium text-gray-700 mb-2">Sample Records:</p>
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto max-h-48">
            <table className="min-w-full text-xs">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  {parsedData?.headers.slice(0, 5).map((header, i) => (
                    <th key={i} className="px-3 py-2 text-left font-medium text-gray-700 border-b">
                      {header}
                    </th>
                  ))}
                  {parsedData?.headers.length > 5 && (
                    <th className="px-3 py-2 text-left font-medium text-gray-500 border-b">
                      ...
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {parsedData?.records.slice(0, 3).map((record, i) => (
                  <tr key={i} className="border-b hover:bg-gray-50">
                    {parsedData.headers.slice(0, 5).map((header, j) => (
                      <td key={j} className="px-3 py-2 text-gray-600">
                        {String(record[header] || '').substring(0, 30)}
                      </td>
                    ))}
                    {parsedData.headers.length > 5 && (
                      <td className="px-3 py-2 text-gray-400">...</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => setStep('mapping')}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          <ArrowLeft className="w-4 h-4 inline mr-2" />
          Edit Mapping
        </button>
        <button
          onClick={handleReset}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onClick={() => setStep('ready')}
          disabled={!validation?.canProceed}
          className={`flex-1 px-4 py-2 text-sm font-medium text-white rounded-lg ${
            validation?.canProceed
              ? 'bg-blue-600 hover:bg-blue-700'
              : 'bg-gray-300 cursor-not-allowed'
          }`}
        >
          Continue to Upload
        </button>
      </div>
    </div>
  );

  /**
   * Render ready to upload step
   */
  const renderReadyStep = () => (
    <div className="p-6">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
          <CheckCircle2 className="w-10 h-10 text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          Ready to Upload
        </h2>
        <p className="text-sm text-gray-600">
          {validation?.validRecords} records will be uploaded to DHIMS2
        </p>
      </div>

      {/* Upload Summary */}
      <div className="bg-gray-50 rounded-lg p-4 mb-4">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">File:</span>
            <span className="font-medium text-gray-900">{file?.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Total Records:</span>
            <span className="font-medium text-gray-900">{validation?.validRecords}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Endpoint:</span>
            <span className="font-mono text-xs text-gray-700">
              {apiConfig?.endpoint?.baseUrl?.split('/api/')[1]}
            </span>
          </div>
        </div>
      </div>

      {/* Warning */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
        <div className="flex items-start">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mr-2 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-yellow-900">Important</p>
            <p className="text-xs text-yellow-700 mt-1">
              Make sure you have reviewed the auto-fixed diagnosis codes and validated all data before uploading.
              The upload process cannot be undone.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start">
            <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mr-2 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => setStep('preview')}
          className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Back
        </button>
        <button
          onClick={handleStartUpload}
          disabled={isProcessing}
          className={`flex-1 px-4 py-2 text-sm font-medium text-white rounded-lg ${
            isProcessing
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-700'
          }`}
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 inline mr-2 animate-spin" />
              Starting...
            </>
          ) : (
            <>
              <Play className="w-4 h-4 inline mr-2" />
              Start Upload
            </>
          )}
        </button>
      </div>
    </div>
  );

  /**
   * Render uploading step with progress tracker
   */
  const renderUploadingStep = () => (
    <div className="p-6">
      <ProgressTracker
        uploadStatus={uploadStatus}
        onPause={handlePauseUpload}
        onResume={handleResumeUpload}
        onCancel={handleCancelUpload}
      />
    </div>
  );

  /**
   * Render completed step with results
   */
  const renderCompletedStep = () => (
    <div className="p-6">
      <CompletionScreen
        results={uploadResults}
        onDownloadFailed={handleDownloadFailed}
        onStartOver={handleReset}
      />
    </div>
  );

  // Render based on current step
  if (step === 'sheet' && file) {
    return renderSheetStep();
  }

  if (step === 'mapping' && parsedData) {
    return renderMappingStep();
  }

  if (step === 'preview' && parsedData) {
    return renderPreviewStep();
  }

  if (step === 'ready' && validation) {
    return renderReadyStep();
  }

  if (step === 'uploading') {
    return renderUploadingStep();
  }

  if (step === 'completed') {
    return renderCompletedStep();
  }

  return renderUploadStep();
}

export default Upload;
