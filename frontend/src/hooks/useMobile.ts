import { useState, useEffect } from 'react';
import { isMobileDevice, getViewportSize, detectTouchDevice } from '../utils/pwa';

export interface MobileState {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTouchDevice: boolean;
  viewport: {
    width: number;
    height: number;
  };
  orientation: 'portrait' | 'landscape';
}

export const useMobile = (): MobileState => {
  const [mobileState, setMobileState] = useState<MobileState>(() => {
    const viewport = getViewportSize();
    const isTouchDevice = detectTouchDevice();
    const isMobile = viewport.width <= 768;
    const isTablet = viewport.width > 768 && viewport.width <= 1024;
    const isDesktop = viewport.width > 1024;
    const orientation = viewport.width > viewport.height ? 'landscape' : 'portrait';

    return {
      isMobile,
      isTablet,
      isDesktop,
      isTouchDevice,
      viewport,
      orientation
    };
  });

  useEffect(() => {
    const handleResize = () => {
      const viewport = getViewportSize();
      const isTouchDevice = detectTouchDevice();
      const isMobile = viewport.width <= 768;
      const isTablet = viewport.width > 768 && viewport.width <= 1024;
      const isDesktop = viewport.width > 1024;
      const orientation = viewport.width > viewport.height ? 'landscape' : 'portrait';

      setMobileState({
        isMobile,
        isTablet,
        isDesktop,
        isTouchDevice,
        viewport,
        orientation
      });
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  return mobileState;
};

export const useSwipeGestures = (
  onSwipeLeft?: () => void,
  onSwipeRight?: () => void,
  onSwipeUp?: () => void,
  onSwipeDown?: () => void,
  threshold: number = 50
) => {
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setTouchStart({ x: touch.clientX, y: touch.clientY });
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart) return;

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStart.x;
    const deltaY = touch.clientY - touchStart.y;

    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    if (absDeltaX > threshold || absDeltaY > threshold) {
      if (absDeltaX > absDeltaY) {
        // Horizontal swipe
        if (deltaX > 0) {
          onSwipeRight?.();
        } else {
          onSwipeLeft?.();
        }
      } else {
        // Vertical swipe
        if (deltaY > 0) {
          onSwipeDown?.();
        } else {
          onSwipeUp?.();
        }
      }
    }

    setTouchStart(null);
  };

  return {
    onTouchStart: handleTouchStart,
    onTouchEnd: handleTouchEnd
  };
};