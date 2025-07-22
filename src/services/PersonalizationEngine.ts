import { Pool } from 'pg';
import { TravelPreferences, TravelPreferencesModel } from '../models/TravelPreferences';
import { FlightResult } from '../models/FlightSearch';
import { PreferenceFilterService } from './PreferenceFilterService';

export interface PersonalizedRecommendation {
  type: 'flight' | 'route' | 'airline' | 'airport' | 'deal';
  title: string;
  description: string;
  data: any;
  score: number;
  reason: string;
}

export interface UserBehaviorData {
  searchHistory: any[];
  bookingHistory: any[];
  clickHistory: any[];
  preferences: TravelPreferences | null;
}

export interface PersonalizationInsights {
  travelPatterns: {
    frequentRoutes: string[];
    preferredTravelDays: string[];
    averageAdvanceBooking: number;
    seasonalPreferences: string[];
  };
  spendingPatterns: {
    averageSpend: number;
    pointsUsageFrequency: number;
    preferredPaymentMethod: string;
  };
  recommendations: PersonalizedRecommendation[];
}

export class PersonalizationEngine {
  private db: Pool;
  private preferencesModel: TravelPreferencesModel;
  private filterService: PreferenceFilterService;

  constructor(database: Pool) {
    this.db = database;
    this.preferencesModel = new TravelPreferencesModel(database);
    this.filterService = new PreferenceFilterService();
  }

  /**
   * Generate personalized recommendations for a user
   */
  async generateRecommendations(userId: string): Promise<PersonalizedRecommendation[]> {
    const behaviorData = await this.getUserBehaviorData(userId);
    const recommendations: PersonalizedRecommendation[] = [];

    // Route recommendations based on search history
    const routeRecommendations = await this.generateRouteRecommendations(behaviorData);
    recommendations.push(...routeRecommendations);

    // Airline recommendations based on preferences and history
    const airlineRecommendations = await this.generateAirlineRecommendations(behaviorData);
    recommendations.push(...airlineRecommendations);

    // Deal recommendations based on user patterns
    const dealRecommendations = await this.generateDealRecommendations(behaviorData);
    recommendations.push(...dealRecommendations);

    // Time-based recommendations
    const timeRecommendations = await this.generateTimeBasedRecommendations(behaviorData);
    recommendations.push(...timeRecommendations);

    // Sort by score and return top recommendations
    return recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }

  /**
   * Learn from user behavior and update preferences
   */
  async learnFromBookingHistory(userId: string): Promise<TravelPreferences | null> {
    const bookingHistory = await this.getBookingHistory(userId);
    const currentPreferences = await this.preferencesModel.findByUserId(userId);

    if (bookingHistory.length === 0) {
      return currentPreferences;
    }

    // Analyze booking patterns
    const patterns = await this.filterService.analyzeBookingPatterns(bookingHistory);

    if (patterns.confidence < 0.3) {
      // Not enough data to make confident updates
      return currentPreferences;
    }

    // Create or update preferences based on learned patterns
    const learnedPreferences = {
      userId,
      preferredAirlines: this.mergePreferences(
        currentPreferences?.preferredAirlines || [],
        patterns.suggestedAirlines,
        patterns.confidence
      ),
      preferredAirports: this.mergePreferences(
        currentPreferences?.preferredAirports || [],
        patterns.suggestedAirports,
        patterns.confidence
      ),
      preferredCabinClass: patterns.confidence > 0.7 
        ? patterns.suggestedCabinClass as any
        : currentPreferences?.preferredCabinClass || 'economy',
      maxLayovers: patterns.confidence > 0.5
        ? patterns.suggestedMaxLayovers
        : currentPreferences?.maxLayovers || 2,
      seatPreference: currentPreferences?.seatPreference,
      mealPreference: currentPreferences?.mealPreference,
    };

    return await this.preferencesModel.upsert(learnedPreferences);
  }

  /**
   * Get comprehensive user behavior data
   */
  private async getUserBehaviorData(userId: string): Promise<UserBehaviorData> {
    const [searchHistory, bookingHistory, preferences] = await Promise.all([
      this.getSearchHistory(userId),
      this.getBookingHistory(userId),
      this.preferencesModel.findByUserId(userId),
    ]);

    return {
      searchHistory,
      bookingHistory,
      clickHistory: [], // TODO: Implement click tracking
      preferences,
    };
  }

  /**
   * Generate route recommendations based on search patterns
   */
  private async generateRouteRecommendations(behaviorData: UserBehaviorData): Promise<PersonalizedRecommendation[]> {
    const recommendations: PersonalizedRecommendation[] = [];
    const { searchHistory, bookingHistory } = behaviorData;

    // Analyze frequent search routes
    const routeFrequency: { [key: string]: number } = {};
    
    searchHistory.forEach(search => {
      const route = `${search.origin}-${search.destination}`;
      routeFrequency[route] = (routeFrequency[route] || 0) + 1;
    });

    // Find routes searched but not booked
    const bookedRoutes = new Set(
      bookingHistory.map(booking => 
        `${booking.flightDetails?.route?.[0]?.origin}-${booking.flightDetails?.route?.slice(-1)[0]?.destination}`
      ).filter(Boolean)
    );

    Object.entries(routeFrequency)
      .filter(([route, frequency]) => frequency >= 2 && !bookedRoutes.has(route))
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .forEach(([route, frequency]) => {
        const [origin, destination] = route.split('-');
        recommendations.push({
          type: 'route',
          title: `${origin} to ${destination}`,
          description: `You've searched this route ${frequency} times. Check current deals!`,
          data: { origin, destination, searchCount: frequency },
          score: frequency * 10,
          reason: 'Frequently searched route',
        });
      });

    return recommendations;
  }

  /**
   * Generate airline recommendations
   */
  private async generateAirlineRecommendations(behaviorData: UserBehaviorData): Promise<PersonalizedRecommendation[]> {
    const recommendations: PersonalizedRecommendation[] = [];
    const { preferences, bookingHistory } = behaviorData;

    if (preferences?.preferredAirlines.length) {
      preferences.preferredAirlines.forEach(airline => {
        recommendations.push({
          type: 'airline',
          title: `${airline} Deals`,
          description: `Special offers from your preferred airline`,
          data: { airline },
          score: 15,
          reason: 'Preferred airline',
        });
      });
    }

    // Recommend airlines from booking history not in preferences
    const bookedAirlines = new Set(
      bookingHistory.flatMap(booking => 
        booking.flightDetails?.route?.map((segment: any) => segment.airline) || []
      )
    );

    const preferredSet = new Set(preferences?.preferredAirlines || []);
    
    Array.from(bookedAirlines)
      .filter(airline => airline && !preferredSet.has(airline))
      .slice(0, 2)
      .forEach(airline => {
        recommendations.push({
          type: 'airline',
          title: `${airline} Recommendations`,
          description: `Based on your previous bookings with ${airline}`,
          data: { airline },
          score: 12,
          reason: 'Previously booked airline',
        });
      });

    return recommendations;
  }

  /**
   * Generate deal recommendations
   */
  private async generateDealRecommendations(behaviorData: UserBehaviorData): Promise<PersonalizedRecommendation[]> {
    const recommendations: PersonalizedRecommendation[] = [];
    const { preferences, searchHistory } = behaviorData;

    // Recommend deals for preferred airports
    if (preferences?.preferredAirports.length) {
      preferences.preferredAirports.slice(0, 2).forEach(airport => {
        recommendations.push({
          type: 'deal',
          title: `Deals from ${airport}`,
          description: `Special offers departing from your preferred airport`,
          data: { airport, type: 'departure' },
          score: 14,
          reason: 'Preferred departure airport',
        });
      });
    }

    // Recommend points deals if user has points preferences
    if (preferences?.preferredCabinClass === 'business' || preferences?.preferredCabinClass === 'first') {
      recommendations.push({
        type: 'deal',
        title: 'Premium Cabin Points Deals',
        description: 'Maximize your points value with premium cabin redemptions',
        data: { cabinClass: preferences.preferredCabinClass },
        score: 16,
        reason: 'Premium cabin preference',
      });
    }

    return recommendations;
  }

  /**
   * Generate time-based recommendations
   */
  private async generateTimeBasedRecommendations(behaviorData: UserBehaviorData): Promise<PersonalizedRecommendation[]> {
    const recommendations: PersonalizedRecommendation[] = [];
    const { bookingHistory } = behaviorData;

    // Analyze booking timing patterns
    const bookingMonths = bookingHistory.map(booking => 
      new Date(booking.travelDate).getMonth()
    );

    if (bookingMonths.length >= 3) {
      const monthFrequency: { [key: number]: number } = {};
      bookingMonths.forEach(month => {
        monthFrequency[month] = (monthFrequency[month] || 0) + 1;
      });

      const preferredMonth = Object.entries(monthFrequency)
        .sort(([, a], [, b]) => b - a)[0]?.[0];

      if (preferredMonth) {
        const monthNames = [
          'January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'
        ];

        recommendations.push({
          type: 'flight',
          title: `${monthNames[parseInt(preferredMonth)]} Travel Deals`,
          description: `You often travel in ${monthNames[parseInt(preferredMonth)]}. Plan ahead for better deals!`,
          data: { month: parseInt(preferredMonth) },
          score: 13,
          reason: 'Seasonal travel pattern',
        });
      }
    }

    return recommendations;
  }

  /**
   * Merge existing preferences with learned patterns
   */
  private mergePreferences(existing: string[], suggested: string[], confidence: number): string[] {
    if (confidence < 0.5) {
      return existing;
    }

    const merged = new Set([...existing]);
    
    // Add high-confidence suggestions
    suggested.forEach(item => {
      if (confidence > 0.7) {
        merged.add(item);
      }
    });

    return Array.from(merged);
  }

  /**
   * Get user's search history
   */
  private async getSearchHistory(userId: string): Promise<any[]> {
    const query = `
      SELECT origin, destination, departure_date, return_date, cabin_class, created_at
      FROM flight_searches
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 50
    `;

    const result = await this.db.query(query, [userId]);
    return result.rows;
  }

  /**
   * Get user's booking history
   */
  private async getBookingHistory(userId: string): Promise<any[]> {
    const query = `
      SELECT flight_details, total_cost, travel_date, created_at, status
      FROM bookings
      WHERE user_id = $1 AND status IN ('confirmed', 'ticketed', 'completed')
      ORDER BY created_at DESC
      LIMIT 20
    `;

    const result = await this.db.query(query, [userId]);
    return result.rows;
  }

  /**
   * Generate personalization insights for analytics
   */
  async generateInsights(userId: string): Promise<PersonalizationInsights> {
    const behaviorData = await this.getUserBehaviorData(userId);
    const recommendations = await this.generateRecommendations(userId);

    // Analyze travel patterns
    const routes = behaviorData.searchHistory.map(search => 
      `${search.origin}-${search.destination}`
    );
    const routeFrequency: { [key: string]: number } = {};
    routes.forEach(route => {
      routeFrequency[route] = (routeFrequency[route] || 0) + 1;
    });

    const frequentRoutes = Object.entries(routeFrequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([route]) => route);

    // Analyze spending patterns
    const totalSpend = behaviorData.bookingHistory.reduce((sum, booking) => 
      sum + (booking.totalCost?.total || 0), 0
    );
    const averageSpend = behaviorData.bookingHistory.length > 0 
      ? totalSpend / behaviorData.bookingHistory.length 
      : 0;

    return {
      travelPatterns: {
        frequentRoutes,
        preferredTravelDays: [], // TODO: Implement day analysis
        averageAdvanceBooking: 0, // TODO: Calculate advance booking days
        seasonalPreferences: [], // TODO: Implement seasonal analysis
      },
      spendingPatterns: {
        averageSpend,
        pointsUsageFrequency: 0, // TODO: Calculate points usage
        preferredPaymentMethod: 'unknown', // TODO: Analyze payment methods
      },
      recommendations,
    };
  }
}