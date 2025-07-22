import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { setPWAState, showInstallPrompt, hideInstallPrompt } from '../store/slices/uiSlice';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const usePWA = () => {
  const dispatch = useDispatch();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    // Check if app is already installed
    const checkInstalled = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isInWebAppiOS = (window.navigator as any).standalone === true;
      const isInstalled = isStandalone || isInWebAppiOS;
      
      setIsInstalled(isInstalled);
      dispatch(setPWAState({ isInstalled }));
    };

    // Handle beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const event = e as BeforeInstallPromptEvent;
      setDeferredPrompt(event);
      dispatch(setPWAState({ canInstall: true }));
      dispatch(showInstallPrompt());
    };

    // Handle app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      dispatch(setPWAState({ isInstalled: true, canInstall: false }));
      dispatch(hideInstallPrompt());
    };

    // Handle online/offline status
    const handleOnline = () => {
      setIsOnline(true);
      dispatch(setPWAState({ isOnline: true }));
    };

    const handleOffline = () => {
      setIsOnline(false);
      dispatch(setPWAState({ isOnline: false }));
    };

    // Initial checks
    checkInstalled();

    // Event listeners
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [dispatch]);

  const installApp = async () => {
    if (!deferredPrompt) return false;

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      
      if (choiceResult.outcome === 'accepted') {
        setDeferredPrompt(null);
        dispatch(hideInstallPrompt());
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error installing PWA:', error);
      return false;
    }
  };

  const dismissInstallPrompt = () => {
    dispatch(hideInstallPrompt());
  };

  return {
    isInstalled,
    canInstall: !!deferredPrompt,
    isOnline,
    installApp,
    dismissInstallPrompt,
  };
};