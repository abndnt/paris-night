import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { setMobileState } from '../store/slices/uiSlice';

interface MobileState {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTouchDevice: boolean;
  orientation: 'portrait' | 'landscape';
  screenWidth: number;
  screenHeight: number;
}

export const useMobileDetection = () => {
  const dispatch = useDispatch();
  const [mobileState, setLocalMobileState] = useState<MobileState>({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    isTouchDevice: false,
    orientation: 'portrait',
    screenWidth: window.innerWidth,
    screenHeight: window.innerHeight,
  });

  useEffect(() => {
    const detectDevice = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      
      const isMobile = width < 768;
      const isTablet = width >= 768 && width < 1024;
      const isDesktop = width >= 1024;
      const orientation = height > width ? 'portrait' : 'landscape';

      const newState = {
        isMobile,
        isTablet,
        isDesktop,
        isTouchDevice,
        orientation,
        screenWidth: width,
        screenHeight: height,
      };

      setLocalMobileState(newState);
      dispatch(setMobileState({
        isMobile,
        isTablet,
        isDesktop,
        isTouchDevice,
        orientation,
      }));
    };

    // Initial detection
    detectDevice();

    // Listen for resize and orientation changes
    window.addEventListener('resize', detectDevice);
    window.addEventListener('orientationchange', detectDevice);

    return () => {
      window.removeEventListener('resize', detectDevice);
      window.removeEventListener('orientationchange', detectDevice);
    };
  }, [dispatch]);

  return mobileState;
};