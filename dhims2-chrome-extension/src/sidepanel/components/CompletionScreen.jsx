import React from 'react';
import { CheckCircle2, XCircle, Download, RotateCcw } from 'lucide-react';

/**
 * Upload completion screen with detailed results and export options
 * Shows summary statistics, error list, and allows downloading failed records
 */
export default function CompletionScreen({
  results,
  onDownloadFailed,
  onStartOver
}) {
  if (!results) {
    return null;
  }

  const {
    total,
    success,
    failed,
    successRecords,
    failedRecords,
    errors
  } = results;

  const successRate = Math.round((success / total) * 100);

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <div className={`rounded-lg shadow-sm border p-6 ${
        failed === 0
          ? 'bg-green-50 border-green-200'
          : 'bg-yellow-50 border-yellow-200'
      }`}>
        <div className="flex items-start gap-4">
          {failed === 0 ? (
            <CheckCircle2 className="w-12 h-12 text-green-600 flex-shrink-0" />
          ) : (
            <XCircle className="w-12 h-12 text-yellow-600 flex-shrink-0" />
          )}
          <div className="flex-1">
            <h2 className={`text-2xl font-bold mb-2 ${
              failed === 0 ? 'text-green-900' : 'text-yellow-900'
            }`}>
              {failed === 0 ? 'Upload Complete!' : 'Upload Completed with Errors'}
            </h2>
            <p className={`text-sm mb-4 ${
              failed === 0 ? 'text-green-700' : 'text-yellow-700'
            }`}>
              {failed === 0
                ? `All ${total} records were successfully uploaded to DHIS2.`
                : `${success} of ${total} records were uploaded successfully. ${failed} record${failed > 1 ? 's' : ''} failed.`
              }
            </p>

            {/* Statistics Grid */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-gray-600 mb-1">Total Records</p>
                <p className="text-2xl font-bold text-gray-900">{total}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">Successful</p>
                <p className="text-2xl font-bold text-green-600">{success}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">Failed</p>
                <p className="text-2xl font-bold text-red-600">{failed}</p>
              </div>
            </div>

            {/* Success Rate */}
            <div className="mt-4">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-medium text-gray-700">Success Rate</span>
                <span className="text-xs font-medium text-gray-700">{successRate}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="h-full rounded-full bg-green-600 transition-all"
                  style={{ width: `${successRate}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={onStartOver}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          Upload Another File
        </button>
        {failed > 0 && (
          <button
            onClick={onDownloadFailed}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Download Failed Records ({failed})
          </button>
        )}
      </div>

      {/* Failed Records List */}
      {failed > 0 && failedRecords && failedRecords.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Failed Records ({failedRecords.length})
          </h3>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {failedRecords.map((record, index) => (
              <div
                key={index}
                className="bg-red-50 border border-red-200 rounded-lg p-4"
              >
                <div className="flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm font-medium text-red-900">
                        Row {record.rowNumber}
                      </span>
                      <span className="text-xs text-red-600 bg-red-100 px-2 py-0.5 rounded">
                        Failed
                      </span>
                    </div>

                    {/* Record Details */}
                    {record.record && (
                      <div className="text-xs text-gray-700 mb-2 space-y-0.5">
                        {record.record.patientNumber && (
                          <p>
                            <span className="font-medium">Patient No:</span> {record.record.patientNumber}
                          </p>
                        )}
                        {record.record.patientName && (
                          <p>
                            <span className="font-medium">Patient:</span> {record.record.patientName}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Error Message */}
                    <div className="bg-white border border-red-200 rounded p-2">
                      <p className="text-xs font-medium text-red-900 mb-1">Error:</p>
                      <p className="text-xs text-red-700 font-mono break-words">
                        {record.error}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Success Records Summary */}
      {success > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Successfully Uploaded ({success} records)
          </h3>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <span>
              All successful records are now available in DHIS2.
              {success > 5 && ' (Showing first 5 below)'}
            </span>
          </div>

          {/* Show first few successful records */}
          {successRecords && successRecords.length > 0 && (
            <div className="mt-4 space-y-2 max-h-48 overflow-y-auto">
              {successRecords.slice(0, 5).map((record, index) => (
                <div
                  key={index}
                  className="bg-green-50 border border-green-200 rounded p-3 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-green-900 font-medium">
                      Row {record.rowNumber}
                    </span>
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  </div>
                  {record.record && (
                    <div className="text-green-700 mt-1">
                      {record.record.patientNumber && (
                        <span>Patient: {record.record.patientNumber}</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {successRecords.length > 5 && (
                <p className="text-xs text-gray-500 text-center pt-2">
                  ... and {successRecords.length - 5} more
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
