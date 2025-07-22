import React from 'react';
import { useSelector } from 'react-redux';
import Header from './Header';
import Footer from './Footer';
import { RootState } from '../../store/store';
import useResponsiveLayout from '../../hooks/useResponsiveLayout';
import { useTouchGestures } from '../../hooks/useTouchGestures';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  // Use our responsive layout hook
  useResponsiveLayout();
  
  const { isMobile } = useSelector((state: RootState) => state.ui.mobile);
  
  // Add swipe gestures for mobile navigation
  const containerRef = useTouchGestures<HTMLDivElement>({
    onSwipeRight: () => {
      // Handle swipe right (e.g., open menu)
      if (isMobile) {
        document.dispatchEvent(new CustomEvent('mobile-swipe-right'));
      }
    },
    onSwipeLeft: () => {
      // Handle swipe left (e.g., close menu)
      if (isMobile) {
        document.dispatchEvent(new CustomEvent('mobile-swipe-left'));
      }
    },
  });

  return (
    <div 
      ref={containerRef}
      className="min-h-screen flex flex-col bg-gray-50 safe-area-inset"
    >
      <Header />
      <main className="flex-1 flex flex-col px-4 md:px-6 lg:px-8">
        {children}
      </main>
      <Footer />
    </div>
  );
};

export default Layout;