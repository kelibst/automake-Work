import React, { useState, useEffect } from 'react';
import { Activity, Upload as UploadIcon, Settings as SettingsIcon } from 'lucide-react';
import Discovery from './pages/Discovery';
import Upload from './pages/Upload';
import Settings from './pages/Settings';

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
    <div className="w-full h-full bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 shadow-md">
        <div className="flex items-center gap-2">
          <Activity className="w-6 h-6" />
          <div>
            <h1 className="text-lg font-bold">DHIMS2 Batch Uploader</h1>
            <p className="text-xs text-blue-100">Automated Patient Data Upload</p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 bg-white">
        <button
          onClick={() => setActiveTab('discovery')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'discovery'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Activity className="w-4 h-4" />
            <span>Discovery</span>
          </div>
        </button>

        <button
          onClick={() => setActiveTab('upload')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'upload'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-800'
          } ${!apiDiscovered && 'opacity-50 cursor-not-allowed'}`}
          disabled={!apiDiscovered}
        >
          <div className="flex items-center justify-center gap-2">
            <UploadIcon className="w-4 h-4" />
            <span>Upload</span>
          </div>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'settings'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <SettingsIcon className="w-4 h-4" />
            <span>Settings</span>
          </div>
        </button>
      </div>

      {/* Content Area */}
      <div className="overflow-y-auto" style={{ maxHeight: '500px' }}>
        {activeTab === 'discovery' && <Discovery onNavigateToUpload={() => setActiveTab('upload')} />}
        {activeTab === 'upload' && <Upload />}
        {activeTab === 'settings' && <Settings />}
      </div>

      {/* Footer */}
      <div className="bg-white border-t border-gray-200 px-4 py-2">
        <p className="text-xs text-gray-500 text-center">
          v1.0.0 | Made for DHIMS2
        </p>
      </div>
    </div>
  );
}

export default App;
