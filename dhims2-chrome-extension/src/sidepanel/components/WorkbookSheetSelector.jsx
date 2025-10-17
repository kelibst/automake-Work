import React, { useState, useEffect } from 'react';
import { FileSpreadsheet, ChevronRight, Table, CheckCircle2 } from 'lucide-react';
import ExcelParser from '../../utils/excel-parser';

/**
 * WorkbookSheetSelector - Allows users to select which sheet to use from Excel workbook
 */
function WorkbookSheetSelector({ file, onSheetSelect, selectedSheet }) {
  const [sheets, setSheets] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (file) {
      loadAllSheets();
    }
  }, [file]);

  const loadAllSheets = async () => {
    setLoading(true);
    setError(null);

    try {
      const allSheets = await ExcelParser.parseAllSheets(file);
      setSheets(allSheets);

      // Auto-select first sheet if none selected
      if (!selectedSheet && allSheets.availableSheets.length > 0) {
        onSheetSelect(allSheets.availableSheets[0]);
      }
    } catch (err) {
      console.error('Error loading sheets:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSheetClick = (sheetName) => {
    onSheetSelect(sheetName);
  };

  if (loading) {
    return (
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <div className="flex items-center justify-center text-gray-600">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-2" />
          <span className="text-sm">Loading sheets...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 rounded-lg p-4 border border-red-200">
        <p className="text-sm text-red-700">{error}</p>
      </div>
    );
  }

  if (!sheets || sheets.totalSheets === 0) {
    return (
      <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
        <p className="text-sm text-yellow-700">No sheets found in workbook</p>
      </div>
    );
  }

  // If only one sheet, show simple info
  if (sheets.totalSheets === 1) {
    const sheetName = sheets.availableSheets[0];
    const sheetData = sheets.sheets[sheetName];

    return (
      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
        <div className="flex items-start">
          <FileSpreadsheet className="w-5 h-5 text-blue-600 flex-shrink-0 mr-2 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-900">{sheetName}</p>
            <p className="text-xs text-blue-700 mt-1">
              {sheetData.totalRecords} records • {sheetData.headers.length} columns
            </p>
          </div>
          <CheckCircle2 className="w-5 h-5 text-blue-600" />
        </div>
      </div>
    );
  }

  // Multiple sheets - show selection UI
  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="p-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <FileSpreadsheet className="w-4 h-4 text-gray-600 mr-2" />
            <span className="text-sm font-medium text-gray-900">
              Select Sheet
            </span>
          </div>
          <span className="text-xs text-gray-500">
            {sheets.totalSheets} sheets available
          </span>
        </div>
      </div>

      <div className="divide-y divide-gray-100">
        {sheets.availableSheets.map((sheetName) => {
          const sheetData = sheets.sheets[sheetName];
          const isSelected = sheetName === selectedSheet;
          const hasError = !!sheetData.error;

          return (
            <button
              key={sheetName}
              onClick={() => !hasError && handleSheetClick(sheetName)}
              disabled={hasError}
              className={`w-full px-3 py-3 text-left transition-colors ${
                hasError
                  ? 'bg-gray-50 cursor-not-allowed opacity-50'
                  : isSelected
                  ? 'bg-blue-50 hover:bg-blue-100'
                  : 'hover:bg-gray-50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center">
                    <Table className={`w-4 h-4 flex-shrink-0 mr-2 ${
                      isSelected ? 'text-blue-600' : 'text-gray-400'
                    }`} />
                    <span className={`text-sm font-medium truncate ${
                      isSelected ? 'text-blue-900' : 'text-gray-900'
                    }`}>
                      {sheetName}
                    </span>
                  </div>

                  {!hasError && (
                    <div className="mt-1 ml-6 text-xs text-gray-600">
                      {sheetData.totalRecords} records • {sheetData.headers.length} columns
                    </div>
                  )}

                  {hasError && (
                    <div className="mt-1 ml-6 text-xs text-red-600">
                      {sheetData.error}
                    </div>
                  )}

                  {/* Show first few column names - More compact */}
                  {!hasError && sheetData.headers.length > 0 && !isSelected && (
                    <div className="mt-1 ml-6 text-xs text-gray-500 truncate">
                      {sheetData.headers.slice(0, 2).join(', ')}
                      {sheetData.headers.length > 2 && ` +${sheetData.headers.length - 2}`}
                    </div>
                  )}
                </div>

                {isSelected && !hasError && (
                  <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0 ml-2" />
                )}

                {!isSelected && !hasError && (
                  <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0 ml-2" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Compact preview of selected sheet */}
      {selectedSheet && sheets.sheets[selectedSheet] && !sheets.sheets[selectedSheet].error && (
        <div className="px-3 py-2 border-t border-gray-200 bg-gray-50">
          <p className="text-xs font-medium text-gray-700 mb-1.5">
            Preview: {sheets.sheets[selectedSheet].totalRecords} records
          </p>
          <div className="text-xs text-gray-600 space-y-0.5">
            <div className="truncate">
              <span className="font-medium">Columns:</span> {sheets.sheets[selectedSheet].headers.slice(0, 3).join(', ')}
              {sheets.sheets[selectedSheet].headers.length > 3 && ` +${sheets.sheets[selectedSheet].headers.length - 3} more`}
            </div>
            {sheets.sheets[selectedSheet].preview && sheets.sheets[selectedSheet].preview[0] && (
              <div className="truncate">
                <span className="font-medium">Sample:</span> {sheets.sheets[selectedSheet].headers[0]}: {String(sheets.sheets[selectedSheet].preview[0][sheets.sheets[selectedSheet].headers[0]] || '').substring(0, 30)}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default WorkbookSheetSelector;
