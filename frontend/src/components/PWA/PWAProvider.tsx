import React, { useEffect } from 'react';
import { usePWA } from '../../hooks/usePWA';
import { useMobileDetection } from '../../hooks/useMobileDetection';
import InstallPrompt from './InstallPrompt';
import OfflineIndicator from './OfflineIndicator';

interface PWAProviderProps {
  children: React.ReactNode;
}

const PWAProvider: React.FC<PWAProviderProps> = ({ children }) => {
  // Initialize PWA and mobile detection hooks
  usePWA();
  useMobileDetection();

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then((registration) => {
            console.log('SW registered: ', registration);
          })
          .catch((registrationError) => {
            console.log('SW registration failed: ', registrationError);
          });
      });
    }

    // Handle iOS specific PWA features
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIOS) {
      // Add iOS specific meta tags dynamically if needed
      const viewport = document.querySelector('meta[name="viewport"]');
      if (viewport) {
        viewport.setAttribute('content', 
          'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover'
        );
      }
    }

    // Handle Android specific PWA features
    const isAndroid = /Android/.test(navigator.userAgent);
    if (isAndroid) {
      // Android specific optimizations
      document.documentElement.style.setProperty('--safe-area-inset-top', '0px');
    }
  }, []);

  return (
    <>
      {children}
      <InstallPrompt />
      <OfflineIndicator />
    </>
  );
};

export default PWAProvider;