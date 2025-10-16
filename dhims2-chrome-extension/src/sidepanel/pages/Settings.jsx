import React from 'react';
import { Settings as SettingsIcon, Info } from 'lucide-react';

function Settings() {
  return (
    <div className="p-6">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
          <SettingsIcon className="w-10 h-10 text-gray-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          Settings
        </h2>
        <p className="text-sm text-gray-600">
          Configure extension preferences
        </p>
      </div>

      {/* Version info */}
      <div className="bg-gray-50 rounded-lg p-4 mb-4">
        <div className="flex items-start">
          <Info className="w-5 h-5 text-gray-600 flex-shrink-0 mr-3 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-gray-900 mb-1">DHIMS2 Batch Uploader</p>
            <p className="text-gray-600">Version 1.0.0</p>
            <p className="text-gray-600 mt-2">
              Chrome Extension for automated patient data upload to DHIMS2
            </p>
          </div>
        </div>
      </div>

      {/* Coming soon */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
        <p className="text-sm text-blue-800">
          Additional settings coming soon
        </p>
      </div>
    </div>
  );
}

export default Settings;
