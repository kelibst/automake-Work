import React, { useState } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Download, ChevronDown, ChevronUp, Upload as UploadIcon, Wand2 } from 'lucide-react';

/**
 * Comprehensive validation results display
 * Shows valid/invalid records with detailed errors and recommendations
 */
export default function ValidationResults({
  validation,
  parsedData,
  onUploadValid,
  onDownloadInvalid,
  onCancel
}) {
  const [expandedSections, setExpandedSections] = useState({
    autoFixed: true,
    cleaned: true,
    invalid: true,
    valid: false
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  if (!validation) return null;

  return (
    <div className="p-6 space-y-6">
      {/* Summary Card */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Validation Results</h2>

        <div className="grid grid-cols-3 gap-4 mb-4">
          {/* Valid Records */}
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-green-900">Valid</span>
            </div>
            <p className="text-3xl font-bold text-green-700">{validation.validRecords}</p>
            {validation.suggestions?.length > 0 && (
              <p className="text-xs text-green-600 mt-1">
                ({validation.suggestions.length} auto-fixed)
              </p>
            )}
          </div>

          {/* Invalid Records */}
          <div className="bg-red-50 rounded-lg p-4 border border-red-200">
            <div className="flex items-center gap-2 mb-2">
              <XCircle className="w-5 h-5 text-red-600" />
              <span className="text-sm font-medium text-red-900">Invalid</span>
            </div>
            <p className="text-3xl font-bold text-red-700">{validation.invalidRecords}</p>
          </div>

          {/* Warnings */}
          <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-900">Warnings</span>
            </div>
            <p className="text-3xl font-bold text-yellow-700">{validation.warnings?.length || 0}</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Data Quality</span>
            <span>{Math.round((validation.validRecords / validation.totalRecords) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-green-600 h-2 rounded-full transition-all"
              style={{ width: `${(validation.validRecords / validation.totalRecords) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Auto-Fixed Diagnosis Codes Section */}
      {validation.suggestions && validation.suggestions.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <button
            onClick={() => toggleSection('autoFixed')}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-blue-600" />
              <div className="text-left">
                <h3 className="font-semibold text-gray-900">
                  Auto-Fixed Diagnosis Codes ({validation.suggestions.length})
                </h3>
                <p className="text-sm text-gray-600">
                  These codes were automatically matched to valid ICD-10 codes
                </p>
              </div>
            </div>
            {expandedSections.autoFixed ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>

          {expandedSections.autoFixed && (
            <div className="px-6 pb-4 space-y-3 max-h-96 overflow-y-auto">
              {validation.suggestions.map((sug, index) => (
                <div key={index} className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm font-medium text-gray-700">Row {sug.rowNumber}</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      sug.confidence >= 0.9 ? 'bg-green-100 text-green-700' :
                      sug.confidence >= 0.8 ? 'bg-blue-100 text-blue-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {Math.round(sug.confidence * 100)}% match
                    </span>
                  </div>

                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 w-20">Original:</span>
                      <span className="font-mono text-red-600">{sug.original}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 w-20">Fixed to:</span>
                      <span className="font-mono text-green-600">{sug.suggested}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-gray-500 w-20">Name:</span>
                      <span className="text-gray-700 flex-1">{sug.suggestedName || 'N/A'}</span>
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
          )}
        </div>
      )}

      {/* Auto-Cleaned Fields Section */}
      {validation.transformations && validation.transformations.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <button
            onClick={() => toggleSection('cleaned')}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Wand2 className="w-5 h-5 text-purple-600" />
              <div className="text-left">
                <h3 className="font-semibold text-gray-900">
                  Auto-Cleaned Fields ({validation.transformations.length})
                </h3>
                <p className="text-sm text-gray-600">
                  These values were automatically cleaned and standardized
                </p>
              </div>
            </div>
            {expandedSections.cleaned ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>

          {expandedSections.cleaned && (
            <div className="px-6 pb-4 space-y-2 max-h-96 overflow-y-auto">
              {validation.transformations.map((t, i) => (
                <div key={i} className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                  <div className="text-sm">
                    <span className="font-medium text-gray-700">
                      Row {t.rowNumber} - {t.field}:
                    </span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-mono text-sm text-red-600 line-through">
                        {String(t.original)}
                      </span>
                      <span className="text-gray-400">→</span>
                      <span className="font-mono text-sm text-green-600 font-medium">
                        {String(t.cleaned)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Invalid Records Section */}
      {validation.invalidRecordsList && validation.invalidRecordsList.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <button
            onClick={() => toggleSection('invalid')}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <XCircle className="w-5 h-5 text-red-600" />
              <div className="text-left">
                <h3 className="font-semibold text-gray-900">
                  Invalid Records ({validation.invalidRecordsList.length})
                </h3>
                <p className="text-sm text-gray-600">
                  These records have errors and need to be fixed
                </p>
              </div>
            </div>
            {expandedSections.invalid ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>

          {expandedSections.invalid && (
            <div className="px-6 pb-4 space-y-3 max-h-96 overflow-y-auto">
              {validation.invalidRecordsList.map((invalidRecord, index) => (
                <InvalidRecordCard
                  key={index}
                  record={invalidRecord}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Valid Records Preview */}
      {validation.validRecordsList && validation.validRecordsList.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <button
            onClick={() => toggleSection('valid')}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <div className="text-left">
                <h3 className="font-semibold text-gray-900">
                  Valid Records ({validation.validRecordsList.length})
                </h3>
                <p className="text-sm text-gray-600">
                  Ready to upload
                </p>
              </div>
            </div>
            {expandedSections.valid ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>

          {expandedSections.valid && (
            <div className="px-6 pb-4">
              <div className="text-sm text-gray-600 mb-2">
                Showing first 5 of {validation.validRecordsList.length} valid records
              </div>
              <div className="space-y-2">
                {validation.validRecordsList.slice(0, 5).map((validRecord, index) => (
                  <div key={index} className="p-3 bg-green-50 border border-green-100 rounded">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-green-900">
                        Row {validRecord.rowNumber}
                      </span>
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    </div>
                    {validRecord.record.patientNumber && (
                      <p className="text-xs text-green-700 mt-1">
                        Patient: {validRecord.record.patientNumber}
                      </p>
                    )}
                  </div>
                ))}
                {validation.validRecordsList.length > 5 && (
                  <p className="text-xs text-gray-500 text-center py-2">
                    ... and {validation.validRecordsList.length - 5} more
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 sticky bottom-0 bg-gray-50 py-4 border-t border-gray-200">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>

        {validation.invalidRecords > 0 && (
          <button
            onClick={onDownloadInvalid}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
          >
            <Download className="w-4 h-4" />
            Download Invalid Records ({validation.invalidRecords})
          </button>
        )}

        {validation.validRecords > 0 && (
          <button
            onClick={onUploadValid}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors shadow-sm"
          >
            <UploadIcon className="w-4 h-4" />
            Upload {validation.validRecords} Valid Record{validation.validRecords > 1 ? 's' : ''}
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Invalid Record Card Component
 * Shows a single invalid record with errors and recommendations
 */
function InvalidRecordCard({ record }) {
  return (
    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
      <div className="flex items-start gap-3">
        <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start mb-2">
            <span className="text-sm font-medium text-red-900">
              Row {record.rowNumber}
            </span>
            <span className="text-xs text-red-600 bg-red-100 px-2 py-0.5 rounded">
              {record.errors?.length || 0} error{record.errors?.length > 1 ? 's' : ''}
            </span>
          </div>

          {/* Patient Info if available */}
          {record.record && (
            <div className="text-xs text-gray-700 mb-3">
              {record.record.patientNumber && (
                <p><span className="font-medium">Patient No:</span> {record.record.patientNumber}</p>
              )}
              {record.record.patientName && (
                <p><span className="font-medium">Name:</span> {record.record.patientName}</p>
              )}
            </div>
          )}

          {/* Errors List */}
          {record.errors && record.errors.length > 0 && (
            <div className="space-y-3">
              {record.errors.map((error, index) => (
                <div key={index} className="bg-white border border-red-200 rounded p-3">
                  <p className="text-sm font-medium text-red-900 mb-1">
                    {error.field || 'Field'}: {error.message}
                  </p>

                  {error.value && (
                    <p className="text-xs text-gray-600 mb-2">
                      Current value: <span className="font-mono">{String(error.value)}</span>
                    </p>
                  )}

                  {/* Recommendation */}
                  {error.recommendation && (
                    <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
                      <p className="text-xs font-medium text-blue-900 mb-1">💡 Recommendation:</p>

                      {error.recommendation.pattern && (
                        <p className="text-xs text-blue-700 mb-1">
                          <strong>Format:</strong> {error.recommendation.pattern}
                        </p>
                      )}

                      {error.recommendation.suggestedFix && (
                        <p className="text-xs text-green-700 mb-1">
                          <strong>Suggested:</strong> <span className="font-mono">{error.recommendation.suggestedFix}</span>
                        </p>
                      )}

                      {error.recommendation.examples && error.recommendation.examples.length > 0 && (
                        <p className="text-xs text-blue-700 mb-1">
                          <strong>Examples:</strong> {error.recommendation.examples.join(', ')}
                        </p>
                      )}

                      {error.recommendation.validValues && (
                        <p className="text-xs text-blue-700 mb-1">
                          <strong>Valid values:</strong> {error.recommendation.validValues.join(', ')}
                        </p>
                      )}

                      {error.recommendation.commonMappings && (
                        <details className="mt-1">
                          <summary className="text-xs text-blue-600 cursor-pointer">Common mappings</summary>
                          <div className="mt-1 pl-2 text-xs text-gray-600">
                            {Object.entries(error.recommendation.commonMappings).map(([key, val]) => (
                              <div key={key}>• "{key}" → "{val}"</div>
                            ))}
                          </div>
                        </details>
                      )}

                      {error.recommendation.note && (
                        <p className="text-xs text-gray-600 mt-1 italic">
                          {error.recommendation.note}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
