import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { setMobileState } from '../store/slices/uiSlice';

/**
 * Hook to detect device type and orientation
 * Updates the Redux store with current device information
 */
export const useResponsiveLayout = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    const updateLayout = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const orientation = width > height ? 'landscape' : 'portrait';
      
      // Detect device type based on screen width
      const isMobile = width < 640; // sm breakpoint in Tailwind
      const isTablet = width >= 640 && width < 1024; // md to lg breakpoint
      const isDesktop = width >= 1024;
      
      // Detect touch capability
      const isTouchDevice = 'ontouchstart' in window || 
        navigator.maxTouchPoints > 0 ||
        (navigator as any).msMaxTouchPoints > 0;
      
      dispatch(setMobileState({
        isMobile,
        isTablet,
        isDesktop,
        isTouchDevice,
        orientation: orientation as 'portrait' | 'landscape',
      }));
    };

    // Initial check
    updateLayout();

    // Listen for resize and orientation change events
    window.addEventListener('resize', updateLayout);
    window.addEventListener('orientationchange', updateLayout);

    return () => {
      window.removeEventListener('resize', updateLayout);
      window.removeEventListener('orientationchange', updateLayout);
    };
  }, [dispatch]);
};

export default useResponsiveLayout;