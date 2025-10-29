import React, { useState, useEffect } from 'react';
import { Server, ChevronDown, Check, AlertCircle } from 'lucide-react';

/**
 * SystemSelector Component
 * Allows users to switch between DHIMS2 and LHIMS systems
 */
function SystemSelector({ activeSystem, onSystemChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [systemsStatus, setSystemsStatus] = useState({
    dhims2: { configured: false, name: 'DHIMS2' },
    lhims: { configured: false, name: 'LHIMS' }
  });

  useEffect(() => {
    checkSystemsStatus();
  }, []);

  const checkSystemsStatus = async () => {
    try {
      // Check DHIMS2 status
      const dhims2Response = await chrome.runtime.sendMessage({
        type: 'GET_SYSTEM_CONFIG',
        system: 'dhims2'
      });

      // Check LHIMS status
      const lhimsResponse = await chrome.runtime.sendMessage({
        type: 'GET_SYSTEM_CONFIG',
        system: 'lhims'
      });

      setSystemsStatus({
        dhims2: {
          configured: dhims2Response?.success && dhims2Response?.config?.discovered,
          name: 'DHIMS2',
          url: 'events.chimgh.org'
        },
        lhims: {
          configured: lhimsResponse?.success && lhimsResponse?.config?.discovered,
          name: 'LHIMS',
          url: '10.10.0.59'
        }
      });
    } catch (err) {
      console.error('Error checking systems status:', err);
    }
  };

  const systems = [
    {
      id: 'dhims2',
      name: 'DHIMS2',
      fullName: 'District Health Information Management System 2',
      url: 'events.chimgh.org',
      color: 'blue',
      configured: systemsStatus.dhims2.configured
    },
    {
      id: 'lhims',
      name: 'LHIMS',
      fullName: 'Local Health Information Management System',
      url: '10.10.0.59/lhims_182',
      color: 'green',
      configured: systemsStatus.lhims.configured
    }
  ];

  const currentSystem = systems.find(s => s.id === activeSystem) || systems[0];

  const handleSystemSelect = (systemId) => {
    onSystemChange(systemId);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      {/* Selector Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 transition-all text-white ${
          currentSystem.color === 'blue'
            ? 'border-blue-300 bg-blue-500 hover:bg-blue-600'
            : 'border-green-300 bg-green-500 hover:bg-green-600'
        }`}
      >
        <Server className="w-4 h-4 text-white" />
        <div className="flex flex-col items-start">
          <span className="text-xs font-bold text-white">{currentSystem.name}</span>
          <span className="text-[10px] text-white opacity-90">{currentSystem.url}</span>
        </div>
        <ChevronDown className={`w-4 h-4 text-white transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Menu */}
          <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-20 overflow-hidden">
            <div className="p-3 bg-gray-50 border-b border-gray-200">
              <h3 className="text-sm font-bold text-gray-700">Select System</h3>
              <p className="text-xs text-gray-500 mt-0.5">Choose which health system to work with</p>
            </div>

            <div className="p-2">
              {systems.map((system) => (
                <button
                  key={system.id}
                  onClick={() => handleSystemSelect(system.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors mb-2 last:mb-0 ${
                    activeSystem === system.id
                      ? system.color === 'blue'
                        ? 'bg-blue-50 border-2 border-blue-500'
                        : 'bg-green-50 border-2 border-green-500'
                      : 'bg-gray-50 border-2 border-transparent hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      system.color === 'blue' ? 'bg-blue-100' : 'bg-green-100'
                    }`}>
                      <Server className={`w-5 h-5 ${
                        system.color === 'blue' ? 'text-blue-600' : 'text-green-600'
                      }`} />
                    </div>
                    <div className="flex flex-col items-start">
                      <span className="text-sm font-bold text-gray-900">{system.name}</span>
                      <span className="text-xs text-gray-600">{system.fullName}</span>
                      <span className="text-[10px] text-gray-400 mt-0.5">{system.url}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {system.configured ? (
                      <div className="flex items-center gap-1 px-2 py-1 bg-green-100 rounded-full">
                        <Check className="w-3 h-3 text-green-600" />
                        <span className="text-xs font-medium text-green-700">Ready</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 px-2 py-1 bg-orange-100 rounded-full">
                        <AlertCircle className="w-3 h-3 text-orange-600" />
                        <span className="text-xs font-medium text-orange-700">Setup</span>
                      </div>
                    )}

                    {activeSystem === system.id && (
                      <Check className={`w-5 h-5 ${
                        system.color === 'blue' ? 'text-blue-600' : 'text-green-600'
                      }`} />
                    )}
                  </div>
                </button>
              ))}
            </div>

            <div className="p-3 bg-gray-50 border-t border-gray-200">
              <p className="text-xs text-gray-500 text-center">
                Each system maintains separate configurations
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default SystemSelector;
