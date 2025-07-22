import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { FlightResult } from './searchSlice';

// Types based on backend models
export interface PassengerInfo {
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  passportNumber?: string;
  knownTravelerNumber?: string;
  seatPreference?: 'aisle' | 'window' | 'middle';
  mealPreference?: string;
  specialRequests?: string[];
}

export interface CreditCardInfo {
  last4: string;
  brand: string;
  expiryMonth: number;
  expiryYear: number;
  holderName: string;
}

export interface PointsPaymentInfo {
  program: string;
  points: number;
  cashComponent?: number;
  transferDetails?: {
    fromProgram: string;
    toProgram: string;
    transferRatio: number;
    transferredPoints: number;
  };
}

export interface PaymentMethod {
  type: 'credit_card' | 'points' | 'mixed';
  creditCard?: CreditCardInfo;
  pointsUsed?: PointsPaymentInfo;
  totalAmount: number;
  currency: string;
}

export interface CostBreakdown {
  baseFare: number;
  taxes: number;
  fees: number;
  pointsValue?: number;
  totalCash: number;
  totalPoints?: number;
  currency: string;
}

export type BookingStatus = 'pending' | 'confirmed' | 'ticketed' | 'cancelled' | 'completed';

export interface Booking {
  id: string;
  userId: string;
  searchId?: string;
  confirmationCode?: string;
  flightDetails: FlightResult;
  passengers: PassengerInfo[];
  paymentMethod?: PaymentMethod;
  totalCost: CostBreakdown;
  status: BookingStatus;
  travelDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface BookingFormData {
  passengers: PassengerInfo[];
  paymentMethod?: PaymentMethod;
  contactEmail?: string;
  contactPhone?: string;
}

export type BookingStep = 'passengers' | 'payment' | 'review' | 'confirmation';

interface BookingState {
  // Current booking flow
  selectedFlight: FlightResult | null;
  currentStep: BookingStep;
  formData: BookingFormData;
  isBooking: boolean;
  bookingError: string | null;
  
  // Current booking
  currentBooking: Booking | null;
  
  // Booking history
  bookings: Booking[];
  isLoadingBookings: boolean;
  bookingsError: string | null;
  
  // Booking details
  selectedBookingId: string | null;
  isLoadingBookingDetails: boolean;
  bookingDetailsError: string | null;
  
  // Modification/cancellation
  isModifying: boolean;
  isCancelling: boolean;
  modificationError: string | null;
}

const initialState: BookingState = {
  selectedFlight: null,
  currentStep: 'passengers',
  formData: {
    passengers: [],
  },
  isBooking: false,
  bookingError: null,
  
  currentBooking: null,
  
  bookings: [],
  isLoadingBookings: false,
  bookingsError: null,
  
  selectedBookingId: null,
  isLoadingBookingDetails: false,
  bookingDetailsError: null,
  
  isModifying: false,
  isCancelling: false,
  modificationError: null,
};

const bookingSlice = createSlice({
  name: 'booking',
  initialState,
  reducers: {
    // Booking flow actions
    startBookingFlow: (state, action: PayloadAction<FlightResult>) => {
      state.selectedFlight = action.payload;
      state.currentStep = 'passengers';
      state.formData = {
        passengers: [],
      };
      state.bookingError = null;
      state.currentBooking = null;
    },
    
    setBookingStep: (state, action: PayloadAction<BookingStep>) => {
      state.currentStep = action.payload;
    },
    
    updatePassengers: (state, action: PayloadAction<PassengerInfo[]>) => {
      state.formData.passengers = action.payload;
    },
    
    updatePaymentMethod: (state, action: PayloadAction<PaymentMethod>) => {
      state.formData.paymentMethod = action.payload;
    },
    
    updateContactInfo: (state, action: PayloadAction<{ email?: string; phone?: string }>) => {
      if (action.payload.email !== undefined) {
        state.formData.contactEmail = action.payload.email;
      }
      if (action.payload.phone !== undefined) {
        state.formData.contactPhone = action.payload.phone;
      }
    },
    
    // Booking creation
    startBooking: (state) => {
      state.isBooking = true;
      state.bookingError = null;
    },
    
    bookingSuccess: (state, action: PayloadAction<Booking>) => {
      state.isBooking = false;
      state.currentBooking = action.payload;
      state.currentStep = 'confirmation';
      
      // Add to bookings list if not already there
      const existingIndex = state.bookings.findIndex(b => b.id === action.payload.id);
      if (existingIndex >= 0) {
        state.bookings[existingIndex] = action.payload;
      } else {
        state.bookings.unshift(action.payload);
      }
    },
    
    bookingError: (state, action: PayloadAction<string>) => {
      state.isBooking = false;
      state.bookingError = action.payload;
    },
    
    clearBookingFlow: (state) => {
      state.selectedFlight = null;
      state.currentStep = 'passengers';
      state.formData = { passengers: [] };
      state.bookingError = null;
      state.currentBooking = null;
    },
    
    // Booking history
    startLoadingBookings: (state) => {
      state.isLoadingBookings = true;
      state.bookingsError = null;
    },
    
    loadBookingsSuccess: (state, action: PayloadAction<Booking[]>) => {
      state.isLoadingBookings = false;
      state.bookings = action.payload;
    },
    
    loadBookingsError: (state, action: PayloadAction<string>) => {
      state.isLoadingBookings = false;
      state.bookingsError = action.payload;
    },
    
    // Booking details
    selectBooking: (state, action: PayloadAction<string>) => {
      state.selectedBookingId = action.payload;
    },
    
    startLoadingBookingDetails: (state) => {
      state.isLoadingBookingDetails = true;
      state.bookingDetailsError = null;
    },
    
    loadBookingDetailsSuccess: (state, action: PayloadAction<Booking>) => {
      state.isLoadingBookingDetails = false;
      
      // Update the booking in the list
      const existingIndex = state.bookings.findIndex(b => b.id === action.payload.id);
      if (existingIndex >= 0) {
        state.bookings[existingIndex] = action.payload;
      } else {
        state.bookings.unshift(action.payload);
      }
    },
    
    loadBookingDetailsError: (state, action: PayloadAction<string>) => {
      state.isLoadingBookingDetails = false;
      state.bookingDetailsError = action.payload;
    },
    
    // Booking modification
    startModification: (state) => {
      state.isModifying = true;
      state.modificationError = null;
    },
    
    modificationSuccess: (state, action: PayloadAction<Booking>) => {
      state.isModifying = false;
      
      // Update the booking in the list
      const existingIndex = state.bookings.findIndex(b => b.id === action.payload.id);
      if (existingIndex >= 0) {
        state.bookings[existingIndex] = action.payload;
      }
    },
    
    modificationError: (state, action: PayloadAction<string>) => {
      state.isModifying = false;
      state.modificationError = action.payload;
    },
    
    // Booking cancellation
    startCancellation: (state) => {
      state.isCancelling = true;
      state.modificationError = null;
    },
    
    cancellationSuccess: (state, action: PayloadAction<string>) => {
      state.isCancelling = false;
      
      // Update the booking status in the list
      const existingIndex = state.bookings.findIndex(b => b.id === action.payload);
      if (existingIndex >= 0) {
        state.bookings[existingIndex].status = 'cancelled';
        state.bookings[existingIndex].updatedAt = new Date();
      }
    },
    
    cancellationError: (state, action: PayloadAction<string>) => {
      state.isCancelling = false;
      state.modificationError = action.payload;
    },
    
    clearErrors: (state) => {
      state.bookingError = null;
      state.bookingsError = null;
      state.bookingDetailsError = null;
      state.modificationError = null;
    },
  },
});

export const {
  startBookingFlow,
  setBookingStep,
  updatePassengers,
  updatePaymentMethod,
  updateContactInfo,
  startBooking,
  bookingSuccess,
  bookingError,
  clearBookingFlow,
  startLoadingBookings,
  loadBookingsSuccess,
  loadBookingsError,
  selectBooking,
  startLoadingBookingDetails,
  loadBookingDetailsSuccess,
  loadBookingDetailsError,
  startModification,
  modificationSuccess,
  modificationError,
  startCancellation,
  cancellationSuccess,
  cancellationError,
  clearErrors,
} = bookingSlice.actions;

export default bookingSlice.reducer;