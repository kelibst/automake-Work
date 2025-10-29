import React from 'react';
import { CheckCircle2, AlertCircle, Clock } from 'lucide-react';

/**
 * SystemStatus Component
 * Shows the configuration status of the active system
 */
function SystemStatus({ system, configured, lastSync }) {
  const systemInfo = {
    dhims2: {
      name: 'DHIMS2',
      color: 'blue',
      url: 'events.chimgh.org'
    },
    lhims: {
      name: 'LHIMS',
      color: 'green',
      url: '10.10.0.59/lhims_182'
    }
  };

  const info = systemInfo[system] || systemInfo.dhims2;

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  return (
    <div className={`rounded-lg border-2 p-3 ${
      configured
        ? info.color === 'blue'
          ? 'border-blue-200 bg-blue-50'
          : 'border-green-200 bg-green-50'
        : 'border-orange-200 bg-orange-50'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {configured ? (
            <CheckCircle2 className={`w-5 h-5 ${
              info.color === 'blue' ? 'text-blue-600' : 'text-green-600'
            }`} />
          ) : (
            <AlertCircle className="w-5 h-5 text-orange-600" />
          )}
          <div>
            <h3 className="text-sm font-bold text-gray-900">
              {info.name} Status
            </h3>
            <p className="text-xs text-gray-600">{info.url}</p>
          </div>
        </div>

        <div className={`px-3 py-1 rounded-full ${
          configured
            ? info.color === 'blue'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-green-100 text-green-700'
            : 'bg-orange-100 text-orange-700'
        }`}>
          <span className="text-xs font-bold">
            {configured ? 'Configured' : 'Not Configured'}
          </span>
        </div>
      </div>

      {configured && lastSync && (
        <div className="mt-2 pt-2 border-t border-gray-200 flex items-center gap-2">
          <Clock className="w-3 h-3 text-gray-400" />
          <span className="text-xs text-gray-600">
            Last sync: {formatDate(lastSync)}
          </span>
        </div>
      )}

      {!configured && (
        <div className="mt-2 pt-2 border-t border-orange-200">
          <p className="text-xs text-gray-600">
            Complete API discovery to start using this system
          </p>
        </div>
      )}
    </div>
  );
}

export default SystemStatus;
