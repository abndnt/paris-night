// Booking service for frontend
import api from './api';

class BookingService {
  async getBookings(): Promise<any[]> {
    return api.getBookings();
  }

  async getBooking(id: string): Promise<any> {
    return api.getBooking(id);
  }

  async createBooking(bookingData: any): Promise<any> {
    return api.createBooking(bookingData);
  }

  async updateBooking(id: string, updateData: any): Promise<any> {
    return api.request(`/bookings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
  }

  async getUserBookings(): Promise<any[]> {
    return api.getBookings();
  }

  async cancelBooking(id: string, reason?: string) {
    return api.request(`/bookings/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  async modifyBooking(id: string, modifications: any) {
    return api.request(`/bookings/${id}/modify`, {
      method: 'POST',
      body: JSON.stringify(modifications),
    });
  }



  async getBookingReceipt(id: string): Promise<Blob> {
    const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';
    const response = await fetch(`${API_BASE_URL}/bookings/${id}/receipt`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.blob();
  }

  validatePassengerInfo(passenger: any) {
    const errors: string[] = [];
    
    if (!passenger.firstName?.trim()) {
      errors.push('First name is required');
    }
    
    if (!passenger.lastName?.trim()) {
      errors.push('Last name is required');
    }
    
    if (!passenger.dateOfBirth) {
      errors.push('Date of birth is required');
    }
    
    return errors;
  }
}

const bookingService = new BookingService();
export default bookingService;