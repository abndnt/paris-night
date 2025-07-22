import React from 'react';
import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import ResponsiveContainer from '../ResponsiveContainer';

// Mock redux store
const mockStore = configureStore([]);

describe('ResponsiveContainer', () => {
  it('applies mobile class when on mobile device', () => {
    const store = mockStore({
      ui: {
        mobile: {
          isMobile: true,
          isTablet: false,
          isDesktop: false
        }
      }
    });
    
    const { container } = render(
      <Provider store={store}>
        <ResponsiveContainer 
          className="base-class"
          mobileClassName="mobile-class"
          tabletClassName="tablet-class"
          desktopClassName="desktop-class"
        >
          Test Content
        </ResponsiveContainer>
      </Provider>
    );
    
    expect(container.firstChild).toHaveClass('base-class');
    expect(container.firstChild).toHaveClass('mobile-class');
    expect(container.firstChild).not.toHaveClass('tablet-class');
    expect(container.firstChild).not.toHaveClass('desktop-class');
  });
  
  it('applies tablet class when on tablet device', () => {
    const store = mockStore({
      ui: {
        mobile: {
          isMobile: false,
          isTablet: true,
          isDesktop: false
        }
      }
    });
    
    const { container } = render(
      <Provider store={store}>
        <ResponsiveContainer 
          className="base-class"
          mobileClassName="mobile-class"
          tabletClassName="tablet-class"
          desktopClassName="desktop-class"
        >
          Test Content
        </ResponsiveContainer>
      </Provider>
    );
    
    expect(container.firstChild).toHaveClass('base-class');
    expect(container.firstChild).not.toHaveClass('mobile-class');
    expect(container.firstChild).toHaveClass('tablet-class');
    expect(container.firstChild).not.toHaveClass('desktop-class');
  });
  
  it('applies desktop class when on desktop device', () => {
    const store = mockStore({
      ui: {
        mobile: {
          isMobile: false,
          isTablet: false,
          isDesktop: true
        }
      }
    });
    
    const { container } = render(
      <Provider store={store}>
        <ResponsiveContainer 
          className="base-class"
          mobileClassName="mobile-class"
          tabletClassName="tablet-class"
          desktopClassName="desktop-class"
        >
          Test Content
        </ResponsiveContainer>
      </Provider>
    );
    
    expect(container.firstChild).toHaveClass('base-class');
    expect(container.firstChild).not.toHaveClass('mobile-class');
    expect(container.firstChild).not.toHaveClass('tablet-class');
    expect(container.firstChild).toHaveClass('desktop-class');
  });
  
  it('renders children correctly', () => {
    const store = mockStore({
      ui: {
        mobile: {
          isMobile: false,
          isTablet: false,
          isDesktop: true
        }
      }
    });
    
    const { getByText } = render(
      <Provider store={store}>
        <ResponsiveContainer>
          <div>Test Child Content</div>
        </ResponsiveContainer>
      </Provider>
    );
    
    expect(getByText('Test Child Content')).toBeInTheDocument();
  });
});