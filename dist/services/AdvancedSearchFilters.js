"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdvancedSearchFilters = void 0;
const logger_1 = require("../utils/logger");
class AdvancedSearchFilters {
    constructor() {
        this.AIRCRAFT_DATABASE = {
            'A350': {
                type: 'A350',
                manufacturer: 'Airbus',
                wifiAvailable: true,
                entertainmentSystem: true,
                powerOutlets: true,
                lieFlat: true,
                fuelEfficient: true
            },
            'B787': {
                type: 'B787',
                manufacturer: 'Boeing',
                wifiAvailable: true,
                entertainmentSystem: true,
                powerOutlets: true,
                lieFlat: true,
                fuelEfficient: true
            },
            '777': {
                type: '777',
                manufacturer: 'Boeing',
                wifiAvailable: true,
                entertainmentSystem: true,
                powerOutlets: true,
                lieFlat: false,
                fuelEfficient: false
            },
            'A320': {
                type: 'A320',
                manufacturer: 'Airbus',
                wifiAvailable: false,
                entertainmentSystem: false,
                powerOutlets: false,
                lieFlat: false,
                fuelEfficient: true
            }
        };
        this.AIRLINE_DATABASE = {
            'AA': {
                code: 'AA',
                name: 'American Airlines',
                alliance: 'oneworld',
                operatesFor: ['AA', 'US']
            },
            'DL': {
                code: 'DL',
                name: 'Delta Air Lines',
                alliance: 'skyteam',
                operatesFor: ['DL', 'NW']
            },
            'UA': {
                code: 'UA',
                name: 'United Airlines',
                alliance: 'star-alliance',
                operatesFor: ['UA', 'CO']
            },
            'BA': {
                code: 'BA',
                name: 'British Airways',
                alliance: 'oneworld',
                operatesFor: ['BA']
            },
            'LH': {
                code: 'LH',
                name: 'Lufthansa',
                alliance: 'star-alliance',
                operatesFor: ['LH']
            }
        };
    }
    async applyAdvancedFilters(flights, filters) {
        logger_1.logger.info(`Applying advanced filters to ${flights.length} flights`);
        const originalCount = flights.length;
        let filteredFlights = [...flights];
        const removedByFilter = {};
        const appliedFilters = [];
        const warnings = [];
        const suggestions = [];
        if (filters.aircraftTypes && filters.aircraftTypes.length > 0) {
            const beforeCount = filteredFlights.length;
            filteredFlights = this.filterByAircraftTypes(filteredFlights, filters.aircraftTypes);
            removedByFilter['aircraftTypes'] = beforeCount - filteredFlights.length;
            appliedFilters.push('Aircraft types');
        }
        if (filters.excludeAircraftTypes && filters.excludeAircraftTypes.length > 0) {
            const beforeCount = filteredFlights.length;
            filteredFlights = this.excludeAircraftTypes(filteredFlights, filters.excludeAircraftTypes);
            removedByFilter['excludeAircraftTypes'] = beforeCount - filteredFlights.length;
            appliedFilters.push('Excluded aircraft types');
        }
        if (filters.alliancePreference) {
            const beforeCount = filteredFlights.length;
            filteredFlights = this.filterByAlliance(filteredFlights, filters.alliancePreference);
            removedByFilter['alliance'] = beforeCount - filteredFlights.length;
            appliedFilters.push('Alliance preference');
        }
        if (filters.departureTimeWindows && filters.departureTimeWindows.length > 0) {
            const beforeCount = filteredFlights.length;
            filteredFlights = this.filterByDepartureTimeWindows(filteredFlights, filters.departureTimeWindows);
            removedByFilter['departureTimeWindows'] = beforeCount - filteredFlights.length;
            appliedFilters.push('Departure time windows');
        }
        if (filters.arrivalTimeWindows && filters.arrivalTimeWindows.length > 0) {
            const beforeCount = filteredFlights.length;
            filteredFlights = this.filterByArrivalTimeWindows(filteredFlights, filters.arrivalTimeWindows);
            removedByFilter['arrivalTimeWindows'] = beforeCount - filteredFlights.length;
            appliedFilters.push('Arrival time windows');
        }
        if (filters.maxTotalTravelTime) {
            const beforeCount = filteredFlights.length;
            filteredFlights = this.filterByMaxTravelTime(filteredFlights, filters.maxTotalTravelTime);
            removedByFilter['maxTravelTime'] = beforeCount - filteredFlights.length;
            appliedFilters.push('Maximum travel time');
        }
        if (filters.minLayoverTime || filters.maxLayoverTime) {
            const beforeCount = filteredFlights.length;
            filteredFlights = this.filterByLayoverTime(filteredFlights, filters.minLayoverTime, filters.maxLayoverTime);
            removedByFilter['layoverTime'] = beforeCount - filteredFlights.length;
            appliedFilters.push('Layover time constraints');
        }
        if (filters.preferredLayoverAirports && filters.preferredLayoverAirports.length > 0) {
            const beforeCount = filteredFlights.length;
            filteredFlights = this.filterByPreferredLayoverAirports(filteredFlights, filters.preferredLayoverAirports);
            removedByFilter['preferredLayovers'] = beforeCount - filteredFlights.length;
            appliedFilters.push('Preferred layover airports');
        }
        if (filters.avoidLayoverAirports && filters.avoidLayoverAirports.length > 0) {
            const beforeCount = filteredFlights.length;
            filteredFlights = this.filterByAvoidLayoverAirports(filteredFlights, filters.avoidLayoverAirports);
            removedByFilter['avoidLayovers'] = beforeCount - filteredFlights.length;
            appliedFilters.push('Avoided layover airports');
        }
        if (filters.maxSegments) {
            const beforeCount = filteredFlights.length;
            filteredFlights = this.filterByMaxSegments(filteredFlights, filters.maxSegments);
            removedByFilter['maxSegments'] = beforeCount - filteredFlights.length;
            appliedFilters.push('Maximum segments');
        }
        if (filters.directFlightsOnly) {
            const beforeCount = filteredFlights.length;
            filteredFlights = this.filterDirectFlightsOnly(filteredFlights);
            removedByFilter['directOnly'] = beforeCount - filteredFlights.length;
            appliedFilters.push('Direct flights only');
        }
        if (filters.avoidRedEyes) {
            const beforeCount = filteredFlights.length;
            filteredFlights = this.filterAvoidRedEyes(filteredFlights);
            removedByFilter['avoidRedEyes'] = beforeCount - filteredFlights.length;
            appliedFilters.push('Avoid red-eye flights');
        }
        if (filters.wifiRequired) {
            const beforeCount = filteredFlights.length;
            filteredFlights = this.filterByWifiRequired(filteredFlights);
            removedByFilter['wifiRequired'] = beforeCount - filteredFlights.length;
            appliedFilters.push('WiFi required');
        }
        if (filters.lieFlat) {
            const beforeCount = filteredFlights.length;
            filteredFlights = this.filterByLieFlat(filteredFlights);
            removedByFilter['lieFlat'] = beforeCount - filteredFlights.length;
            appliedFilters.push('Lie-flat seats');
        }
        if (filters.fuelEfficientAircraftOnly) {
            const beforeCount = filteredFlights.length;
            filteredFlights = this.filterByFuelEfficiency(filteredFlights);
            removedByFilter['fuelEfficient'] = beforeCount - filteredFlights.length;
            appliedFilters.push('Fuel-efficient aircraft only');
        }
        if (filters.awardAvailabilityOnly) {
            const beforeCount = filteredFlights.length;
            filteredFlights = this.filterByAwardAvailability(filteredFlights);
            removedByFilter['awardAvailability'] = beforeCount - filteredFlights.length;
            appliedFilters.push('Award availability only');
        }
        if (filteredFlights.length === 0) {
            warnings.push('All flights filtered out. Consider relaxing some constraints.');
        }
        else if (filteredFlights.length < originalCount * 0.1) {
            warnings.push('Very few flights remain after filtering. Consider relaxing constraints.');
        }
        if (filters.directFlightsOnly && filteredFlights.length === 0) {
            suggestions.push('No direct flights available. Try allowing 1 stop.');
        }
        if (filters.maxTotalTravelTime && removedByFilter['maxTravelTime'] > originalCount * 0.5) {
            suggestions.push('Travel time constraint removed many options. Consider increasing limit.');
        }
        const filterResult = {
            originalCount,
            filteredCount: filteredFlights.length,
            removedByFilter,
            appliedFilters,
            warnings,
            suggestions
        };
        logger_1.logger.info(`Advanced filtering complete: ${originalCount} → ${filteredFlights.length} flights`);
        return { filteredFlights, filterResult };
    }
    getAvailableFilterOptions(flights) {
        const aircraftTypes = new Set();
        const airlines = new Set();
        const layoverAirports = new Set();
        const alliances = new Set();
        let maxTravelTime = 0;
        let minTravelTime = Infinity;
        flights.forEach(flight => {
            flight.route.forEach(segment => {
                if (segment.aircraft) {
                    aircraftTypes.add(segment.aircraft);
                }
            });
            airlines.add(flight.airline);
            const airlineInfo = this.AIRLINE_DATABASE[flight.airline];
            if (airlineInfo) {
                alliances.add(airlineInfo.alliance);
            }
            if (flight.route.length > 1) {
                for (let i = 0; i < flight.route.length - 1; i++) {
                    layoverAirports.add(flight.route[i].destination);
                }
            }
            maxTravelTime = Math.max(maxTravelTime, flight.duration);
            minTravelTime = Math.min(minTravelTime, flight.duration);
        });
        return {
            aircraftTypes: Array.from(aircraftTypes).sort(),
            airlines: Array.from(airlines).sort(),
            layoverAirports: Array.from(layoverAirports).sort(),
            alliances: Array.from(alliances).sort(),
            maxTravelTime,
            minTravelTime
        };
    }
    filterByAircraftTypes(flights, aircraftTypes) {
        return flights.filter(flight => flight.route.some(segment => segment.aircraft && aircraftTypes.includes(segment.aircraft)));
    }
    excludeAircraftTypes(flights, excludeTypes) {
        return flights.filter(flight => !flight.route.some(segment => segment.aircraft && excludeTypes.includes(segment.aircraft)));
    }
    filterByAlliance(flights, alliance) {
        return flights.filter(flight => {
            const airlineInfo = this.AIRLINE_DATABASE[flight.airline];
            return airlineInfo && airlineInfo.alliance === alliance;
        });
    }
    filterByDepartureTimeWindows(flights, timeWindows) {
        return flights.filter(flight => {
            const departureTime = flight.route[0]?.departureTime;
            if (!departureTime)
                return false;
            const timeString = departureTime.toTimeString().substring(0, 5);
            return timeWindows.some(window => timeString >= window.start && timeString <= window.end);
        });
    }
    filterByArrivalTimeWindows(flights, timeWindows) {
        return flights.filter(flight => {
            const arrivalTime = flight.route[flight.route.length - 1]?.arrivalTime;
            if (!arrivalTime)
                return false;
            const timeString = arrivalTime.toTimeString().substring(0, 5);
            return timeWindows.some(window => timeString >= window.start && timeString <= window.end);
        });
    }
    filterByMaxTravelTime(flights, maxTime) {
        return flights.filter(flight => flight.duration <= maxTime);
    }
    filterByLayoverTime(flights, minTime, maxTime) {
        return flights.filter(flight => {
            if (flight.route.length <= 1)
                return true;
            for (let i = 0; i < flight.route.length - 1; i++) {
                const segment = flight.route[i];
                const nextSegment = flight.route[i + 1];
                const layoverTime = (nextSegment.departureTime.getTime() - segment.arrivalTime.getTime()) / (1000 * 60);
                if (minTime && layoverTime < minTime)
                    return false;
                if (maxTime && layoverTime > maxTime)
                    return false;
            }
            return true;
        });
    }
    filterByPreferredLayoverAirports(flights, preferredAirports) {
        return flights.filter(flight => {
            if (flight.route.length <= 1)
                return true;
            const layoverAirports = flight.route.slice(0, -1).map(segment => segment.destination);
            return layoverAirports.some(airport => preferredAirports.includes(airport));
        });
    }
    filterByAvoidLayoverAirports(flights, avoidAirports) {
        return flights.filter(flight => {
            if (flight.route.length <= 1)
                return true;
            const layoverAirports = flight.route.slice(0, -1).map(segment => segment.destination);
            return !layoverAirports.some(airport => avoidAirports.includes(airport));
        });
    }
    filterByMaxSegments(flights, maxSegments) {
        return flights.filter(flight => flight.route.length <= maxSegments);
    }
    filterDirectFlightsOnly(flights) {
        return flights.filter(flight => flight.route.length === 1);
    }
    filterAvoidRedEyes(flights) {
        return flights.filter(flight => {
            const departureTime = flight.route[0]?.departureTime;
            if (!departureTime)
                return false;
            const hour = departureTime.getHours();
            return !(hour >= 22 || hour <= 6);
        });
    }
    filterByWifiRequired(flights) {
        return flights.filter(flight => flight.route.every(segment => {
            const aircraftInfo = this.AIRCRAFT_DATABASE[segment.aircraft || ''];
            return aircraftInfo && aircraftInfo.wifiAvailable;
        }));
    }
    filterByLieFlat(flights) {
        return flights.filter(flight => flight.route.every(segment => {
            const aircraftInfo = this.AIRCRAFT_DATABASE[segment.aircraft || ''];
            return aircraftInfo && aircraftInfo.lieFlat;
        }));
    }
    filterByFuelEfficiency(flights) {
        return flights.filter(flight => flight.route.every(segment => {
            const aircraftInfo = this.AIRCRAFT_DATABASE[segment.aircraft || ''];
            return aircraftInfo && aircraftInfo.fuelEfficient;
        }));
    }
    filterByAwardAvailability(flights) {
        return flights.filter(flight => flight.pricing.pointsOptions && flight.pricing.pointsOptions.length > 0);
    }
    generateFilterRecommendations(searchCriteria, flights) {
        const recommendations = [];
        const directFlights = flights.filter(f => f.route.length === 1);
        const connectingFlights = flights.filter(f => f.route.length > 1);
        if (directFlights.length > 0 && connectingFlights.length > directFlights.length * 3) {
            recommendations.push('Consider filtering for direct flights only to save time');
        }
        const redEyeFlights = flights.filter(flight => {
            const hour = flight.route[0]?.departureTime.getHours() || 0;
            return hour >= 22 || hour <= 6;
        });
        if (redEyeFlights.length > flights.length * 0.3) {
            recommendations.push('Many red-eye flights available - consider avoiding if you prefer daytime travel');
        }
        const longLayoverFlights = flights.filter(flight => flight.layoverDuration && flight.layoverDuration > 4 * 60);
        if (longLayoverFlights.length > 0) {
            recommendations.push('Some flights have long layovers - consider setting maximum layover time');
        }
        const airlines = [...new Set(flights.map(f => f.airline))];
        const alliances = airlines.map(airline => this.AIRLINE_DATABASE[airline]?.alliance).filter(Boolean);
        const uniqueAlliances = [...new Set(alliances)];
        if (uniqueAlliances.length > 1) {
            recommendations.push('Multiple airline alliances available - filter by alliance for status benefits');
        }
        return recommendations;
    }
}
exports.AdvancedSearchFilters = AdvancedSearchFilters;
//# sourceMappingURL=AdvancedSearchFilters.js.map