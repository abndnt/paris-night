import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { usePWA } from '../../hooks/usePWA';

const InstallPrompt: React.FC = () => {
  const { showInstallPrompt } = useSelector((state: RootState) => state.ui.pwa);
  const { installApp, dismissInstallPrompt } = usePWA();

  if (!showInstallPrompt) return null;

  const handleInstall = async () => {
    const success = await installApp();
    if (!success) {
      // Show fallback instructions for iOS or other browsers
      console.log('Install prompt not available, showing manual instructions');
    }
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50">
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <div className="w-10 h-10 bg-primary-500 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-gray-900">
            Install FlightSearch App
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Get quick access and work offline by installing our app on your device.
          </p>
          <div className="flex space-x-2 mt-3">
            <button
              onClick={handleInstall}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Install
            </button>
            <button
              onClick={dismissInstallPrompt}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Not now
            </button>
          </div>
        </div>
        <button
          onClick={dismissInstallPrompt}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default InstallPrompt;