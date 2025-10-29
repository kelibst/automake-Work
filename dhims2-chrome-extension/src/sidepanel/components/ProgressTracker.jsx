import React from 'react';
import { Loader2, CheckCircle2, XCircle, Pause, Play } from 'lucide-react';

/**
 * Real-time upload progress tracker component
 * Shows live progress, success/failure counts, and current record being processed
 */
export default function ProgressTracker({
  uploadStatus,
  onPause,
  onResume,
  onCancel
}) {
  if (!uploadStatus) {
    return null;
  }

  const {
    total,
    success,
    failed,
    pending,
    isPaused,
    percentage,
    currentRecord
  } = uploadStatus;

  const isActive = pending > 0 && !isPaused;
  const isComplete = pending === 0;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          {isComplete ? 'Upload Complete' : isPaused ? 'Upload Paused' : 'Uploading Records'}
        </h3>

        {!isComplete && (
          <div className="flex gap-2">
            {isPaused ? (
              <button
                onClick={onResume}
                className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
              >
                <Play className="w-4 h-4" />
                Resume
              </button>
            ) : (
              <button
                onClick={onPause}
                className="flex items-center gap-1 px-3 py-1.5 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700 transition-colors"
              >
                <Pause className="w-4 h-4" />
                Pause
              </button>
            )}
            <button
              onClick={onCancel}
              className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
            >
              <XCircle className="w-4 h-4" />
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">
            Progress: {success + failed} / {total}
          </span>
          <span className="text-sm font-medium text-gray-700">
            {percentage}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              isComplete
                ? failed === 0 ? 'bg-green-600' : 'bg-yellow-600'
                : isPaused
                ? 'bg-yellow-600'
                : 'bg-blue-600'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium text-green-900">Success</span>
          </div>
          <p className="text-2xl font-bold text-green-700">{success}</p>
        </div>

        <div className="bg-red-50 rounded-lg p-4 border border-red-200">
          <div className="flex items-center gap-2 mb-1">
            <XCircle className="w-5 h-5 text-red-600" />
            <span className="text-sm font-medium text-red-900">Failed</span>
          </div>
          <p className="text-2xl font-bold text-red-700">{failed}</p>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="flex items-center gap-2 mb-1">
            <Loader2 className={`w-5 h-5 text-gray-600 ${isActive ? 'animate-spin' : ''}`} />
            <span className="text-sm font-medium text-gray-900">Pending</span>
          </div>
          <p className="text-2xl font-bold text-gray-700">{pending}</p>
        </div>
      </div>

      {/* Current Record */}
      {currentRecord && !isComplete && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Loader2 className="w-5 h-5 text-blue-600 animate-spin flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-blue-900 mb-1">
                Currently Processing
              </p>
              <div className="text-xs text-blue-700 space-y-0.5">
                <p>
                  <span className="font-medium">Row:</span> {currentRecord.rowNumber}
                </p>
                {currentRecord.patientName && (
                  <p>
                    <span className="font-medium">Patient:</span> {currentRecord.patientName}
                  </p>
                )}
                {currentRecord.patientNumber && (
                  <p>
                    <span className="font-medium">Patient No:</span> {currentRecord.patientNumber}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Paused Message */}
      {isPaused && !isComplete && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
          Upload paused. Click <strong>Resume</strong> to continue or <strong>Cancel</strong> to stop.
        </div>
      )}

      {/* Completion Message */}
      {isComplete && (
        <div className={`mt-4 p-3 rounded text-sm ${
          failed === 0
            ? 'bg-green-50 border border-green-200 text-green-800'
            : 'bg-yellow-50 border border-yellow-200 text-yellow-800'
        }`}>
          {failed === 0 ? (
            <>
              <strong>All records uploaded successfully!</strong> You can view the detailed report below.
            </>
          ) : (
            <>
              <strong>Upload completed with errors.</strong> {failed} record{failed > 1 ? 's' : ''} failed.
              You can download the failed records and retry later.
            </>
          )}
        </div>
      )}
    </div>
  );
}
