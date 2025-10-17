import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Circle,
  X,
  Sparkles,
  RotateCcw,
  Save
} from 'lucide-react';

/**
 * FieldMappingEditor - Interactive UI for mapping Excel columns to DHIMS2 fields
 */
function FieldMappingEditor({
  excelHeaders,
  dhimsFields,
  initialMapping,
  onMappingChange,
  onSaveTemplate
}) {
  const [mapping, setMapping] = useState({});
  const [selectedExcelColumn, setSelectedExcelColumn] = useState(null);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    // Initialize mapping from initial mapping
    if (initialMapping && initialMapping.mapping) {
      const userMapping = {};
      Object.entries(initialMapping.mapping).forEach(([excelCol, config]) => {
        userMapping[excelCol] = config.dataElement;
      });
      setMapping(userMapping);
    }
  }, [initialMapping]);

  useEffect(() => {
    // Notify parent of mapping changes
    if (onMappingChange) {
      onMappingChange(mapping);
    }
  }, [mapping]);

  const handleMapField = (excelColumn, dhimsFieldId) => {
    setMapping(prev => ({
      ...prev,
      [excelColumn]: dhimsFieldId
    }));
    setSelectedExcelColumn(null);
  };

  const handleUnmapField = (excelColumn) => {
    setMapping(prev => {
      const updated = { ...prev };
      delete updated[excelColumn];
      return updated;
    });
  };

  const handleAutoMap = () => {
    // Use initial mapping as auto-mapping
    if (initialMapping && initialMapping.mapping) {
      const autoMapping = {};
      Object.entries(initialMapping.mapping).forEach(([excelCol, config]) => {
        autoMapping[excelCol] = config.dataElement;
      });
      setMapping(autoMapping);
    }
  };

  const handleClearAll = () => {
    if (confirm('Clear all mappings?')) {
      setMapping({});
    }
  };

  // Get mapped and unmapped columns
  const mappedColumns = excelHeaders.filter(col => mapping[col]);
  const unmappedColumns = excelHeaders.filter(col => !mapping[col]);

  // Get used and unused DHIMS fields
  const usedDHIMSFields = new Set(Object.values(mapping));
  const unusedDHIMSFields = dhimsFields.filter(field => !usedDHIMSFields.has(field.id));

  // Filter DHIMS fields
  const filteredDHIMSFields = filter
    ? dhimsFields.filter(field =>
        field.name.toLowerCase().includes(filter.toLowerCase()) ||
        field.id.toLowerCase().includes(filter.toLowerCase())
      )
    : dhimsFields;

  const getMappingStats = () => {
    const totalColumns = excelHeaders.length;
    const mappedCount = mappedColumns.length;
    const coveragePercent = totalColumns > 0 ? Math.round((mappedCount / totalColumns) * 100) : 0;

    return { totalColumns, mappedCount, coveragePercent };
  };

  const stats = getMappingStats();

  return (
    <div className="flex flex-col h-full">
      {/* Header with stats */}
      <div className="bg-gray-50 border-b border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Field Mapping</h3>
            <p className="text-xs text-gray-600 mt-0.5">
              Map Excel columns to DHIMS2 fields
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-600">{stats.coveragePercent}%</div>
            <div className="text-xs text-gray-600">{stats.mappedCount}/{stats.totalColumns} mapped</div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${stats.coveragePercent}%` }}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-3">
          <button
            onClick={handleAutoMap}
            className="flex-1 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors flex items-center justify-center"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
            Auto-Map
          </button>
          <button
            onClick={handleClearAll}
            disabled={stats.mappedCount === 0}
            className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center justify-center ${
              stats.mappedCount === 0
                ? 'text-gray-400 bg-gray-100 cursor-not-allowed'
                : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
            Clear All
          </button>
          {onSaveTemplate && (
            <button
              onClick={() => onSaveTemplate(mapping)}
              disabled={stats.mappedCount === 0}
              className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center justify-center ${
                stats.mappedCount === 0
                  ? 'text-gray-400 bg-gray-100 cursor-not-allowed'
                  : 'text-green-700 bg-green-50 border border-green-200 hover:bg-green-100'
              }`}
            >
              <Save className="w-3.5 h-3.5 mr-1.5" />
              Save Template
            </button>
          )}
        </div>
      </div>

      {/* Mapping interface - Vertical stacking for narrow panel */}
      <div className="flex-1 overflow-y-auto">
        {/* Excel columns section */}
        <div className="border-b-2 border-gray-300">
          <div className="bg-gray-50 border-b border-gray-200 px-3 py-2 sticky top-0 z-10">
            <h4 className="text-xs font-semibold text-gray-700 uppercase">
              Step 1: Select Excel Column ({excelHeaders.length})
            </h4>
            {selectedExcelColumn && (
              <p className="text-xs text-blue-600 mt-1">
                Selected: <span className="font-semibold">{selectedExcelColumn}</span> → Scroll down to map
              </p>
            )}
          </div>

          <div className="max-h-64 overflow-y-auto">
            {/* Mapped columns */}
            {mappedColumns.length > 0 && (
              <div className="border-b border-gray-200">
                <div className="px-3 py-2 bg-green-50">
                  <p className="text-xs font-medium text-green-900">
                    Mapped ({mappedColumns.length})
                  </p>
                </div>
                {mappedColumns.map(column => {
                  const dhimsFieldId = mapping[column];
                  const dhimsField = dhimsFields.find(f => f.id === dhimsFieldId);

                  return (
                    <div
                      key={column}
                      className="px-3 py-2 border-b border-gray-100 hover:bg-gray-50 group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center">
                            <CheckCircle2 className="w-3.5 h-3.5 text-green-600 flex-shrink-0 mr-1.5" />
                            <span className="text-xs font-medium text-gray-900 truncate">
                              {column}
                            </span>
                          </div>
                          {dhimsField && (
                            <div className="ml-5 mt-0.5 text-xs text-gray-600 truncate">
                              → {dhimsField.name}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => handleUnmapField(column)}
                          className="ml-2 p-1 text-gray-400 hover:text-red-600 transition-colors flex-shrink-0"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Unmapped columns */}
            {unmappedColumns.length > 0 && (
              <div>
                <div className="px-3 py-2 bg-yellow-50">
                  <p className="text-xs font-medium text-yellow-900">
                    Unmapped ({unmappedColumns.length})
                  </p>
                </div>
                {unmappedColumns.map(column => (
                  <button
                    key={column}
                    onClick={() => setSelectedExcelColumn(
                      selectedExcelColumn === column ? null : column
                    )}
                    className={`w-full px-3 py-1.5 border-b border-gray-100 hover:bg-blue-50 text-left transition-colors ${
                      selectedExcelColumn === column ? 'bg-blue-50 border-l-2 border-l-blue-600' : ''
                    }`}
                  >
                    <div className="flex items-center">
                      <Circle className={`w-3.5 h-3.5 flex-shrink-0 mr-1.5 ${
                        selectedExcelColumn === column ? 'text-blue-600 fill-blue-600' : 'text-gray-400'
                      }`} />
                      <span className="text-xs font-medium text-gray-900 truncate">
                        {column}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {excelHeaders.length === 0 && (
              <div className="p-3 text-center text-xs text-gray-500">
                No Excel columns available
              </div>
            )}
          </div>
        </div>

        {/* DHIMS2 fields section - Below Excel columns */}
        {selectedExcelColumn && (
          <div>
            <div className="bg-blue-50 border-b border-blue-200 px-3 py-2 sticky top-0 z-10">
              <h4 className="text-xs font-semibold text-blue-900 uppercase mb-1.5">
                Step 2: Map "{selectedExcelColumn}" to DHIMS2 Field
              </h4>
              <input
                type="text"
                placeholder="Search DHIMS2 fields..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="w-full px-2 py-1 text-xs border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="max-h-96 overflow-y-auto">
              {filteredDHIMSFields.map(field => {
                const isUsed = usedDHIMSFields.has(field.id);
                const isMappedToSelected = mapping[selectedExcelColumn] === field.id;

                return (
                  <button
                    key={field.id}
                    onClick={() => handleMapField(selectedExcelColumn, field.id)}
                    disabled={isUsed && !isMappedToSelected}
                    className={`w-full px-3 py-2 border-b border-gray-100 text-left transition-colors ${
                      isMappedToSelected
                        ? 'bg-blue-100 border-l-2 border-l-blue-600'
                        : isUsed
                        ? 'bg-gray-50 cursor-not-allowed opacity-50'
                        : 'hover:bg-blue-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-gray-900 truncate">
                          {field.name}
                        </div>
                        <div className="text-xs text-gray-600 mt-0.5 flex items-center flex-wrap gap-1">
                          <span className="inline-block px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-700">
                            {field.type}
                          </span>
                          {isUsed && !isMappedToSelected && (
                            <span className="text-yellow-600 text-xs">• Used</span>
                          )}
                        </div>
                        {field.sampleValue && (
                          <div className="text-xs text-gray-500 mt-0.5 truncate">
                            Sample: {String(field.sampleValue).substring(0, 40)}
                          </div>
                        )}
                      </div>
                      {isMappedToSelected && (
                        <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0 ml-2" />
                      )}
                    </div>
                  </button>
                );
              })}

              {filteredDHIMSFields.length === 0 && (
                <div className="p-4 text-center text-xs text-gray-500">
                  No matching DHIMS2 fields found
                </div>
              )}
            </div>
          </div>
        )}

        {!selectedExcelColumn && unmappedColumns.length > 0 && (
          <div className="bg-gray-50 border-t border-gray-200 px-3 py-4 text-center">
            <p className="text-xs text-gray-600">
              👆 Select an unmapped Excel column above to map it to a DHIMS2 field
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default FieldMappingEditor;
