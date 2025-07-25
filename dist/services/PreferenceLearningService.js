"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PreferenceLearningService = void 0;
const TravelPreferences_1 = require("../models/TravelPreferences");
class PreferenceLearningService {
    constructor(database) {
        this.db = database;
        this.preferencesModel = new TravelPreferences_1.TravelPreferencesModel(database);
    }
    async learnAndUpdatePreferences(userId) {
        const [currentPreferences, bookingHistory, searchHistory] = await Promise.all([
            this.preferencesModel.findByUserId(userId),
            this.getBookingHistory(userId),
            this.getSearchHistory(userId),
        ]);
        if (bookingHistory.length === 0) {
            return {
                updatedPreferences: currentPreferences,
                insights: [{
                        type: 'route',
                        insight: 'No booking history available for learning',
                        confidence: 0,
                        data: {},
                    }],
                learningConfidence: 0,
            };
        }
        const insights = [];
        let learningConfidence = Math.min(bookingHistory.length / 10, 1);
        const airlineInsights = this.learnAirlinePreferences(bookingHistory, currentPreferences);
        insights.push(...airlineInsights.insights);
        const airportInsights = this.learnAirportPreferences(bookingHistory, searchHistory, currentPreferences);
        insights.push(...airportInsights.insights);
        const cabinInsights = this.learnCabinClassPreferences(bookingHistory, currentPreferences);
        insights.push(...cabinInsights.insights);
        const layoverInsights = this.learnLayoverPreferences(bookingHistory, currentPreferences);
        insights.push(...layoverInsights.insights);
        const timingInsights = this.learnTimingPreferences(bookingHistory);
        insights.push(...timingInsights.insights);
        const updatedPreferences = await this.createUpdatedPreferences(userId, currentPreferences, {
            airlines: airlineInsights.suggestions,
            airports: airportInsights.suggestions,
            cabinClass: cabinInsights.suggestion,
            maxLayovers: layoverInsights.suggestion,
        }, learningConfidence);
        return {
            updatedPreferences,
            insights,
            learningConfidence,
        };
    }
    learnAirlinePreferences(bookingHistory, currentPreferences) {
        const airlineFrequency = {};
        const insights = [];
        bookingHistory.forEach(booking => {
            if (booking.flight_details?.route) {
                booking.flight_details.route.forEach((segment) => {
                    const airline = segment.airline || segment.operatingAirline;
                    if (airline) {
                        airlineFrequency[airline] = (airlineFrequency[airline] || 0) + 1;
                    }
                });
            }
        });
        const topAirlines = Object.entries(airlineFrequency)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5);
        if (topAirlines.length > 0) {
            const [mostUsedAirline, frequency] = topAirlines[0];
            const usagePercentage = (frequency / bookingHistory.length) * 100;
            if (usagePercentage >= 40) {
                insights.push({
                    type: 'airline',
                    insight: `You frequently book with ${mostUsedAirline} (${usagePercentage.toFixed(0)}% of bookings)`,
                    confidence: Math.min(usagePercentage / 100, 0.9),
                    data: { airline: mostUsedAirline, frequency, percentage: usagePercentage },
                });
            }
            const currentAirlines = new Set(currentPreferences?.preferredAirlines || []);
            const newAirlines = topAirlines
                .filter(([airline, freq]) => !currentAirlines.has(airline) && freq >= 2)
                .map(([airline]) => airline);
            if (newAirlines.length > 0) {
                insights.push({
                    type: 'airline',
                    insight: `Consider adding ${newAirlines.join(', ')} to your preferred airlines`,
                    confidence: 0.7,
                    data: { newAirlines },
                });
            }
        }
        return {
            insights,
            suggestions: topAirlines.map(([airline]) => airline),
        };
    }
    learnAirportPreferences(bookingHistory, searchHistory, currentPreferences) {
        const airportFrequency = {};
        const insights = [];
        bookingHistory.forEach(booking => {
            if (booking.flight_details?.route) {
                booking.flight_details.route.forEach((segment) => {
                    if (segment.origin) {
                        airportFrequency[segment.origin] = (airportFrequency[segment.origin] || 0) + 2;
                    }
                    if (segment.destination) {
                        airportFrequency[segment.destination] = (airportFrequency[segment.destination] || 0) + 2;
                    }
                });
            }
        });
        searchHistory.forEach(search => {
            if (search.origin) {
                airportFrequency[search.origin] = (airportFrequency[search.origin] || 0) + 1;
            }
            if (search.destination) {
                airportFrequency[search.destination] = (airportFrequency[search.destination] || 0) + 1;
            }
        });
        const topAirports = Object.entries(airportFrequency)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 8);
        if (topAirports.length > 0) {
            const frequentAirports = topAirports.filter(([, freq]) => freq >= 3);
            if (frequentAirports.length > 0) {
                insights.push({
                    type: 'airport',
                    insight: `Your most used airports: ${frequentAirports.map(([airport]) => airport).join(', ')}`,
                    confidence: 0.8,
                    data: { airports: frequentAirports },
                });
            }
            const hubAirports = ['ATL', 'DFW', 'DEN', 'ORD', 'LAX', 'JFK', 'LAS', 'SEA', 'CLT', 'PHX'];
            const usedHubs = topAirports
                .filter(([airport]) => hubAirports.includes(airport))
                .map(([airport]) => airport);
            if (usedHubs.length > 0) {
                insights.push({
                    type: 'airport',
                    insight: `You frequently use hub airports: ${usedHubs.join(', ')}`,
                    confidence: 0.7,
                    data: { hubAirports: usedHubs },
                });
            }
        }
        return {
            insights,
            suggestions: topAirports.map(([airport]) => airport),
        };
    }
    learnCabinClassPreferences(bookingHistory, currentPreferences) {
        const cabinClassFrequency = {};
        const insights = [];
        bookingHistory.forEach(booking => {
            if (booking.flight_details?.route) {
                booking.flight_details.route.forEach((segment) => {
                    if (segment.cabinClass) {
                        cabinClassFrequency[segment.cabinClass] = (cabinClassFrequency[segment.cabinClass] || 0) + 1;
                    }
                });
            }
        });
        const topCabinClass = Object.entries(cabinClassFrequency)
            .sort(([, a], [, b]) => b - a)[0];
        if (topCabinClass) {
            const [cabinClass, frequency] = topCabinClass;
            const percentage = (frequency / bookingHistory.length) * 100;
            if (percentage >= 60 && cabinClass !== currentPreferences?.preferredCabinClass) {
                insights.push({
                    type: 'cabin_class',
                    insight: `You consistently book ${cabinClass} class (${percentage.toFixed(0)}% of bookings)`,
                    confidence: Math.min(percentage / 100, 0.9),
                    data: { cabinClass, frequency, percentage },
                });
                return { insights, suggestion: cabinClass };
            }
        }
        return { insights, suggestion: null };
    }
    learnLayoverPreferences(bookingHistory, currentPreferences) {
        const layoverCounts = [];
        const insights = [];
        bookingHistory.forEach(booking => {
            if (booking.flight_details?.layovers !== undefined) {
                layoverCounts.push(booking.flight_details.layovers);
            }
        });
        if (layoverCounts.length >= 3) {
            const avgLayovers = layoverCounts.reduce((sum, count) => sum + count, 0) / layoverCounts.length;
            const maxLayovers = Math.max(...layoverCounts);
            const directFlights = layoverCounts.filter(count => count === 0).length;
            const directPercentage = (directFlights / layoverCounts.length) * 100;
            if (directPercentage >= 70) {
                insights.push({
                    type: 'layover',
                    insight: `You prefer direct flights (${directPercentage.toFixed(0)}% of bookings)`,
                    confidence: 0.8,
                    data: { directPercentage, avgLayovers },
                });
                return { insights, suggestion: 0 };
            }
            else if (avgLayovers <= 1.5 && avgLayovers !== currentPreferences?.maxLayovers) {
                insights.push({
                    type: 'layover',
                    insight: `You typically accept up to ${Math.ceil(avgLayovers)} layovers`,
                    confidence: 0.7,
                    data: { avgLayovers, maxLayovers },
                });
                return { insights, suggestion: Math.ceil(avgLayovers) };
            }
        }
        return { insights, suggestion: null };
    }
    learnTimingPreferences(bookingHistory) {
        const insights = [];
        if (bookingHistory.length < 3) {
            return { insights };
        }
        const advanceBookingDays = [];
        bookingHistory.forEach(booking => {
            if (booking.travel_date && booking.created_at) {
                const travelDate = new Date(booking.travel_date);
                const bookingDate = new Date(booking.created_at);
                const daysDiff = Math.floor((travelDate.getTime() - bookingDate.getTime()) / (1000 * 60 * 60 * 24));
                if (daysDiff > 0) {
                    advanceBookingDays.push(daysDiff);
                }
            }
        });
        if (advanceBookingDays.length >= 3) {
            const avgAdvanceDays = advanceBookingDays.reduce((sum, days) => sum + days, 0) / advanceBookingDays.length;
            let bookingPattern = '';
            if (avgAdvanceDays <= 7) {
                bookingPattern = 'last-minute';
            }
            else if (avgAdvanceDays <= 30) {
                bookingPattern = 'short-term';
            }
            else if (avgAdvanceDays <= 90) {
                bookingPattern = 'advance';
            }
            else {
                bookingPattern = 'long-term';
            }
            insights.push({
                type: 'timing',
                insight: `You typically book ${bookingPattern} (${Math.round(avgAdvanceDays)} days in advance)`,
                confidence: 0.7,
                data: { avgAdvanceDays, bookingPattern },
            });
        }
        const monthFrequency = {};
        bookingHistory.forEach(booking => {
            if (booking.travel_date) {
                const month = new Date(booking.travel_date).getMonth();
                monthFrequency[month] = (monthFrequency[month] || 0) + 1;
            }
        });
        const topMonths = Object.entries(monthFrequency)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 3);
        if (topMonths.length > 0 && topMonths[0][1] >= 2) {
            const monthNames = [
                'January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'
            ];
            const preferredMonths = topMonths.map(([month]) => monthNames[parseInt(month)]);
            insights.push({
                type: 'timing',
                insight: `You often travel in ${preferredMonths.join(', ')}`,
                confidence: 0.6,
                data: { preferredMonths, monthFrequency },
            });
        }
        return { insights };
    }
    async createUpdatedPreferences(userId, currentPreferences, suggestions, confidence) {
        if (confidence < 0.3) {
            return currentPreferences;
        }
        const updatedData = {
            userId,
            preferredAirlines: this.mergeArrayPreferences(currentPreferences?.preferredAirlines || [], suggestions.airlines.slice(0, 3), confidence),
            preferredAirports: this.mergeArrayPreferences(currentPreferences?.preferredAirports || [], suggestions.airports.slice(0, 5), confidence),
            preferredCabinClass: (confidence > 0.7 && suggestions.cabinClass)
                ? suggestions.cabinClass
                : currentPreferences?.preferredCabinClass || 'economy',
            maxLayovers: (confidence > 0.6 && suggestions.maxLayovers !== null)
                ? suggestions.maxLayovers
                : currentPreferences?.maxLayovers || 2,
            seatPreference: currentPreferences?.seatPreference,
            mealPreference: currentPreferences?.mealPreference,
        };
        return await this.preferencesModel.upsert(updatedData);
    }
    mergeArrayPreferences(existing, suggested, confidence) {
        if (confidence < 0.5) {
            return existing;
        }
        const merged = new Set(existing);
        suggested.forEach(item => {
            if (confidence > 0.6) {
                merged.add(item);
            }
        });
        return Array.from(merged).slice(0, 5);
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
}
exports.PreferenceLearningService = PreferenceLearningService;
//# sourceMappingURL=PreferenceLearningService.js.map