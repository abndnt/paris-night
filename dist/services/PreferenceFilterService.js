"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PreferenceFilterService = void 0;
class PreferenceFilterService {
    async filterByPreferences(results, preferences, options = {}) {
        if (!preferences || results.length === 0) {
            return {
                results,
                appliedFilters: [],
                totalResults: results.length,
                filteredResults: results.length,
            };
        }
        const { applyAirlinePreference = true, applyAirportPreference = true, applyCabinClassPreference = true, applyLayoverPreference = true, strictFiltering = false, } = options;
        let filteredResults = [...results];
        const appliedFilters = [];
        if (applyAirlinePreference && preferences.preferredAirlines.length > 0) {
            if (strictFiltering) {
                filteredResults = filteredResults.filter(result => this.matchesAirlinePreference(result, preferences.preferredAirlines));
            }
            appliedFilters.push('airline_preference');
        }
        if (applyAirportPreference && preferences.preferredAirports.length > 0) {
            if (strictFiltering) {
                filteredResults = filteredResults.filter(result => this.matchesAirportPreference(result, preferences.preferredAirports));
            }
            appliedFilters.push('airport_preference');
        }
        if (applyCabinClassPreference && preferences.preferredCabinClass) {
            if (strictFiltering) {
                filteredResults = filteredResults.filter(result => this.matchesCabinClassPreference(result, preferences.preferredCabinClass));
            }
            appliedFilters.push('cabin_class_preference');
        }
        if (applyLayoverPreference && preferences.maxLayovers !== undefined) {
            if (strictFiltering) {
                filteredResults = filteredResults.filter(result => this.matchesLayoverPreference(result, preferences.maxLayovers));
            }
            appliedFilters.push('layover_preference');
        }
        const scoredResults = filteredResults.map(result => ({
            result,
            score: this.calculatePreferenceScore(result, preferences),
        }));
        scoredResults.sort((a, b) => b.score - a.score);
        return {
            results: scoredResults.map(item => item.result),
            appliedFilters,
            totalResults: results.length,
            filteredResults: filteredResults.length,
        };
    }
    calculatePreferenceScore(result, preferences) {
        let score = 0;
        if (preferences.preferredAirlines.length > 0) {
            const airlineMatch = this.matchesAirlinePreference(result, preferences.preferredAirlines);
            score += airlineMatch ? 10 : 0;
        }
        if (preferences.preferredAirports.length > 0) {
            const airportMatch = this.matchesAirportPreference(result, preferences.preferredAirports);
            score += airportMatch ? 8 : 0;
        }
        if (preferences.preferredCabinClass) {
            const cabinMatch = this.matchesCabinClassPreference(result, preferences.preferredCabinClass);
            score += cabinMatch ? 6 : 0;
        }
        if (preferences.maxLayovers !== undefined) {
            const layoverMatch = this.matchesLayoverPreference(result, preferences.maxLayovers);
            score += layoverMatch ? 4 : -2;
        }
        if (preferences.maxLayovers <= 1 && result.layovers === 0) {
            score += 5;
        }
        return score;
    }
    matchesAirlinePreference(result, preferredAirlines) {
        if (!result.route || result.route.length === 0)
            return false;
        return result.route.some(segment => preferredAirlines.includes(segment.airline) ||
            preferredAirlines.includes(segment.operatingAirline || segment.airline));
    }
    matchesAirportPreference(result, preferredAirports) {
        if (!result.route || result.route.length === 0)
            return false;
        const allAirports = result.route.flatMap(segment => [segment.origin, segment.destination]);
        return allAirports.some(airport => preferredAirports.includes(airport));
    }
    matchesCabinClassPreference(result, preferredCabinClass) {
        if (!result.route || result.route.length === 0)
            return false;
        const cabinClassMap = {
            'J': 'business', 'C': 'business', 'D': 'business',
            'F': 'first', 'A': 'first',
            'W': 'premium', 'P': 'premium',
            'Y': 'economy', 'M': 'economy', 'B': 'economy', 'H': 'economy', 'K': 'economy', 'L': 'economy'
        };
        const bookingClass = result.availability.bookingClass;
        const inferredCabinClass = cabinClassMap[bookingClass] || 'economy';
        return inferredCabinClass === preferredCabinClass;
    }
    matchesLayoverPreference(result, maxLayovers) {
        return result.layovers <= maxLayovers;
    }
    async getSearchRecommendations(preferences) {
        if (!preferences) {
            return {
                recommendedAirlines: [],
                recommendedAirports: [],
                recommendedCabinClass: 'economy',
                recommendedMaxLayovers: 2,
            };
        }
        return {
            recommendedAirlines: preferences.preferredAirlines,
            recommendedAirports: preferences.preferredAirports,
            recommendedCabinClass: preferences.preferredCabinClass,
            recommendedMaxLayovers: preferences.maxLayovers,
        };
    }
    async analyzeBookingPatterns(bookingHistory) {
        if (!bookingHistory || bookingHistory.length === 0) {
            return {
                suggestedAirlines: [],
                suggestedAirports: [],
                suggestedCabinClass: 'economy',
                suggestedMaxLayovers: 2,
                confidence: 0,
            };
        }
        const airlineFrequency = {};
        const airportFrequency = {};
        const cabinClassFrequency = {};
        const layoverCounts = [];
        bookingHistory.forEach(booking => {
            if (booking.flightDetails && booking.flightDetails.route) {
                booking.flightDetails.route.forEach((segment) => {
                    const airline = segment.airline || segment.operatingAirline;
                    if (airline) {
                        airlineFrequency[airline] = (airlineFrequency[airline] || 0) + 1;
                    }
                    if (segment.origin) {
                        airportFrequency[segment.origin] = (airportFrequency[segment.origin] || 0) + 1;
                    }
                    if (segment.destination) {
                        airportFrequency[segment.destination] = (airportFrequency[segment.destination] || 0) + 1;
                    }
                    if (segment.cabinClass) {
                        cabinClassFrequency[segment.cabinClass] = (cabinClassFrequency[segment.cabinClass] || 0) + 1;
                    }
                });
                if (booking.flightDetails.layovers !== undefined) {
                    layoverCounts.push(booking.flightDetails.layovers);
                }
            }
        });
        const suggestedAirlines = Object.entries(airlineFrequency)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 3)
            .map(([airline]) => airline);
        const suggestedAirports = Object.entries(airportFrequency)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([airport]) => airport);
        const suggestedCabinClass = Object.entries(cabinClassFrequency)
            .sort(([, a], [, b]) => b - a)[0]?.[0] || 'economy';
        const avgLayovers = layoverCounts.length > 0
            ? Math.round(layoverCounts.reduce((sum, count) => sum + count, 0) / layoverCounts.length)
            : 2;
        const confidence = Math.min(bookingHistory.length / 10, 1);
        return {
            suggestedAirlines,
            suggestedAirports,
            suggestedCabinClass,
            suggestedMaxLayovers: avgLayovers,
            confidence,
        };
    }
}
exports.PreferenceFilterService = PreferenceFilterService;
//# sourceMappingURL=PreferenceFilterService.js.map