import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { RootState } from '../../store/store';
import {
  startLoadingBookings,
  loadBookingsSuccess,
  loadBookingsError,
  selectBooking,
  startCancellation,
  cancellationSuccess,
  cancellationError,
} from '../../store/slices/bookingSlice';
import bookingService from '../../services/bookingService';
import BookingCard from './BookingCard';
import LoadingSpinner from '../UI/LoadingSpinner';

const BookingHistory: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { bookings, isLoadingBookings, bookingsError, isCancelling } = useSelector(
    (state: RootState) => state.booking
  );
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'status'>('date');
  const [showCancelModal, setShowCancelModal] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    loadBookings();
  }, [isAuthenticated, navigate]);

  const loadBookings = async () => {
    dispatch(startLoadingBookings());
    try {
      const userBookings = await bookingService.getUserBookings();
      dispatch(loadBookingsSuccess(userBookings));
    } catch (error) {
      dispatch(loadBookingsError(error instanceof Error ? error.message : 'Failed to load bookings'));
    }
  };

  const handleViewBooking = (bookingId: string) => {
    dispatch(selectBooking(bookingId));
    navigate(`/booking/${bookingId}`);
  };

  const handleModifyBooking = (bookingId: string) => {
    dispatch(selectBooking(bookingId));
    navigate(`/booking/${bookingId}/modify`);
  };

  const handleCancelBooking = (bookingId: string) => {
    setShowCancelModal(bookingId);
  };

  const confirmCancellation = async () => {
    if (!showCancelModal) return;

    dispatch(startCancellation());
    try {
      await bookingService.cancelBooking(showCancelModal, cancelReason);
      dispatch(cancellationSuccess(showCancelModal));
      setShowCancelModal(null);
      setCancelReason('');
      // Reload bookings to get updated status
      loadBookings();
    } catch (error) {
      dispatch(cancellationError(error instanceof Error ? error.message : 'Failed to cancel booking'));
    }
  };

  const filteredAndSortedBookings = React.useMemo(() => {
    let filtered = bookings;

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(booking => booking.status === filterStatus);
    }

    // Sort bookings
    filtered.sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.travelDate).getTime() - new Date(a.travelDate).getTime();
      } else {
        return a.status.localeCompare(b.status);
      }
    });

    return filtered;
  }, [bookings, filterStatus, sortBy]);

  const getStatusCounts = (): { all: number; [key: string]: number } => {
    const counts = bookings.reduce((acc, booking) => {
      acc[booking.status] = (acc[booking.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return {
      all: bookings.length,
      ...counts,
    };
  };

  const statusCounts = getStatusCounts();

  if (!isAuthenticated) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Authentication Required</h2>
          <p className="text-gray-600 mb-4">Please log in to view your bookings.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Bookings</h1>
        <p className="text-gray-600">Manage your flight bookings and travel history</p>
      </div>

      {/* Filters and Controls */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Status Filter */}
            <div>
              <label htmlFor="statusFilter" className="block text-sm font-medium text-gray-700 mb-1">
                Filter by Status
              </label>
              <select
                id="statusFilter"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All ({statusCounts.all})</option>
                {statusCounts.confirmed && (
                  <option value="confirmed">Confirmed ({statusCounts.confirmed})</option>
                )}
                {statusCounts.pending && (
                  <option value="pending">Pending ({statusCounts.pending})</option>
                )}
                {statusCounts.ticketed && (
                  <option value="ticketed">Ticketed ({statusCounts.ticketed})</option>
                )}
                {statusCounts.cancelled && (
                  <option value="cancelled">Cancelled ({statusCounts.cancelled})</option>
                )}
                {statusCounts.completed && (
                  <option value="completed">Completed ({statusCounts.completed})</option>
                )}
              </select>
            </div>

            {/* Sort By */}
            <div>
              <label htmlFor="sortBy" className="block text-sm font-medium text-gray-700 mb-1">
                Sort By
              </label>
              <select
                id="sortBy"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'date' | 'status')}
                className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="date">Travel Date</option>
                <option value="status">Status</option>
              </select>
            </div>
          </div>

          <button
            onClick={loadBookings}
            disabled={isLoadingBookings}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
          >
            {isLoadingBookings ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Refreshing...
              </>
            ) : (
              'Refresh'
            )}
          </button>
        </div>
      </div>

      {/* Error Message */}
      {bookingsError && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
          <p className="text-red-600">{bookingsError}</p>
        </div>
      )}

      {/* Loading State */}
      {isLoadingBookings && bookings.length === 0 && (
        <div className="text-center py-12">
          <LoadingSpinner size="lg" />
          <p className="text-gray-600 mt-4">Loading your bookings...</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoadingBookings && filteredAndSortedBookings.length === 0 && !bookingsError && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {filterStatus === 'all' ? 'No bookings found' : `No ${filterStatus} bookings found`}
          </h3>
          <p className="text-gray-600 mb-4">
            {filterStatus === 'all' 
              ? "You haven't made any flight bookings yet."
              : `You don't have any ${filterStatus} bookings.`
            }
          </p>
          <button
            onClick={() => navigate('/')}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
          >
            Search Flights
          </button>
        </div>
      )}

      {/* Bookings List */}
      {filteredAndSortedBookings.length > 0 && (
        <div className="space-y-4">
          {filteredAndSortedBookings.map((booking) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              onView={handleViewBooking}
              onModify={handleModifyBooking}
              onCancel={handleCancelBooking}
            />
          ))}
        </div>
      )}

      {/* Cancellation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Cancel Booking</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to cancel this booking? This action cannot be undone.
            </p>
            
            <div className="mb-4">
              <label htmlFor="cancelReason" className="block text-sm font-medium text-gray-700 mb-1">
                Reason for cancellation (optional)
              </label>
              <textarea
                id="cancelReason"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={3}
                placeholder="Enter reason for cancellation..."
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCancelModal(null);
                  setCancelReason('');
                }}
                disabled={isCancelling}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                Keep Booking
              </button>
              <button
                onClick={confirmCancellation}
                disabled={isCancelling}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center justify-center"
              >
                {isCancelling ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Cancelling...
                  </>
                ) : (
                  'Cancel Booking'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingHistory;