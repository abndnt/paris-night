"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PersonalizationEngine = void 0;
const TravelPreferences_1 = require("../models/TravelPreferences");
const PreferenceFilterService_1 = require("./PreferenceFilterService");
class PersonalizationEngine {
    constructor(database) {
        this.db = database;
        this.preferencesModel = new TravelPreferences_1.TravelPreferencesModel(database);
        this.filterService = new PreferenceFilterService_1.PreferenceFilterService();
    }
    async generateRecommendations(userId) {
        const behaviorData = await this.getUserBehaviorData(userId);
        const recommendations = [];
        const routeRecommendations = await this.generateRouteRecommendations(behaviorData);
        recommendations.push(...routeRecommendations);
        const airlineRecommendations = await this.generateAirlineRecommendations(behaviorData);
        recommendations.push(...airlineRecommendations);
        const dealRecommendations = await this.generateDealRecommendations(behaviorData);
        recommendations.push(...dealRecommendations);
        const timeRecommendations = await this.generateTimeBasedRecommendations(behaviorData);
        recommendations.push(...timeRecommendations);
        return recommendations
            .sort((a, b) => b.score - a.score)
            .slice(0, 10);
    }
    async learnFromBookingHistory(userId) {
        const bookingHistory = await this.getBookingHistory(userId);
        const currentPreferences = await this.preferencesModel.findByUserId(userId);
        if (bookingHistory.length === 0) {
            return currentPreferences;
        }
        const patterns = await this.filterService.analyzeBookingPatterns(bookingHistory);
        if (patterns.confidence < 0.3) {
            return currentPreferences;
        }
        const learnedPreferences = {
            userId,
            preferredAirlines: this.mergePreferences(currentPreferences?.preferredAirlines || [], patterns.suggestedAirlines, patterns.confidence),
            preferredAirports: this.mergePreferences(currentPreferences?.preferredAirports || [], patterns.suggestedAirports, patterns.confidence),
            preferredCabinClass: patterns.confidence > 0.7
                ? patterns.suggestedCabinClass
                : currentPreferences?.preferredCabinClass || 'economy',
            maxLayovers: patterns.confidence > 0.5
                ? patterns.suggestedMaxLayovers
                : currentPreferences?.maxLayovers || 2,
            seatPreference: currentPreferences?.seatPreference,
            mealPreference: currentPreferences?.mealPreference,
        };
        return await this.preferencesModel.upsert(learnedPreferences);
    }
    async getUserBehaviorData(userId) {
        const [searchHistory, bookingHistory, preferences] = await Promise.all([
            this.getSearchHistory(userId),
            this.getBookingHistory(userId),
            this.preferencesModel.findByUserId(userId),
        ]);
        return {
            searchHistory,
            bookingHistory,
            clickHistory: [],
            preferences,
        };
    }
    async generateRouteRecommendations(behaviorData) {
        const recommendations = [];
        const { searchHistory, bookingHistory } = behaviorData;
        const routeFrequency = {};
        searchHistory.forEach(search => {
            const route = `${search.origin}-${search.destination}`;
            routeFrequency[route] = (routeFrequency[route] || 0) + 1;
        });
        const bookedRoutes = new Set(bookingHistory.map(booking => `${booking.flightDetails?.route?.[0]?.origin}-${booking.flightDetails?.route?.slice(-1)[0]?.destination}`).filter(Boolean));
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
    async generateAirlineRecommendations(behaviorData) {
        const recommendations = [];
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
        const bookedAirlines = new Set(bookingHistory.flatMap(booking => booking.flightDetails?.route?.map((segment) => segment.airline) || []));
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
    async generateDealRecommendations(behaviorData) {
        const recommendations = [];
        const { preferences, searchHistory } = behaviorData;
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
    async generateTimeBasedRecommendations(behaviorData) {
        const recommendations = [];
        const { bookingHistory } = behaviorData;
        const bookingMonths = bookingHistory.map(booking => new Date(booking.travelDate).getMonth());
        if (bookingMonths.length >= 3) {
            const monthFrequency = {};
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
    mergePreferences(existing, suggested, confidence) {
        if (confidence < 0.5) {
            return existing;
        }
        const merged = new Set([...existing]);
        suggested.forEach(item => {
            if (confidence > 0.7) {
                merged.add(item);
            }
        });
        return Array.from(merged);
    }
    async getSearchHistory(userId) {
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
    async getBookingHistory(userId) {
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
    async generateInsights(userId) {
        const behaviorData = await this.getUserBehaviorData(userId);
        const recommendations = await this.generateRecommendations(userId);
        const routes = behaviorData.searchHistory.map(search => `${search.origin}-${search.destination}`);
        const routeFrequency = {};
        routes.forEach(route => {
            routeFrequency[route] = (routeFrequency[route] || 0) + 1;
        });
        const frequentRoutes = Object.entries(routeFrequency)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([route]) => route);
        const totalSpend = behaviorData.bookingHistory.reduce((sum, booking) => sum + (booking.totalCost?.total || 0), 0);
        const averageSpend = behaviorData.bookingHistory.length > 0
            ? totalSpend / behaviorData.bookingHistory.length
            : 0;
        return {
            travelPatterns: {
                frequentRoutes,
                preferredTravelDays: [],
                averageAdvanceBooking: 0,
                seasonalPreferences: [],
            },
            spendingPatterns: {
                averageSpend,
                pointsUsageFrequency: 0,
                preferredPaymentMethod: 'unknown',
            },
            recommendations,
        };
    }
}
exports.PersonalizationEngine = PersonalizationEngine;
//# sourceMappingURL=PersonalizationEngine.js.map