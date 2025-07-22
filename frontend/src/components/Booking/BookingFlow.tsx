import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { RootState } from '../../store/store';
import { startBookingFlow, clearBookingFlow } from '../../store/slices/bookingSlice';
import { FlightResult } from '../../store/slices/searchSlice';
import PassengerInfoStep from './PassengerInfoStep';
import PaymentStep from './PaymentStep';
import BookingReviewStep from './BookingReviewStep';
import BookingConfirmationStep from './BookingConfirmationStep';

const BookingFlow: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentStep, selectedFlight, bookingError } = useSelector((state: RootState) => state.booking);
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    // Check if user is authenticated
    if (!isAuthenticated) {
      navigate('/login', { state: { from: location } });
      return;
    }

    // Initialize booking flow with flight data from location state
    const flightData = location.state?.flight as FlightResult;
    if (flightData && !selectedFlight) {
      dispatch(startBookingFlow(flightData));
    } else if (!selectedFlight) {
      // No flight selected, redirect to search
      navigate('/');
    }
  }, [dispatch, navigate, location, isAuthenticated, selectedFlight]);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      // Only clear if we're navigating away from booking flow
      if (!location.pathname.startsWith('/booking')) {
        dispatch(clearBookingFlow());
      }
    };
  }, [dispatch, location.pathname]);

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'passengers':
        return <PassengerInfoStep />;
      case 'payment':
        return <PaymentStep />;
      case 'review':
        return <BookingReviewStep />;
      case 'confirmation':
        return <BookingConfirmationStep />;
      default:
        return <PassengerInfoStep />;
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Authentication Required</h2>
          <p className="text-gray-600 mb-4">Please log in to continue with your booking.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Error Banner */}
      {bookingError && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{bookingError}</p>
            </div>
          </div>
        </div>
      )}

      {renderCurrentStep()}
    </div>
  );
};

export default BookingFlow;