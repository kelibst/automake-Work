import React, { useState, useEffect } from 'react';
import { Activity, Upload as UploadIcon, Settings as SettingsIcon, Bug, MousePointerClick } from 'lucide-react';
import Discovery from './pages/Discovery';
import Upload from './pages/Upload';
import Settings from './pages/Settings';
import Debug from './pages/Debug';
import FormFiller from './pages/FormFiller';
import SystemSelector from './components/SystemSelector';
import SystemStatus from './components/SystemStatus';

function App() {
  const [activeTab, setActiveTab] = useState('discovery');
  const [apiDiscovered, setApiDiscovered] = useState(false);
  const [activeSystem, setActiveSystem] = useState('dhims2');
  const [systemConfig, setSystemConfig] = useState(null);

  // Check if API is already discovered
  useEffect(() => {
    checkApiStatus();

    // Listen for API_DISCOVERED events
    const handleMessage = (msg) => {
      if (msg.type === 'API_DISCOVERED') {
        setApiDiscovered(true);
        checkApiStatus(); // Refresh status
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, []);

  // Re-check API status when system changes
  useEffect(() => {
    checkApiStatus();
  }, [activeSystem]);

  const checkApiStatus = async () => {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'GET_SYSTEM_CONFIG',
        system: activeSystem
      });

      if (response && response.success && response.config) {
        setSystemConfig(response.config);
        setApiDiscovered(response.config.discovered || false);

        // Auto-switch to Upload tab if API is already configured
        if (response.config.discovered && activeTab === 'discovery') {
          setActiveTab('upload');
        }
      } else {
        setSystemConfig(null);
        setApiDiscovered(false);
      }
    } catch (err) {
      console.error('Error checking API status:', err);
      setSystemConfig(null);
      setApiDiscovered(false);
    }
  };

  const handleSystemChange = (newSystem) => {
    setActiveSystem(newSystem);
    // Save active system to storage
    chrome.storage.local.set({ active_system: newSystem });

    // Auto-switch to Debug tab when LHIMS is selected
    if (newSystem === 'lhims') {
      setActiveTab('debug');
    } else if (newSystem === 'dhims2' && activeTab === 'debug') {
      // When switching back to DHIMS2 from LHIMS, go to discovery or upload
      setActiveTab(apiDiscovered ? 'upload' : 'discovery');
    }
  };

  const systemColors = {
    dhims2: { from: 'from-blue-600', to: 'to-blue-700' },
    lhims: { from: 'from-green-600', to: 'to-green-700' }
  };

  const currentColors = systemColors[activeSystem] || systemColors.dhims2;

  return (
    <div className="flex flex-col w-full h-screen bg-gray-50">
      {/* Header - Compact with System Selector */}
      <div className={`bg-gradient-to-r ${currentColors.from} ${currentColors.to} text-white px-3 py-2 shadow-md flex-shrink-0`}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            <div>
              <h1 className="text-base font-bold">Health Data Uploader</h1>
              <p className="text-xs opacity-90">Multi-System Batch Upload</p>
            </div>
          </div>
          <SystemSelector
            activeSystem={activeSystem}
            onSystemChange={handleSystemChange}
          />
        </div>
      </div>

      {/* System Status Banner */}
      <div className="px-3 py-2 bg-white border-b border-gray-200 flex-shrink-0">
        <SystemStatus
          system={activeSystem}
          configured={apiDiscovered}
          lastSync={systemConfig?.timestamp}
        />
      </div>

      {/* Tab Navigation - Compact */}
      <div className="flex border-b border-gray-200 bg-white flex-shrink-0">
        {/* DHIMS2: Show all tabs */}
        {activeSystem === 'dhims2' && (
          <>
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
              }`}
            >
              <div className="flex items-center justify-center gap-1.5">
                <UploadIcon className="w-3.5 h-3.5" />
                <span>Upload</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('formfiller')}
              className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                activeTab === 'formfiller'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <div className="flex items-center justify-center gap-1.5">
                <MousePointerClick className="w-3.5 h-3.5" />
                <span>Form Fill</span>
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
          </>
        )}

        {/* Debug tab - Always visible for both systems */}
        <button
          onClick={() => setActiveTab('debug')}
          className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
            activeTab === 'debug'
              ? activeSystem === 'dhims2'
                ? 'text-purple-600 border-b-2 border-purple-600'
                : 'text-green-600 border-b-2 border-green-600'
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
        {activeTab === 'discovery' && (
          <Discovery
            activeSystem={activeSystem}
            onNavigateToUpload={() => setActiveTab('upload')}
          />
        )}
        {activeTab === 'upload' && (
          <Upload activeSystem={activeSystem} />
        )}
        {activeTab === 'formfiller' && (
          <FormFiller activeSystem={activeSystem} />
        )}
        {activeTab === 'settings' && (
          <Settings activeSystem={activeSystem} />
        )}
        {activeTab === 'debug' && (
          <Debug activeSystem={activeSystem} />
        )}
      </div>

      {/* Footer - Compact */}
      <div className="bg-white border-t border-gray-200 px-3 py-1.5 flex-shrink-0">
        <p className="text-xs text-gray-500 text-center">
          v2.0.0 | Multi-System Support: DHIMS2 & LHIMS
        </p>
      </div>
    </div>
  );
}

export default App;
