import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { setPWAState, addNotification } from '../store/slices/uiSlice';

/**
 * Hook to detect online/offline status
 * Updates the Redux store and shows notifications when status changes
 */
export const useOfflineDetection = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    const handleOnline = () => {
      dispatch(setPWAState({ isOnline: true }));
      dispatch(addNotification({
        type: 'success',
        message: 'You are back online!'
      }));
    };

    const handleOffline = () => {
      dispatch(setPWAState({ isOnline: false }));
      dispatch(addNotification({
        type: 'warning',
        message: 'You are offline. Some features may be limited.'
      }));
    };

    // Set initial state
    dispatch(setPWAState({ isOnline: navigator.onLine }));

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [dispatch]);
};

export default useOfflineDetection;