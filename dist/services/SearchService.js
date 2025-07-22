"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchService = void 0;
const FlightSearch_1 = require("../models/FlightSearch");
class SearchService {
    constructor(database) {
        this.flightSearchModel = new FlightSearch_1.FlightSearchModel(database);
    }
    async createFlightSearch(searchData) {
        try {
            const { error } = FlightSearch_1.SearchCriteriaSchema.validate(searchData.searchCriteria);
            if (error) {
                throw new Error(`Invalid search criteria: ${error.details[0].message}`);
            }
            const sanitizedCriteria = this.sanitizeSearchCriteria(searchData.searchCriteria);
            const sanitizedSearchData = {
                ...searchData,
                searchCriteria: sanitizedCriteria
            };
            return await this.flightSearchModel.createSearch(sanitizedSearchData);
        }
        catch (error) {
            throw new Error(`Failed to create flight search: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async getFlightSearch(searchId) {
        try {
            if (!this.isValidUUID(searchId)) {
                throw new Error('Invalid search ID format');
            }
            return await this.flightSearchModel.getSearch(searchId);
        }
        catch (error) {
            throw new Error(`Failed to get flight search: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async updateFlightSearch(searchId, updateData) {
        try {
            if (!this.isValidUUID(searchId)) {
                throw new Error('Invalid search ID format');
            }
            if (updateData.results) {
                updateData.results = this.sanitizeFlightResults(updateData.results);
            }
            return await this.flightSearchModel.updateSearch(searchId, updateData);
        }
        catch (error) {
            throw new Error(`Failed to update flight search: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async getUserFlightSearches(userId, limit = 20, offset = 0) {
        try {
            if (!this.isValidUUID(userId)) {
                throw new Error('Invalid user ID format');
            }
            if (limit < 1 || limit > 100) {
                throw new Error('Limit must be between 1 and 100');
            }
            if (offset < 0) {
                throw new Error('Offset must be non-negative');
            }
            return await this.flightSearchModel.getUserSearches(userId, limit, offset);
        }
        catch (error) {
            throw new Error(`Failed to get user flight searches: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async getRecentFlightSearches(limit = 50) {
        try {
            if (limit < 1 || limit > 100) {
                throw new Error('Limit must be between 1 and 100');
            }
            return await this.flightSearchModel.getRecentSearches(limit);
        }
        catch (error) {
            throw new Error(`Failed to get recent flight searches: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async deleteFlightSearch(searchId) {
        try {
            if (!this.isValidUUID(searchId)) {
                throw new Error('Invalid search ID format');
            }
            return await this.flightSearchModel.deleteSearch(searchId);
        }
        catch (error) {
            throw new Error(`Failed to delete flight search: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    filterFlightResults(results, filters) {
        return results.filter(result => {
            if (filters.maxPrice && result.pricing.totalPrice > filters.maxPrice) {
                return false;
            }
            if (filters.maxDuration && result.duration > filters.maxDuration) {
                return false;
            }
            if (filters.maxLayovers !== undefined && result.layovers > filters.maxLayovers) {
                return false;
            }
            if (filters.preferredAirlines && filters.preferredAirlines.length > 0) {
                if (!filters.preferredAirlines.includes(result.airline)) {
                    return false;
                }
            }
            if (filters.departureTimeRange && result.route.length > 0) {
                const departureTime = result.route[0].departureTime;
                const timeString = departureTime.toTimeString().substring(0, 5);
                if (timeString < filters.departureTimeRange.earliest ||
                    timeString > filters.departureTimeRange.latest) {
                    return false;
                }
            }
            return true;
        });
    }
    sortFlightResults(results, sortBy = 'price', sortOrder = 'asc') {
        return [...results].sort((a, b) => {
            let comparison = 0;
            switch (sortBy) {
                case 'price':
                    comparison = a.pricing.totalPrice - b.pricing.totalPrice;
                    break;
                case 'duration':
                    comparison = a.duration - b.duration;
                    break;
                case 'score':
                    comparison = (b.score || 0) - (a.score || 0);
                    break;
            }
            return sortOrder === 'desc' ? -comparison : comparison;
        });
    }
    async cleanupExpiredSearches() {
        try {
            return await this.flightSearchModel.deleteExpiredSearches();
        }
        catch (error) {
            throw new Error(`Failed to cleanup expired searches: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    validateAndSuggestCorrections(criteria) {
        const errors = [];
        const suggestions = [];
        if (!this.isValidAirportCode(criteria.origin)) {
            errors.push('Invalid origin airport code');
            suggestions.push('Origin must be a valid 3-letter IATA airport code (e.g., JFK, LAX, LHR)');
        }
        if (!this.isValidAirportCode(criteria.destination)) {
            errors.push('Invalid destination airport code');
            suggestions.push('Destination must be a valid 3-letter IATA airport code (e.g., JFK, LAX, LHR)');
        }
        if (criteria.origin === criteria.destination) {
            errors.push('Origin and destination cannot be the same');
        }
        const now = new Date();
        const departureDate = new Date(criteria.departureDate);
        if (departureDate <= now) {
            errors.push('Departure date must be in the future');
            suggestions.push('Please select a departure date that is at least tomorrow');
        }
        if (criteria.returnDate) {
            const returnDate = new Date(criteria.returnDate);
            if (returnDate <= departureDate) {
                errors.push('Return date must be after departure date');
            }
        }
        const totalPassengers = criteria.passengers.adults + criteria.passengers.children + criteria.passengers.infants;
        if (totalPassengers > 9) {
            errors.push('Total passengers cannot exceed 9');
            suggestions.push('For groups larger than 9, please make separate bookings');
        }
        if (criteria.passengers.infants > criteria.passengers.adults) {
            errors.push('Number of infants cannot exceed number of adults');
            suggestions.push('Each infant must be accompanied by an adult');
        }
        return {
            isValid: errors.length === 0,
            errors,
            suggestions
        };
    }
    sanitizeSearchCriteria(criteria) {
        const sanitized = {
            origin: criteria.origin.toUpperCase().trim().substring(0, 3),
            destination: criteria.destination.toUpperCase().trim().substring(0, 3),
            departureDate: new Date(criteria.departureDate),
            passengers: {
                adults: Math.max(1, Math.min(9, Math.floor(criteria.passengers.adults))),
                children: Math.max(0, Math.min(8, Math.floor(criteria.passengers.children))),
                infants: Math.max(0, Math.min(2, Math.floor(criteria.passengers.infants)))
            },
            cabinClass: criteria.cabinClass,
            flexible: Boolean(criteria.flexible)
        };
        if (criteria.returnDate) {
            sanitized.returnDate = new Date(criteria.returnDate);
        }
        return sanitized;
    }
    sanitizeFlightResults(results) {
        return results.map(result => {
            const sanitized = {
                ...result,
                id: result.id.toString(),
                airline: result.airline.substring(0, 50),
                flightNumber: result.flightNumber.substring(0, 20),
                duration: Math.max(0, Math.floor(result.duration)),
                layovers: Math.max(0, Math.floor(result.layovers))
            };
            if (result.layoverDuration !== undefined) {
                sanitized.layoverDuration = Math.max(0, Math.floor(result.layoverDuration));
            }
            if (result.score !== undefined) {
                sanitized.score = Math.max(0, Math.min(100, result.score));
            }
            return sanitized;
        });
    }
    isValidUUID(uuid) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return uuidRegex.test(uuid);
    }
    isValidAirportCode(code) {
        return /^[A-Z]{3}$/.test(code);
    }
}
exports.SearchService = SearchService;
//# sourceMappingURL=SearchService.js.map