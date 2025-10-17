import React, { useState, useEffect } from 'react';
import { Activity, Upload as UploadIcon, Settings as SettingsIcon, Bug } from 'lucide-react';
import Discovery from './pages/Discovery';
import Upload from './pages/Upload';
import Settings from './pages/Settings';
import Debug from './pages/Debug';

function App() {
  const [activeTab, setActiveTab] = useState('discovery');
  const [apiDiscovered, setApiDiscovered] = useState(false);

  // Check if API is already discovered
  useEffect(() => {
    checkApiStatus();

    // Listen for API_DISCOVERED events
    const handleMessage = (msg) => {
      if (msg.type === 'API_DISCOVERED') {
        setApiDiscovered(true);
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, []);

  const checkApiStatus = async () => {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_API_CONFIG' });
      if (response.success && response.config && response.config.discovered) {
        setApiDiscovered(true);
        // Auto-switch to Upload tab if API is already configured
        setActiveTab('upload');
      }
    } catch (err) {
      console.error('Error checking API status:', err);
    }
  };

  return (
    <div className="flex flex-col w-full h-screen bg-gray-50">
      {/* Header - Compact */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-3 py-2 shadow-md flex-shrink-0">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5" />
          <div>
            <h1 className="text-base font-bold">DHIMS2 Batch Uploader</h1>
            <p className="text-xs text-blue-100">Automated Data Upload</p>
          </div>
        </div>
      </div>

      {/* Tab Navigation - Compact */}
      <div className="flex border-b border-gray-200 bg-white flex-shrink-0">
        <button
          onClick={() => setActiveTab('discovery')}
          className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
            activeTab === 'discovery'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          <div className="flex items-center justify-center gap-1.5">
            <Activity className="w-3.5 h-3.5" />
            <span>Discovery</span>
          </div>
        </button>

        <button
          onClick={() => setActiveTab('upload')}
          className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
            activeTab === 'upload'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-800'
          } ${!apiDiscovered && 'opacity-50 cursor-not-allowed'}`}
          disabled={!apiDiscovered}
        >
          <div className="flex items-center justify-center gap-1.5">
            <UploadIcon className="w-3.5 h-3.5" />
            <span>Upload</span>
          </div>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
            activeTab === 'settings'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          <div className="flex items-center justify-center gap-1.5">
            <SettingsIcon className="w-3.5 h-3.5" />
            <span>Settings</span>
          </div>
        </button>

        <button
          onClick={() => setActiveTab('debug')}
          className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
            activeTab === 'debug'
              ? 'text-purple-600 border-b-2 border-purple-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          <div className="flex items-center justify-center gap-1.5">
            <Bug className="w-3.5 h-3.5" />
            <span>Debug</span>
          </div>
        </button>
      </div>

      {/* Content Area - Flex-1 to fill remaining space */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {activeTab === 'discovery' && <Discovery onNavigateToUpload={() => setActiveTab('upload')} />}
        {activeTab === 'upload' && <Upload />}
        {activeTab === 'settings' && <Settings />}
        {activeTab === 'debug' && <Debug />}
      </div>

      {/* Footer - Compact */}
      <div className="bg-white border-t border-gray-200 px-3 py-1.5 flex-shrink-0">
        <p className="text-xs text-gray-500 text-center">
          v1.0.0 | Made for DHIMS2
        </p>
      </div>
    </div>
  );
}

export default App;
