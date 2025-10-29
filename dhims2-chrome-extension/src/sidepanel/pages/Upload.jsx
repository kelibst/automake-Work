import React, { useState, useEffect } from 'react';
import {
  Upload as UploadIcon,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Loader2
} from 'lucide-react';
import ExcelParser from '../../utils/excel-parser';
import FieldMapper from '../../utils/field-mapper';
import DataValidator from '../../utils/data-validator';
import DataCleaner from '../../utils/data-cleaner';
import ProgressTracker from '../components/ProgressTracker';
import CompletionScreen from '../components/CompletionScreen';
import ValidationResults from '../components/ValidationResults';
import DEFAULT_API_CONFIG from '../../config/default-api-config';

function Upload() {
  const [apiConfig, setApiConfig] = useState(DEFAULT_API_CONFIG);
  const [file, setFile] = useState(null);
  const [parsedData, setParsedData] = useState(null);
  const [mapping, setMapping] = useState(null);
  const [validation, setValidation] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [step, setStep] = useState('upload'); // upload, processing, results, uploading, completed

  // Upload state
  const [uploadStatus, setUploadStatus] = useState(null);
  const [uploadResults, setUploadResults] = useState(null);

  // Suggestion/Transformation acceptance state
  const [acceptedSuggestions, setAcceptedSuggestions] = useState({});
  const [rejectedSuggestions, setRejectedSuggestions] = useState({});
  const [acceptedTransformations, setAcceptedTransformations] = useState({});
  const [rejectedTransformations, setRejectedTransformations] = useState({});

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
        console.log('✅ Using discovered API config');
        setApiConfig(response.config);
      } else {
        console.log('ℹ️  Using default API config (no discovery needed)');
      }
    } catch (err) {
      console.error('Error loading API config:', err);
      console.log('ℹ️  Falling back to default API config');
    }
  };

  /**
   * Handle file selection - Start auto-processing
   */
  const handleFileSelect = async (event) => {
    const selectedFile = event.target.files[0];
    if (!selectedFile) return;

    setError(null);
    setStep('processing');

    try {
      console.log('📁 Parsing Excel file...');

      // 1. Parse Excel file
      const data = await ExcelParser.parseFile(selectedFile);
      setParsedData(data);
      setFile(selectedFile);

      console.log('📊 Excel parsed:', {
        records: data.records.length,
        headers: data.headers
      });

      // 2. Auto-detect field mapping
      const mapper = new FieldMapper(apiConfig);
      const autoMapping = mapper.autoDetectMapping(data.headers);
      setMapping(autoMapping);

      console.log('🗺️  Columns mapped:', {
        total: data.headers.length,
        mapped: autoMapping.totalMapped,
        unmapped: autoMapping.totalUnmapped
      });

      // 3. Clean data with transformations
      console.log('🧹 Cleaning data...');
      const cleaner = new DataCleaner();
      const cleanResults = data.records.map(record =>
        cleaner.cleanRow(record, apiConfig.fieldMappings)
      );

      // Extract cleaned records and track transformations
      const cleanedRecords = cleanResults.map(r => r.record);
      const allTransformations = cleanResults
        .map((r, i) => r.transformations.map(t => ({ ...t, rowNumber: i + 2 })))
        .flat();

      console.log('✨ Data cleaned:', {
        totalTransformations: allTransformations.length
      });

      // 4. Validate with fuzzy matching
      console.log('🔍 Running validation with fuzzy matching...');
      const dataValidation = await DataValidator.validateWithFuzzyMatching(
        cleanedRecords,
        autoMapping,
        mapper
      );

      // Add transformations to validation result
      dataValidation.transformations = allTransformations;

      setValidation(dataValidation);
      setStep('results');

      console.log('✅ Validation complete:', {
        total: dataValidation.totalRecords,
        valid: dataValidation.validRecords,
        invalid: dataValidation.invalidRecords,
        autoFixes: dataValidation.suggestions?.length || 0
      });

    } catch (err) {
      console.error('❌ Error processing file:', err);
      setError(err.message);
      setStep('upload');
    }
  };

  /**
   * Start batch upload with valid records
   */
  const handleStartUpload = async () => {
    if (!apiConfig || !parsedData || !validation || !mapping) return;

    setIsProcessing(true);
    try {
      // Get valid records from validation
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
   * Handle accepting a suggestion
   */
  const handleAcceptSuggestion = (suggestionId) => {
    setAcceptedSuggestions(prev => ({ ...prev, [suggestionId]: true }));
    setRejectedSuggestions(prev => {
      const newState = { ...prev };
      delete newState[suggestionId];
      return newState;
    });

    // Extract index from ID (format: "suggestion-0")
    const index = parseInt(suggestionId.split('-')[1]);
    console.log(`✅ Accepted suggestion ${index + 1}`);
  };

  /**
   * Handle rejecting a suggestion
   */
  const handleRejectSuggestion = (suggestionId) => {
    setRejectedSuggestions(prev => ({ ...prev, [suggestionId]: true }));
    setAcceptedSuggestions(prev => {
      const newState = { ...prev };
      delete newState[suggestionId];
      return newState;
    });

    // Extract index from ID (format: "suggestion-0")
    const index = parseInt(suggestionId.split('-')[1]);
    console.log(`❌ Rejected suggestion ${index + 1}`);

    // Move affected record to invalid list
    if (validation?.suggestions?.[index]) {
      const suggestion = validation.suggestions[index];
      // TODO: Update validation to move this record to invalid list
    }
  };

  /**
   * Handle accepting a transformation
   */
  const handleAcceptTransformation = (transformationId) => {
    setAcceptedTransformations(prev => ({ ...prev, [transformationId]: true }));
    setRejectedTransformations(prev => {
      const newState = { ...prev };
      delete newState[transformationId];
      return newState;
    });

    const index = parseInt(transformationId.split('-')[1]);
    console.log(`✅ Accepted transformation ${index + 1}`);
  };

  /**
   * Handle rejecting a transformation
   */
  const handleRejectTransformation = (transformationId) => {
    setRejectedTransformations(prev => ({ ...prev, [transformationId]: true }));
    setAcceptedTransformations(prev => {
      const newState = { ...prev };
      delete newState[transformationId];
      return newState;
    });

    const index = parseInt(transformationId.split('-')[1]);
    console.log(`❌ Rejected transformation ${index + 1}`);

    // Revert transformation in the actual data
    if (validation?.transformations?.[index]) {
      const transformation = validation.transformations[index];
      // TODO: Revert this transformation in validation data
    }
  };

  /**
   * Handle correcting an error in an invalid record
   */
  const handleCorrectError = async (rowNumber, fieldName, correctedValue, errorIndex) => {
    try {
      console.log(`🔧 Correcting error in row ${rowNumber}, field ${fieldName}:`, correctedValue);

      // Find the invalid record
      const invalidRecordIndex = validation.invalidRecordsList.findIndex(
        r => r.rowNumber === rowNumber
      );

      if (invalidRecordIndex === -1) {
        console.error('Invalid record not found');
        return;
      }

      const invalidRecord = validation.invalidRecordsList[invalidRecordIndex];

      // Get the Excel column name for this field
      const excelColumn = Object.keys(mapping.mapping).find(
        col => mapping.mapping[col] === fieldName
      );

      if (!excelColumn) {
        console.error('Excel column not found for field:', fieldName);
        return;
      }

      // Apply the correction to the record
      const correctedRecord = {
        ...invalidRecord.record,
        [excelColumn]: correctedValue
      };

      // Re-validate the corrected record
      const recordValidation = DataValidator.validateRecord(
        correctedRecord,
        mapping,
        rowNumber
      );

      if (recordValidation.valid) {
        // Record is now valid - move it from invalid to valid list
        const updatedValidation = {
          ...validation,
          validRecords: validation.validRecords + 1,
          invalidRecords: validation.invalidRecords - 1,
          validRecordsList: [
            ...validation.validRecordsList,
            { record: correctedRecord, rowNumber, warnings: recordValidation.warnings }
          ],
          invalidRecordsList: validation.invalidRecordsList.filter((_, i) => i !== invalidRecordIndex)
        };

        setValidation(updatedValidation);
        console.log(`✅ Row ${rowNumber} corrected and moved to valid list`);
      } else {
        // Still has errors - update the record with new value but keep in invalid list
        const updatedInvalidRecord = {
          ...invalidRecord,
          record: correctedRecord,
          errors: recordValidation.errors
        };

        const updatedInvalidList = [...validation.invalidRecordsList];
        updatedInvalidList[invalidRecordIndex] = updatedInvalidRecord;

        setValidation({
          ...validation,
          invalidRecordsList: updatedInvalidList
        });

        console.log(`⚠️ Row ${rowNumber} still has ${recordValidation.errors.length} error(s)`);
      }
    } catch (err) {
      console.error('Error correcting record:', err);
      setError(err.message);
    }
  };

  /**
   * Download invalid records as CSV
   */
  const handleDownloadInvalid = () => {
    if (!validation || !validation.invalidRecordsList) return;

    try {
      // Build CSV content
      const headers = parsedData.headers;
      const csvRows = [
        ['Row Number', ...headers, 'Errors'].join(',')
      ];

      validation.invalidRecordsList.forEach(inv => {
        const row = [
          inv.rowNumber,
          ...headers.map(h => {
            const val = inv.record[h] || '';
            return `"${String(val).replace(/"/g, '""')}"`;
          }),
          `"${inv.errors.map(e => e.message).join('; ')}"`
        ].join(',');
        csvRows.push(row);
      });

      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invalid-records-${Date.now()}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      console.log('📥 Downloaded invalid records CSV');
    } catch (err) {
      console.error('Error downloading CSV:', err);
      setError('Failed to download CSV file');
    }
  };

  /**
   * Reset and start over
   */
  const handleReset = () => {
    setFile(null);
    setParsedData(null);
    setMapping(null);
    setValidation(null);
    setError(null);
    setStep('upload');
    setUploadStatus(null);
    setUploadResults(null);
    setIsProcessing(false);
  };

  // Pause/Resume/Cancel handlers
  const handlePauseUpload = async () => {
    try {
      await chrome.runtime.sendMessage({ type: 'PAUSE_UPLOAD' });
    } catch (err) {
      console.error('Error pausing upload:', err);
    }
  };

  const handleResumeUpload = async () => {
    try {
      await chrome.runtime.sendMessage({ type: 'RESUME_UPLOAD' });
    } catch (err) {
      console.error('Error resuming upload:', err);
    }
  };

  const handleCancelUpload = async () => {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'CANCEL_UPLOAD' });
      if (response.success) {
        setStep('results');
        setUploadStatus(null);
      }
    } catch (err) {
      console.error('Error cancelling upload:', err);
    }
  };

  const handleDownloadFailed = () => {
    if (!uploadResults || !uploadResults.failedRecords) return;

    try {
      const headers = Object.keys(uploadResults.failedRecords[0]?.record || {});
      const csvRows = [
        ['Row Number', ...headers, 'Error'].join(','),
        ...uploadResults.failedRecords.map(fr =>
          [
            fr.rowNumber,
            ...headers.map(h => `"${String(fr.record[h] || '').replace(/"/g, '""')}"`),
            `"${fr.error}"`
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

  // Render upload step
  if (step === 'upload') {
    return (
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
          />
          <label htmlFor="file-upload" className="cursor-pointer">
            <FileSpreadsheet className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-900 mb-1">
              Click to upload Excel file
            </p>
            <p className="text-xs text-gray-500">
              .xlsx or .xls files only (max 10MB)
            </p>
          </label>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mr-2 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-900">Error</p>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Render processing step
  if (step === 'processing') {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Processing...</h2>
        <p className="text-sm text-gray-600 text-center max-w-md">
          Parsing Excel file, detecting columns, cleaning data, and validating records with fuzzy diagnosis matching...
        </p>
      </div>
    );
  }

  // Render validation results
  if (step === 'results') {
    return (
      <ValidationResults
        validation={validation}
        parsedData={parsedData}
        onUploadValid={handleStartUpload}
        onDownloadInvalid={handleDownloadInvalid}
        onCancel={handleReset}
        onAcceptSuggestion={handleAcceptSuggestion}
        onRejectSuggestion={handleRejectSuggestion}
        onAcceptTransformation={handleAcceptTransformation}
        onRejectTransformation={handleRejectTransformation}
        onCorrectError={handleCorrectError}
      />
    );
  }

  // Render uploading step
  if (step === 'uploading') {
    return (
      <div className="p-6">
        <ProgressTracker
          uploadStatus={uploadStatus}
          onPause={handlePauseUpload}
          onResume={handleResumeUpload}
          onCancel={handleCancelUpload}
        />
      </div>
    );
  }

  // Render completed step
  if (step === 'completed') {
    return (
      <div className="p-6">
        <CompletionScreen
          results={uploadResults}
          onDownloadFailed={handleDownloadFailed}
          onStartOver={handleReset}
        />
      </div>
    );
  }

  return null;
}

export default Upload;
