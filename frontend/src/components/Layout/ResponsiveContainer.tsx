import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';

interface ResponsiveContainerProps {
  children: React.ReactNode;
  className?: string;
  mobileClassName?: string;
  tabletClassName?: string;
  desktopClassName?: string;
}

/**
 * A container component that applies different styles based on device type
 */
const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  children,
  className = '',
  mobileClassName = '',
  tabletClassName = '',
  desktopClassName = '',
}) => {
  const { isMobile, isTablet, isDesktop } = useSelector((state: RootState) => state.ui.mobile);

  // Determine which class to apply based on device type
  const deviceSpecificClass = isMobile 
    ? mobileClassName 
    : isTablet 
      ? tabletClassName 
      : desktopClassName;

  return (
    <div className={`${className} ${deviceSpecificClass}`}>
      {children}
    </div>
  );
};

export default ResponsiveContainer;