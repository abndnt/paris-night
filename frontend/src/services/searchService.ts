import { SearchCriteria, FlightSearch, FlightResult } from '../store/slices/searchSlice';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

export class SearchService {
  private static async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = localStorage.getItem('token');
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Network error' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  static async searchFlights(criteria: SearchCriteria): Promise<FlightSearch> {
    return this.request<FlightSearch>('/search/flights', {
      method: 'POST',
      body: JSON.stringify({ searchCriteria: criteria }),
    });
  }

  static async getSearchResults(searchId: string): Promise<FlightSearch> {
    return this.request<FlightSearch>(`/search/results/${searchId}`);
  }

  static async getSearchHistory(): Promise<FlightSearch[]> {
    return this.request<FlightSearch[]>('/search/history');
  }

  static async filterResults(searchId: string, filters: any): Promise<FlightResult[]> {
    return this.request<FlightResult[]>(`/search/filter`, {
      method: 'POST',
      body: JSON.stringify({ searchId, filters }),
    });
  }

  static async getFlightDetails(flightId: string): Promise<FlightResult> {
    return this.request<FlightResult>(`/search/flight/${flightId}`);
  }
}