import React, { useState, useEffect } from 'react';
import { Bug, Copy, Trash2, Download, RefreshCw, CheckCircle2 } from 'lucide-react';
import { getApiConfiguration, getCapturedPayloads, clearCapturedPayloads } from '../../utils/storage-manager';

export default function Debug() {
  const [payloads, setPayloads] = useState([]);
  const [selectedPayload, setSelectedPayload] = useState(null);
  const [apiConfig, setApiConfig] = useState(null);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [methodFilter, setMethodFilter] = useState('ALL'); // ALL, POST, GET

  useEffect(() => {
    loadData();

    // Auto-enable debug mode when component mounts
    enableDebugMode();

    // Listen for new captured payloads
    const handleMessage = (message) => {
      if (message.type === 'PAYLOAD_CAPTURED') {
        loadData();
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);

    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage);
    };
  }, []);

  const enableDebugMode = async () => {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'TOGGLE_DEBUG_MODE',
        enabled: true
      });

      if (response.success) {
        setIsListening(true);
        console.log('🐛 Debug mode auto-enabled');
      }
    } catch (error) {
      console.error('Failed to auto-enable debug mode:', error);
    }
  };

  const loadData = async () => {
    const [config, capturedPayloads] = await Promise.all([
      getApiConfiguration(),
      getCapturedPayloads()
    ]);

    setApiConfig(config);
    setPayloads(capturedPayloads || []);

    if (capturedPayloads && capturedPayloads.length > 0 && !selectedPayload) {
      setSelectedPayload(capturedPayloads[0]);
    }
  };

  const handleCopyPayload = async (payload, index) => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleClearPayloads = async () => {
    if (confirm('Are you sure you want to clear all captured payloads?')) {
      await clearCapturedPayloads();
      setPayloads([]);
      setSelectedPayload(null);
    }
  };

  const handleDownloadPayload = (payload, index) => {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dhims2-payload-${index + 1}-${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleToggleListening = async () => {
    const newState = !isListening;
    setIsListening(newState);

    // Send message to background script to enable/disable payload capture
    chrome.runtime.sendMessage({
      type: 'TOGGLE_DEBUG_MODE',
      enabled: newState
    });
  };

  const renderPayloadContent = () => {
    if (!selectedPayload) return null;

    const payload = selectedPayload.payload;
    const queryParams = selectedPayload.queryParams;
    const metadata = selectedPayload._metadata;

    return (
      <div className="space-y-4">
        {/* Metadata Section */}
        {metadata && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h4 className="font-semibold text-purple-900 mb-2">Request Metadata</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-purple-700">Type:</span>
                <span className="font-semibold text-purple-900">{selectedPayload.requestType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-purple-700">Status:</span>
                <span className={`font-semibold ${metadata.status === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                  {metadata.status.toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-purple-700">Status Code:</span>
                <span className="font-mono text-purple-900">{selectedPayload.statusCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-purple-700">Captured At:</span>
                <span className="font-mono text-purple-900 text-xs">{metadata.capturedAt}</span>
              </div>
              {metadata.payloadSize > 0 && (
                <div className="flex justify-between">
                  <span className="text-purple-700">Payload Size:</span>
                  <span className="font-mono text-purple-900">{metadata.payloadSize} bytes</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Query Parameters for GET requests */}
        {queryParams && (
          <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4">
            <h4 className="font-semibold text-cyan-900 mb-2">Query Parameters</h4>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {Object.entries(queryParams).map(([key, value], index) => (
                <div key={index} className="bg-white border border-cyan-200 rounded p-2">
                  <div className="text-xs text-cyan-700 font-semibold mb-1">{key}</div>
                  <div className="text-sm font-mono text-gray-900 break-all">{value}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Event Metadata for POST requests with payload */}
        {payload && (payload.program || payload.orgUnit || payload.eventDate) && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">Event Metadata</h4>
            <div className="space-y-1 text-sm">
              {payload.program && (
                <div className="flex justify-between">
                  <span className="text-blue-700">Program:</span>
                  <span className="font-mono text-blue-900 text-xs">{payload.program}</span>
                </div>
              )}
              {payload.orgUnit && (
                <div className="flex justify-between">
                  <span className="text-blue-700">Org Unit:</span>
                  <span className="font-mono text-blue-900 text-xs">{payload.orgUnit}</span>
                </div>
              )}
              {payload.eventDate && (
                <div className="flex justify-between">
                  <span className="text-blue-700">Event Date:</span>
                  <span className="font-mono text-blue-900">{payload.eventDate}</span>
                </div>
              )}
              {payload.status && (
                <div className="flex justify-between">
                  <span className="text-blue-700">Status:</span>
                  <span className="font-mono text-blue-900">{payload.status}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Data Values for event submissions */}
        {payload && payload.dataValues && payload.dataValues.length > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-semibold text-green-900 mb-3">
              Data Elements ({payload.dataValues.length} fields)
            </h4>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {payload.dataValues.map((dv, index) => (
                <div key={index} className="bg-white border border-green-200 rounded p-3">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-xs text-green-700 font-semibold">
                      Data Element ID:
                    </span>
                    <span className="text-xs font-mono text-green-900 bg-green-100 px-2 py-1 rounded">
                      {dv.dataElement}
                    </span>
                  </div>
                  <div className="mt-2">
                    <span className="text-xs text-gray-600">Value:</span>
                    <div className="text-sm font-medium text-gray-900 mt-1 break-all">
                      {dv.value}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Generic payload for other request types */}
        {payload && !payload.dataValues && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <h4 className="font-semibold text-orange-900 mb-2">Request Payload</h4>
            <pre className="text-xs font-mono text-gray-900 overflow-x-auto bg-white p-3 rounded border border-orange-200">
              {JSON.stringify(payload, null, 2)}
            </pre>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bug className="w-6 h-6 text-purple-600" />
          <div>
            <h1 className="text-xl font-bold text-gray-900">Debug Mode</h1>
            <p className="text-sm text-gray-600">Capture and inspect DHIMS2 API payloads</p>
          </div>
        </div>
        <button
          onClick={handleToggleListening}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            isListening
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
          }`}
        >
          <div className={`w-2 h-2 rounded-full ${isListening ? 'bg-white animate-pulse' : 'bg-gray-500'}`} />
          {isListening ? 'Listening' : 'Not Listening'}
        </button>
      </div>

      {/* Status & Instructions */}
      <div className="space-y-3">
        {/* Status Bar */}
        {isListening && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-semibold text-green-900">
                  Actively capturing requests
                </span>
              </div>
              <div className="text-xs text-green-700">
                {payloads.length} captured
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-900 mb-2">How to Use:</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm text-yellow-800">
            <li>Debug mode is automatically listening when you open this tab</li>
            <li>Navigate to DHIMS2 and <strong>fill out the form completely</strong></li>
            <li><strong className="text-red-700">IMPORTANT: Click the Save/Submit button</strong> to trigger the POST request</li>
            <li>Look for a <span className="font-semibold bg-purple-100 px-1 rounded">POST</span> request (not GET) - it will contain all field data</li>
            <li>View the captured data to understand field mappings and structure</li>
          </ol>
          <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
            <strong>💡 Tip:</strong> GET requests fetch existing data. POST requests submit new data with all your field values!
          </div>
        </div>
      </div>

      {/* Actions & Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <button
          onClick={loadData}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
        <button
          onClick={handleClearPayloads}
          disabled={payloads.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Trash2 className="w-4 h-4" />
          Clear All
        </button>

        {/* Method Filter */}
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs font-semibold text-gray-600">Filter:</span>
          <div className="flex gap-1">
            {['ALL', 'POST', 'GET'].map((method) => (
              <button
                key={method}
                onClick={() => setMethodFilter(method)}
                className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors ${
                  methodFilter === method
                    ? method === 'POST'
                      ? 'bg-green-600 text-white'
                      : method === 'GET'
                      ? 'bg-blue-600 text-white'
                      : 'bg-purple-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {method}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Payloads List */}
      {(() => {
        // Apply filter
        const filteredPayloads = methodFilter === 'ALL'
          ? payloads
          : payloads.filter(p => p.method === methodFilter);

        if (payloads.length === 0) {
          return (
            <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <Bug className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 mb-1">No payloads captured yet</p>
              <p className="text-sm text-gray-500">Enable listening and submit a form in DHIMS2</p>
            </div>
          );
        }

        if (filteredPayloads.length === 0) {
          return (
            <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-300">
              <p className="text-gray-600 mb-1">No {methodFilter} requests captured</p>
              <p className="text-sm text-gray-500">Try changing the filter or capturing more requests</p>
            </div>
          );
        }

        return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Payload List */}
          <div className="lg:col-span-1 space-y-2">
            <h3 className="font-semibold text-gray-900">
              Captured Payloads ({filteredPayloads.length}{methodFilter !== 'ALL' && ` of ${payloads.length}`})
            </h3>
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {filteredPayloads.map((payload, index) => (
                <div
                  key={index}
                  onClick={() => setSelectedPayload(payload)}
                  className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                    selectedPayload === payload
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-purple-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-gray-500">
                      Payload #{index + 1}
                    </span>
                    <div className="flex gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyPayload(payload, index);
                        }}
                        className="p-1 hover:bg-gray-100 rounded transition-colors"
                        title="Copy JSON"
                      >
                        {copiedIndex === index ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4 text-gray-600" />
                        )}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadPayload(payload, index);
                        }}
                        className="p-1 hover:bg-gray-100 rounded transition-colors"
                        title="Download JSON"
                      >
                        <Download className="w-4 h-4 text-gray-600" />
                      </button>
                    </div>
                  </div>
                  <div className="text-xs text-gray-600 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-purple-600">{payload.method}</span>
                      <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{payload.requestType}</span>
                    </div>
                    <div className="text-xs">{new Date(payload.timestamp).toLocaleTimeString()}</div>
                    {payload.payload?.dataValues && (
                      <div className="text-green-600 font-semibold">
                        {payload.payload.dataValues.length} fields
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Payload Details */}
          <div className="lg:col-span-2">
            {selectedPayload ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">Payload Details</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleCopyPayload(selectedPayload, payloads.indexOf(selectedPayload))}
                      className="flex items-center gap-2 px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded text-sm transition-colors"
                    >
                      <Copy className="w-4 h-4" />
                      Copy
                    </button>
                    <button
                      onClick={() => handleDownloadPayload(selectedPayload, payloads.indexOf(selectedPayload))}
                      className="flex items-center gap-2 px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded text-sm transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                  </div>
                </div>

                {/* Request Info */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Request Information</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-gray-600 flex-shrink-0">URL:</span>
                      <span className="font-mono text-gray-900 text-xs break-all text-right">{selectedPayload.url}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Path:</span>
                      <span className="font-mono text-gray-900 text-xs">{selectedPayload.pathname}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Method:</span>
                      <span className="font-mono text-gray-900 font-bold">{selectedPayload.method}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Timestamp:</span>
                      <span className="font-mono text-gray-900 text-xs">{new Date(selectedPayload.timestamp).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Payload Content */}
                {renderPayloadContent()}

                {/* Raw JSON View */}
                <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-white">Complete Capture (Raw JSON)</h4>
                  </div>
                  <pre className="text-xs text-green-400 overflow-x-auto">
                    {JSON.stringify(selectedPayload, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-gray-600">Select a payload to view details</p>
              </div>
            )}
          </div>
        </div>
        );
      })()}
    </div>
  );
}
