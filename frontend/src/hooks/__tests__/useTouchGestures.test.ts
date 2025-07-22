import { renderHook } from '@testing-library/react-hooks';
import { useTouchGestures } from '../useTouchGestures';

describe('useTouchGestures', () => {
  let element: HTMLDivElement;
  
  beforeEach(() => {
    // Create a DOM element for testing
    element = document.createElement('div');
    document.body.appendChild(element);
    
    // Mock element ref
    jest.spyOn(React, 'useRef').mockImplementation(() => ({
      current: element
    }));
  });
  
  afterEach(() => {
    document.body.removeChild(element);
    jest.clearAllMocks();
  });
  
  it('attaches touch event listeners to the element', () => {
    const addEventListenerSpy = jest.spyOn(element, 'addEventListener');
    
    renderHook(() => useTouchGestures());
    
    expect(addEventListenerSpy).toHaveBeenCalledWith('touchstart', expect.any(Function), { passive: true });
    expect(addEventListenerSpy).toHaveBeenCalledWith('touchmove', expect.any(Function), { passive: true });
    expect(addEventListenerSpy).toHaveBeenCalledWith('touchend', expect.any(Function), { passive: true });
  });
  
  it('detects swipe right gesture', () => {
    const onSwipeRight = jest.fn();
    
    renderHook(() => useTouchGestures({
      onSwipeRight,
      swipeThreshold: 50
    }));
    
    // Simulate touch start
    const touchStartEvent = new TouchEvent('touchstart', {
      bubbles: true,
      touches: [new Touch({
        identifier: 0,
        target: element,
        clientX: 50,
        clientY: 50
      })]
    });
    element.dispatchEvent(touchStartEvent);
    
    // Simulate touch end with horizontal movement to the right
    const touchEndEvent = new TouchEvent('touchend', {
      bubbles: true,
      changedTouches: [new Touch({
        identifier: 0,
        target: element,
        clientX: 150, // Moved 100px to the right
        clientY: 50
      })]
    });
    element.dispatchEvent(touchEndEvent);
    
    expect(onSwipeRight).toHaveBeenCalled();
  });
  
  it('detects swipe left gesture', () => {
    const onSwipeLeft = jest.fn();
    
    renderHook(() => useTouchGestures({
      onSwipeLeft,
      swipeThreshold: 50
    }));
    
    // Simulate touch start
    const touchStartEvent = new TouchEvent('touchstart', {
      bubbles: true,
      touches: [new Touch({
        identifier: 0,
        target: element,
        clientX: 150,
        clientY: 50
      })]
    });
    element.dispatchEvent(touchStartEvent);
    
    // Simulate touch end with horizontal movement to the left
    const touchEndEvent = new TouchEvent('touchend', {
      bubbles: true,
      changedTouches: [new Touch({
        identifier: 0,
        target: element,
        clientX: 50, // Moved 100px to the left
        clientY: 50
      })]
    });
    element.dispatchEvent(touchEndEvent);
    
    expect(onSwipeLeft).toHaveBeenCalled();
  });
  
  it('detects tap gesture', () => {
    const onTap = jest.fn();
    
    renderHook(() => useTouchGestures({
      onTap
    }));
    
    // Simulate touch start
    const touchStartEvent = new TouchEvent('touchstart', {
      bubbles: true,
      touches: [new Touch({
        identifier: 0,
        target: element,
        clientX: 50,
        clientY: 50
      })]
    });
    element.dispatchEvent(touchStartEvent);
    
    // Simulate touch end with minimal movement
    const touchEndEvent = new TouchEvent('touchend', {
      bubbles: true,
      changedTouches: [new Touch({
        identifier: 0,
        target: element,
        clientX: 52, // Minimal movement
        clientY: 51
      })]
    });
    element.dispatchEvent(touchEndEvent);
    
    expect(onTap).toHaveBeenCalled();
  });
  
  it('detects double tap gesture', () => {
    const onDoubleTap = jest.fn();
    
    renderHook(() => useTouchGestures({
      onDoubleTap
    }));
    
    // First tap
    element.dispatchEvent(new TouchEvent('touchstart', {
      bubbles: true,
      touches: [new Touch({
        identifier: 0,
        target: element,
        clientX: 50,
        clientY: 50
      })]
    }));
    
    element.dispatchEvent(new TouchEvent('touchend', {
      bubbles: true,
      changedTouches: [new Touch({
        identifier: 0,
        target: element,
        clientX: 51,
        clientY: 51
      })]
    }));
    
    // Second tap within 300ms
    element.dispatchEvent(new TouchEvent('touchstart', {
      bubbles: true,
      touches: [new Touch({
        identifier: 0,
        target: element,
        clientX: 52,
        clientY: 52
      })]
    }));
    
    element.dispatchEvent(new TouchEvent('touchend', {
      bubbles: true,
      changedTouches: [new Touch({
        identifier: 0,
        target: element,
        clientX: 53,
        clientY: 53
      })]
    }));
    
    expect(onDoubleTap).toHaveBeenCalled();
  });
  
  it('cleans up event listeners on unmount', () => {
    const removeEventListenerSpy = jest.spyOn(element, 'removeEventListener');
    
    const { unmount } = renderHook(() => useTouchGestures());
    
    unmount();
    
    expect(removeEventListenerSpy).toHaveBeenCalledWith('touchstart', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('touchmove', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('touchend', expect.any(Function));
  });
});