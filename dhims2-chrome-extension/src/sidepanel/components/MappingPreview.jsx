import React from 'react';
import { Eye, AlertCircle, CheckCircle2 } from 'lucide-react';

/**
 * MappingPreview - Preview how Excel data will be transformed with current mapping
 */
function MappingPreview({ records, mapping, fieldMapper }) {
  if (!records || records.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 text-center">
        <p className="text-sm text-gray-500">No records to preview</p>
      </div>
    );
  }

  if (!mapping || Object.keys(mapping).length === 0) {
    return (
      <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
        <div className="flex items-start">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mr-2 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-yellow-900">No mappings defined</p>
            <p className="text-xs text-yellow-700 mt-1">
              Map at least one field to see preview
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Take first 3 records for preview
  const previewRecords = records.slice(0, 3);

  // Get mapped field names
  const mappedFields = Object.entries(mapping).map(([excelCol, config]) => ({
    excelColumn: excelCol,
    dhimsField: config.dataElement,
    type: config.type
  }));

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="bg-gray-50 border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Eye className="w-4 h-4 text-gray-600 mr-2" />
            <h4 className="text-sm font-semibold text-gray-900">
              Data Preview
            </h4>
          </div>
          <span className="text-xs text-gray-500">
            Showing {previewRecords.length} of {records.length} records
          </span>
        </div>
      </div>

      {/* Mapping info */}
      <div className="px-4 py-3 bg-blue-50 border-b border-blue-200">
        <div className="flex items-start">
          <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0 mr-2 mt-0.5" />
          <div className="text-xs text-blue-900">
            <span className="font-medium">{Object.keys(mapping).length} fields mapped</span>
            {' • '}
            Data will be transformed according to your mappings
          </div>
        </div>
      </div>

      {/* Compact preview - vertical layout for narrow width */}
      <div className="max-h-96 overflow-y-auto">
        {previewRecords.map((record, recordIndex) => (
          <div
            key={recordIndex}
            className="border-b-2 border-gray-300"
          >
            <div className="px-3 py-1.5 bg-gray-100 border-b border-gray-200">
              <p className="text-xs font-semibold text-gray-700">
                Record {recordIndex + 1}
                {record._rowNumber && (
                  <span className="text-gray-500 font-normal ml-1.5">
                    (row {record._rowNumber})
                  </span>
                )}
              </p>
            </div>

            <div className="divide-y divide-gray-100">
              {mappedFields.map(({ excelColumn, dhimsField, type }) => {
                const value = record[excelColumn];
                const formattedValue = fieldMapper
                  ? fieldMapper.formatValue(value, type)
                  : value;
                const hasTransform = formattedValue !== value;

                return (
                  <div
                    key={excelColumn}
                    className="px-3 py-1.5 hover:bg-gray-50"
                  >
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <p className="text-xs font-medium text-gray-700 truncate flex-1">
                        {excelColumn}
                      </p>
                      <span className={`px-1.5 py-0.5 text-xs rounded flex-shrink-0 ${
                        type === 'date'
                          ? 'bg-purple-100 text-purple-700'
                          : type === 'number'
                          ? 'bg-blue-100 text-blue-700'
                          : type === 'boolean'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {type}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 truncate mb-1">
                      → {dhimsField}
                    </p>
                    <p className={`text-xs font-mono truncate ${
                      value ? 'text-gray-900' : 'text-gray-400'
                    }`}>
                      {value || '(empty)'}
                      {hasTransform && (
                        <span className="text-blue-600 ml-2">
                          → {formattedValue}
                        </span>
                      )}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Summary footer */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
        <p className="text-xs text-gray-600">
          {records.length - previewRecords.length > 0 && (
            <span>
              +{records.length - previewRecords.length} more records will be processed
            </span>
          )}
          {records.length === previewRecords.length && (
            <span>All records shown</span>
          )}
        </p>
      </div>
    </div>
  );
}

export default MappingPreview;
