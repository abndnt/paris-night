// API service for frontend
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

class ApiService {
  private baseURL: string;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Health check
  async health() {
    return this.request('/health');
  }

  // Flight search
  async searchFlights(searchCriteria: any) {
    return this.request('/flights/search', {
      method: 'POST',
      body: JSON.stringify(searchCriteria),
    });
  }

  // Chat
  async sendChatMessage(message: string, sessionId?: string) {
    return this.request('/chat', {
      method: 'POST',
      body: JSON.stringify({ message, sessionId }),
    });
  }

  // Admin endpoints
  async getDashboardData() {
    return this.request('/admin/dashboard');
  }

  async getAnalytics() {
    return this.request('/admin/analytics');
  }

  async getUsers() {
    return this.request('/admin/users');
  }

  // Booking endpoints
  async getBookings(): Promise<any[]> {
    return this.request('/bookings');
  }

  async getBooking(id: string): Promise<any> {
    return this.request(`/bookings/${id}`);
  }

  async createBooking(bookingData: any): Promise<any> {
    return this.request('/bookings', {
      method: 'POST',
      body: JSON.stringify(bookingData),
    });
  }

  // Rewards endpoints
  async getRewardAccounts() {
    return this.request('/rewards/accounts');
  }

  async getPointsBalance() {
    return this.request('/rewards/balance');
  }

  // Additional HTTP methods
  async get<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    return this.request(endpoint, { ...options, method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any, options: RequestInit = {}): Promise<T> {
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: any, options: RequestInit = {}): Promise<T> {
    return this.request(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }
}

const api = new ApiService();
export default api;