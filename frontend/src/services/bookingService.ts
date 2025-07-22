import { Booking, BookingFormData, PassengerInfo, PaymentMethod } from '../store/slices/bookingSlice';
import { FlightResult } from '../store/slices/searchSlice';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export interface CreateBookingRequest {
  flightDetails: FlightResult;
  passengers: PassengerInfo[];
  paymentMethod?: PaymentMethod;
  contactEmail?: string;
  contactPhone?: string;
}

export interface UpdateBookingRequest {
  passengers?: PassengerInfo[];
  paymentMethod?: PaymentMethod;
  contactEmail?: string;
  contactPhone?: string;
}

class BookingService {
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('authToken');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  async createBooking(bookingData: CreateBookingRequest): Promise<Booking> {
    const response = await fetch(`${API_BASE_URL}/api/booking`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(bookingData),
    });

    const booking = await this.handleResponse<Booking>(response);
    
    // Convert date strings to Date objects
    return {
      ...booking,
      travelDate: new Date(booking.travelDate),
      createdAt: new Date(booking.createdAt),
      updatedAt: new Date(booking.updatedAt),
    };
  }

  async getBooking(bookingId: string): Promise<Booking> {
    const response = await fetch(`${API_BASE_URL}/api/booking/${bookingId}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    const booking = await this.handleResponse<Booking>(response);
    
    // Convert date strings to Date objects
    return {
      ...booking,
      travelDate: new Date(booking.travelDate),
      createdAt: new Date(booking.createdAt),
      updatedAt: new Date(booking.updatedAt),
    };
  }

  async getBookingByConfirmation(confirmationCode: string): Promise<Booking> {
    const response = await fetch(`${API_BASE_URL}/api/booking/confirmation/${confirmationCode}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    const booking = await this.handleResponse<Booking>(response);
    
    // Convert date strings to Date objects
    return {
      ...booking,
      travelDate: new Date(booking.travelDate),
      createdAt: new Date(booking.createdAt),
      updatedAt: new Date(booking.updatedAt),
    };
  }

  async getUserBookings(page: number = 1, limit: number = 20): Promise<Booking[]> {
    const offset = (page - 1) * limit;
    const response = await fetch(`${API_BASE_URL}/api/booking/user?limit=${limit}&offset=${offset}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    const bookings = await this.handleResponse<Booking[]>(response);
    
    // Convert date strings to Date objects
    return bookings.map(booking => ({
      ...booking,
      travelDate: new Date(booking.travelDate),
      createdAt: new Date(booking.createdAt),
      updatedAt: new Date(booking.updatedAt),
    }));
  }

  async updateBooking(bookingId: string, updateData: UpdateBookingRequest): Promise<Booking> {
    const response = await fetch(`${API_BASE_URL}/api/booking/${bookingId}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(updateData),
    });

    const booking = await this.handleResponse<Booking>(response);
    
    // Convert date strings to Date objects
    return {
      ...booking,
      travelDate: new Date(booking.travelDate),
      createdAt: new Date(booking.createdAt),
      updatedAt: new Date(booking.updatedAt),
    };
  }

  async cancelBooking(bookingId: string, reason?: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/booking/${bookingId}/cancel`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ reason }),
    });

    await this.handleResponse<void>(response);
  }

  async confirmPayment(bookingId: string, paymentMethodDetails?: any): Promise<Booking> {
    const response = await fetch(`${API_BASE_URL}/api/booking/${bookingId}/confirm-payment`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ paymentMethodDetails }),
    });

    const booking = await this.handleResponse<Booking>(response);
    
    // Convert date strings to Date objects
    return {
      ...booking,
      travelDate: new Date(booking.travelDate),
      createdAt: new Date(booking.createdAt),
      updatedAt: new Date(booking.updatedAt),
    };
  }

  async getBookingReceipt(bookingId: string): Promise<Blob> {
    const response = await fetch(`${API_BASE_URL}/api/booking/${bookingId}/receipt`, {
      method: 'GET',
      headers: {
        ...this.getAuthHeaders(),
        'Accept': 'application/pdf',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to download receipt: ${response.status}`);
    }

    return response.blob();
  }

  // Validation helpers
  validatePassengerInfo(passenger: PassengerInfo): string[] {
    const errors: string[] = [];

    if (!passenger.firstName?.trim()) {
      errors.push('First name is required');
    } else if (!/^[a-zA-Z\s\-']+$/.test(passenger.firstName)) {
      errors.push('First name can only contain letters, spaces, hyphens, and apostrophes');
    }

    if (!passenger.lastName?.trim()) {
      errors.push('Last name is required');
    } else if (!/^[a-zA-Z\s\-']+$/.test(passenger.lastName)) {
      errors.push('Last name can only contain letters, spaces, hyphens, and apostrophes');
    }

    if (!passenger.dateOfBirth) {
      errors.push('Date of birth is required');
    } else if (new Date(passenger.dateOfBirth) > new Date()) {
      errors.push('Date of birth cannot be in the future');
    }

    if (passenger.passportNumber && !/^[A-Z0-9]+$/.test(passenger.passportNumber)) {
      errors.push('Passport number can only contain uppercase letters and numbers');
    }

    if (passenger.knownTravelerNumber && !/^[0-9]+$/.test(passenger.knownTravelerNumber)) {
      errors.push('Known Traveler Number can only contain numbers');
    }

    return errors;
  }

  validatePaymentMethod(paymentMethod: PaymentMethod): string[] {
    const errors: string[] = [];

    if (!paymentMethod.type) {
      errors.push('Payment method type is required');
    }

    if (paymentMethod.type === 'credit_card' || paymentMethod.type === 'mixed') {
      if (!paymentMethod.creditCard) {
        errors.push('Credit card information is required');
      } else {
        const { creditCard } = paymentMethod;
        
        if (!creditCard.holderName?.trim()) {
          errors.push('Cardholder name is required');
        }

        if (!creditCard.last4 || !/^[0-9]{4}$/.test(creditCard.last4)) {
          errors.push('Invalid card number');
        }

        if (!creditCard.expiryMonth || creditCard.expiryMonth < 1 || creditCard.expiryMonth > 12) {
          errors.push('Invalid expiry month');
        }

        if (!creditCard.expiryYear || creditCard.expiryYear < new Date().getFullYear()) {
          errors.push('Invalid expiry year');
        }
      }
    }

    if (paymentMethod.type === 'points' || paymentMethod.type === 'mixed') {
      if (!paymentMethod.pointsUsed) {
        errors.push('Points information is required');
      } else {
        const { pointsUsed } = paymentMethod;
        
        if (!pointsUsed.program?.trim()) {
          errors.push('Reward program is required');
        }

        if (!pointsUsed.points || pointsUsed.points < 1) {
          errors.push('Points amount must be greater than 0');
        }
      }
    }

    if (!paymentMethod.totalAmount || paymentMethod.totalAmount < 0) {
      errors.push('Total amount must be greater than or equal to 0');
    }

    if (!paymentMethod.currency || paymentMethod.currency.length !== 3) {
      errors.push('Valid currency code is required');
    }

    return errors;
  }

  validateBookingForm(formData: BookingFormData): string[] {
    const errors: string[] = [];

    if (!formData.passengers || formData.passengers.length === 0) {
      errors.push('At least one passenger is required');
    } else {
      formData.passengers.forEach((passenger, index) => {
        const passengerErrors = this.validatePassengerInfo(passenger);
        passengerErrors.forEach(error => {
          errors.push(`Passenger ${index + 1}: ${error}`);
        });
      });
    }

    if (formData.paymentMethod) {
      const paymentErrors = this.validatePaymentMethod(formData.paymentMethod);
      errors.push(...paymentErrors);
    }

    if (formData.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactEmail)) {
      errors.push('Invalid email address');
    }

    if (formData.contactPhone && !/^\+?[\d\s\-\(\)]+$/.test(formData.contactPhone)) {
      errors.push('Invalid phone number');
    }

    return errors;
  }
}

export const bookingService = new BookingService();
export default bookingService;