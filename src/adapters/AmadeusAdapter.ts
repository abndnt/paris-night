import { BaseAirlineAdapter, AirlineConfig, AirlineSearchRequest, AirlineSearchResponse } from './BaseAirlineAdapter';
import { AirlineRateLimiter } from '../services/AirlineRateLimiter';
import { AirlineCache } from '../services/AirlineCache';

export class AmadeusAdapter extends BaseAirlineAdapter {
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor(config: AirlineConfig, rateLimiter: AirlineRateLimiter, cache: AirlineCache) {
    super('amadeus', config, rateLimiter, cache);
  }

  protected async makeApiRequest(request: AirlineSearchRequest): Promise<any> {
    // Ensure we have a valid access token
    await this.ensureValidToken();

    const searchParams = this.transformToAmadeusFormat(request);
    const urlParams = new URLSearchParams(searchParams);
    
    const response = await fetch(`${this.config.baseUrl}/shopping/flight-offers?${urlParams}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Amadeus API request failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  protected async normalizeResponse(rawResponse: any, request: AirlineSearchRequest): Promise<AirlineSearchResponse> {
    const flights = rawResponse.data?.map((offer: any) => ({
      id: offer.id,
      airline: offer.itineraries[0]?.segments[0]?.carrierCode || 'Unknown',
      flightNumber: offer.itineraries[0]?.segments[0]?.number || 'Unknown',
      route: this.normalizeAmadeusRoute(offer.itineraries),
      pricing: {
        totalPrice: parseFloat(offer.price.total),
        currency: offer.price.currency,
        breakdown: {
          baseFare: parseFloat(offer.price.base || offer.price.total),
          taxes: parseFloat(offer.price.total) - parseFloat(offer.price.base || offer.price.total),
          fees: 0
        }
      },
      availability: {
        seatsAvailable: offer.numberOfBookableSeats || 9,
        cabinClass: offer.travelerPricings[0]?.fareDetailsBySegment[0]?.cabin || 'ECONOMY'
      },
      duration: this.calculateDuration(offer.itineraries[0]),
      layovers: Math.max(0, (offer.itineraries[0]?.segments?.length || 1) - 1),
      score: this.calculateAmadeusScore(offer)
    })) || [];

    return {
      requestId: request.requestId,
      flights,
      totalResults: rawResponse.meta?.count || flights.length,
      searchTime: Date.now() - request.timestamp.getTime(),
      currency: rawResponse.data?.[0]?.price?.currency || 'USD',
      timestamp: new Date(),
      source: this.name
    };
  }

  protected handleApiError(error: any): any {
    return {
      code: error.code || 'AMADEUS_ERROR',
      message: error.message || 'Amadeus API error',
      details: error.detail || error.details,
      retryable: this.isAmadeusRetryableError(error),
      timestamp: new Date()
    };
  }

  private async ensureValidToken(): Promise<void> {
    if (this.accessToken && this.tokenExpiry && this.tokenExpiry > new Date()) {
      return; // Token is still valid
    }

    // Get new access token
    const tokenResponse = await fetch(`${this.config.baseUrl}/security/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.config.credentials?.clientId || '',
        client_secret: this.config.credentials?.clientSecret || ''
      })
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to obtain Amadeus access token');
    }

    const tokenData: any = await tokenResponse.json();
    this.accessToken = tokenData.access_token;
    this.tokenExpiry = new Date(Date.now() + (tokenData.expires_in * 1000));
  }

  private transformToAmadeusFormat(request: AirlineSearchRequest): any {
    return {
      originLocationCode: request.searchCriteria.origin,
      destinationLocationCode: request.searchCriteria.destination,
      departureDate: request.searchCriteria.departureDate,
      returnDate: request.searchCriteria.returnDate,
      adults: request.searchCriteria.passengers,
      travelClass: this.mapCabinClass(request.searchCriteria.cabinClass),
      max: request.preferences?.maxResults || 50
    };
  }

  private normalizeAmadeusRoute(itineraries: any[]): any {
    const outbound = itineraries[0];
    const segments = outbound.segments.map((segment: any) => ({
      departure: {
        airport: segment.departure.iataCode,
        time: segment.departure.at,
        terminal: segment.departure.terminal
      },
      arrival: {
        airport: segment.arrival.iataCode,
        time: segment.arrival.at,
        terminal: segment.arrival.terminal
      },
      airline: segment.carrierCode,
      flightNumber: segment.number,
      aircraft: segment.aircraft?.code,
      duration: segment.duration
    }));

    return {
      outbound: { segments },
      inbound: itineraries[1] ? { 
        segments: itineraries[1].segments.map((segment: any) => ({
          departure: {
            airport: segment.departure.iataCode,
            time: segment.departure.at,
            terminal: segment.departure.terminal
          },
          arrival: {
            airport: segment.arrival.iataCode,
            time: segment.arrival.at,
            terminal: segment.arrival.terminal
          },
          airline: segment.carrierCode,
          flightNumber: segment.number,
          aircraft: segment.aircraft?.code,
          duration: segment.duration
        }))
      } : null
    };
  }

  private calculateDuration(itinerary: any): number {
    if (!itinerary.duration) return 0;
    
    // Parse ISO 8601 duration (PT4H30M)
    const match = itinerary.duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
    if (!match) return 0;
    
    const hours = parseInt(match[1] || '0');
    const minutes = parseInt(match[2] || '0');
    return hours * 60 + minutes;
  }

  private calculateAmadeusScore(offer: any): number {
    // Simple scoring based on price and duration
    const price = parseFloat(offer.price.total);
    const duration = this.calculateDuration(offer.itineraries[0]);
    
    // Lower price and shorter duration = higher score
    const priceScore = Math.max(0, 100 - (price / 10));
    const durationScore = Math.max(0, 100 - (duration / 10));
    
    return Math.round((priceScore + durationScore) / 2);
  }

  private mapCabinClass(cabinClass: string): string {
    const mapping: { [key: string]: string } = {
      'economy': 'ECONOMY',
      'premium-economy': 'PREMIUM_ECONOMY',
      'business': 'BUSINESS',
      'first': 'FIRST'
    };
    return mapping[cabinClass.toLowerCase()] || 'ECONOMY';
  }

  private isAmadeusRetryableError(error: any): boolean {
    const retryableCodes = ['429', '500', '502', '503', '504'];
    return retryableCodes.includes(String(error.status));
  }
}