import React, { useState, useEffect } from 'react';
import { Play, StopCircle, CheckCircle2, AlertCircle, Loader2, RefreshCw, ArrowRight } from 'lucide-react';

function Discovery({ onNavigateToUpload }) {
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [apiConfig, setApiConfig] = useState(null);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState('');

  // Check if API is already configured on load
  useEffect(() => {
    checkConfiguration();

    // Listen for API_DISCOVERED events
    const handleMessage = (msg) => {
      if (msg.type === 'API_DISCOVERED') {
        setApiConfig(msg.config);
        setIsDiscovering(false);
        setMessage('API discovered successfully!');
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, []);

  /**
   * Check if API is already configured
   */
  const checkConfiguration = async () => {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_API_CONFIG' });
      if (response.success && response.config) {
        setApiConfig(response.config);
      }
    } catch (err) {
      console.error('Error checking configuration:', err);
    }
  };

  /**
   * Start API discovery
   */
  const startDiscovery = async () => {
    try {
      setError(null);
      setMessage('');
      setIsDiscovering(true);

      const response = await chrome.runtime.sendMessage({
        type: 'START_API_DISCOVERY'
      });

      if (response.success) {
        setMessage(response.message);
      } else {
        throw new Error(response.error || 'Failed to start discovery');
      }
    } catch (err) {
      console.error('Error starting discovery:', err);
      setError(err.message);
      setIsDiscovering(false);
    }
  };

  /**
   * Stop API discovery
   */
  const stopDiscovery = async () => {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'STOP_API_DISCOVERY'
      });

      if (response.success) {
        setIsDiscovering(false);
        setMessage('Discovery stopped');
      }
    } catch (err) {
      console.error('Error stopping discovery:', err);
      setError(err.message);
    }
  };

  /**
   * Clear configuration
   */
  const clearConfiguration = async () => {
    if (!confirm('Are you sure you want to clear the API configuration?')) {
      return;
    }

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'CLEAR_API_CONFIG'
      });

      if (response.success) {
        setApiConfig(null);
        setMessage('Configuration cleared');
      }
    } catch (err) {
      console.error('Error clearing configuration:', err);
      setError(err.message);
    }
  };

  /**
   * Open DHIMS2 in new tab
   */
  const openDHIMS2 = () => {
    chrome.tabs.create({
      url: 'https://events.chimgh.org/events/dhis-web-capture/index.html#/new?orgUnitId=duCDqCRlWG1&programId=fFYTJRzD2qq'
    });
  };

  // If API is already configured
  if (apiConfig && apiConfig.discovered) {
    return (
      <div className="p-6">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            API Configured!
          </h2>
          <p className="text-sm text-gray-600">
            Extension is ready for batch upload
          </p>
        </div>

        {/* Configuration Details */}
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Endpoint:</span>
              <span className="font-medium text-gray-900 truncate ml-2">
                {apiConfig.endpoint?.baseUrl?.split('/api/')[1] || 'events'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Fields Mapped:</span>
              <span className="font-medium text-gray-900">
                {apiConfig.totalFields || Object.keys(apiConfig.fieldMappings || {}).length}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Discovered:</span>
              <span className="font-medium text-gray-900">
                {new Date(apiConfig.discoveryDate).toLocaleString()}
              </span>
            </div>
            {apiConfig.staticValues && (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-600">Program:</span>
                  <span className="font-mono text-xs text-gray-700">
                    {apiConfig.staticValues.program}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Org Unit:</span>
                  <span className="font-mono text-xs text-gray-700">
                    {apiConfig.staticValues.orgUnit}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          {onNavigateToUpload && (
            <button
              onClick={onNavigateToUpload}
              className="w-full px-6 py-3 text-base font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              Continue to Upload
              <ArrowRight className="w-5 h-5 inline ml-2" />
            </button>
          )}

          <button
            onClick={clearConfiguration}
            className="w-full px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
          >
            <RefreshCw className="w-4 h-4 inline mr-2" />
            Re-discover API
          </button>
        </div>

        {message && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">{message}</p>
          </div>
        )}
      </div>
    );
  }

  // Discovery in progress
  if (isDiscovering) {
    return (
      <div className="p-6">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4">
            <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Listening for API Calls...
          </h2>
          <p className="text-sm text-gray-600">
            Submit a test record in DHIMS2 now
          </p>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <h3 className="font-medium text-blue-900 mb-2 text-sm">Instructions:</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
            <li>Go to DHIMS2 (or click button below)</li>
            <li>Fill in ONE test patient record</li>
            <li>Click "Save and exit"</li>
            <li>Extension will capture the API automatically</li>
          </ol>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <button
            onClick={openDHIMS2}
            className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Open DHIMS2 Form
          </button>

          <button
            onClick={stopDiscovery}
            className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <StopCircle className="w-4 h-4 inline mr-2" />
            Stop Discovery
          </button>
        </div>

        {message && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800">{message}</p>
          </div>
        )}
      </div>
    );
  }

  // Initial state - not discovered, not discovering
  return (
    <div className="p-6">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
          <Play className="w-10 h-10 text-gray-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          API Discovery
        </h2>
        <p className="text-sm text-gray-600">
          Let the extension learn the DHIMS2 API structure
        </p>
      </div>

      {/* How it works */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h3 className="font-medium text-gray-900 mb-3 text-sm">How it works:</h3>
        <div className="space-y-2 text-sm text-gray-700">
          <div className="flex items-start">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-medium mr-2">1</span>
            <span>Click "Start Discovery" below</span>
          </div>
          <div className="flex items-start">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-medium mr-2">2</span>
            <span>Manually submit ONE test record in DHIMS2</span>
          </div>
          <div className="flex items-start">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-medium mr-2">3</span>
            <span>Extension captures the API call automatically</span>
          </div>
          <div className="flex items-start">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-medium mr-2">4</span>
            <span>Ready for batch upload!</span>
          </div>
        </div>
      </div>

      {/* Start button */}
      <button
        onClick={startDiscovery}
        className="w-full px-6 py-3 text-base font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
      >
        <Play className="w-5 h-5 inline mr-2" />
        Start Discovery
      </button>

      {/* Error display */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mr-2 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-900">Error</p>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {message && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">{message}</p>
        </div>
      )}
    </div>
  );
}

export default Discovery;
