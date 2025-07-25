"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RouteOptimizationService = void 0;
const logger_1 = require("../utils/logger");
class RouteOptimizationService {
    constructor() {
        this.POSITIONING_THRESHOLD_SAVINGS = 100;
        this.MAX_POSITIONING_DETOUR_MILES = 500;
        this.MIN_LAYOVER_TIME = 60;
        this.MAX_LAYOVER_TIME = 1440;
        this.STOPOVER_MIN_DURATION = 4;
        this.MAJOR_HUBS = [
            'JFK', 'LAX', 'ORD', 'DFW', 'ATL', 'DEN', 'SFO', 'SEA', 'MIA', 'BOS',
            'LHR', 'CDG', 'FRA', 'AMS', 'ZUR', 'NRT', 'ICN', 'SIN', 'DXB', 'DOH'
        ];
    }
    async optimizeRoute(searchCriteria, availableFlights, options) {
        logger_1.logger.info(`Starting route optimization for ${searchCriteria.origin} to ${searchCriteria.destination}`);
        const alternatives = [];
        const directRoute = this.createDirectRoute(searchCriteria, availableFlights);
        if (options.considerPositioning) {
            const positioningOptions = await this.findPositioningFlights(searchCriteria, availableFlights, options.maxPositioningDetour);
            for (const positioning of positioningOptions) {
                if (positioning.feasible && positioning.savings >= this.POSITIONING_THRESHOLD_SAVINGS) {
                    alternatives.push(this.createPositioningRoute(positioning));
                }
            }
        }
        if (options.allowStopovers) {
            const stopoverOptions = await this.findStopoverOptions(searchCriteria, availableFlights, options.maxStopoverDuration);
            for (const stopover of stopoverOptions) {
                alternatives.push(this.createStopoverRoute(searchCriteria, stopover, availableFlights));
            }
        }
        if (options.considerOpenJaw && searchCriteria.returnDate) {
            const openJawOptions = await this.findOpenJawOptions(searchCriteria, availableFlights, options.maxGroundTransportTime);
            for (const openJaw of openJawOptions) {
                if (openJaw.feasible) {
                    alternatives.push(this.createOpenJawRoute(openJaw));
                }
            }
        }
        const allRoutes = [directRoute, ...alternatives];
        const scoredRoutes = allRoutes.map(route => ({
            ...route,
            optimizationScore: this.calculateOptimizationScore(route, options)
        }));
        scoredRoutes.sort((a, b) => b.optimizationScore - a.optimizationScore);
        const bestRoute = scoredRoutes[0];
        bestRoute.alternatives = scoredRoutes.slice(1);
        logger_1.logger.info(`Route optimization completed. Best route type: ${bestRoute.routeType}, Score: ${bestRoute.optimizationScore}`);
        return bestRoute;
    }
    async findPositioningFlights(searchCriteria, availableFlights, maxDetourMiles = this.MAX_POSITIONING_DETOUR_MILES) {
        const suggestions = [];
        const nearbyOrigins = this.getNearbyAirports(searchCriteria.origin, maxDetourMiles);
        const nearbyDestinations = this.getNearbyAirports(searchCriteria.destination, maxDetourMiles);
        for (const altOrigin of nearbyOrigins) {
            for (const altDestination of nearbyDestinations) {
                if (altOrigin === searchCriteria.origin && altDestination === searchCriteria.destination) {
                    continue;
                }
                const positioningFlight = this.findBestPositioningFlight(searchCriteria.origin, altOrigin, searchCriteria.departureDate, availableFlights);
                const mainFlight = this.findBestMainFlight(altOrigin, altDestination, searchCriteria, availableFlights);
                if (positioningFlight && mainFlight) {
                    const originalCost = this.getDirectFlightCost(searchCriteria, availableFlights);
                    const totalCost = positioningFlight.pricing.totalPrice + mainFlight.pricing.totalPrice;
                    const savings = originalCost - totalCost;
                    suggestions.push({
                        originalSearch: searchCriteria,
                        positioningFlight,
                        mainFlight,
                        totalCost,
                        totalTime: positioningFlight.duration + mainFlight.duration,
                        savings,
                        feasible: savings > 0 && this.isTimingFeasible(positioningFlight, mainFlight),
                        reason: savings <= 0 ? 'No cost savings' : undefined
                    });
                }
            }
        }
        return suggestions.filter(s => s.feasible).sort((a, b) => b.savings - a.savings);
    }
    async findStopoverOptions(searchCriteria, availableFlights, maxStopoverHours) {
        const stopovers = [];
        const connectingFlights = availableFlights.filter(flight => flight.route.length > 1 &&
            flight.layoverDuration &&
            flight.layoverDuration >= this.STOPOVER_MIN_DURATION * 60);
        for (const flight of connectingFlights) {
            for (let i = 0; i < flight.route.length - 1; i++) {
                const segment = flight.route[i];
                const nextSegment = flight.route[i + 1];
                const layoverTime = (nextSegment.departureTime.getTime() - segment.arrivalTime.getTime()) / (1000 * 60);
                if (layoverTime >= this.STOPOVER_MIN_DURATION * 60 && layoverTime <= maxStopoverHours * 60) {
                    const stopoverCity = segment.destination;
                    if (this.MAJOR_HUBS.includes(stopoverCity)) {
                        stopovers.push({
                            city: stopoverCity,
                            minStayDuration: Math.max(this.STOPOVER_MIN_DURATION, layoverTime / 60),
                            maxStayDuration: Math.min(maxStopoverHours, 72),
                            additionalCost: this.calculateStopoverCost(stopoverCity),
                            availableActivities: this.getStopoverActivities(stopoverCity)
                        });
                    }
                }
            }
        }
        return stopovers;
    }
    async findOpenJawOptions(searchCriteria, availableFlights, maxGroundTransportHours) {
        if (!searchCriteria.returnDate) {
            return [];
        }
        const openJawOptions = [];
        const nearbyDestinations = this.getNearbyAirports(searchCriteria.destination, 200);
        for (const altDestination of nearbyDestinations) {
            if (altDestination === searchCriteria.destination)
                continue;
            const outboundFlight = availableFlights.find(flight => flight.route[0]?.origin === searchCriteria.origin &&
                flight.route[flight.route.length - 1]?.destination === altDestination);
            const returnFlight = availableFlights.find(flight => flight.route[0]?.origin === searchCriteria.destination &&
                flight.route[flight.route.length - 1]?.destination === searchCriteria.origin);
            if (outboundFlight && returnFlight) {
                const groundTransport = this.calculateGroundTransport(altDestination, searchCriteria.destination, maxGroundTransportHours);
                if (groundTransport && groundTransport.duration <= maxGroundTransportHours) {
                    const totalCost = outboundFlight.pricing.totalPrice +
                        returnFlight.pricing.totalPrice +
                        groundTransport.cost;
                    openJawOptions.push({
                        outboundOrigin: searchCriteria.origin,
                        outboundDestination: altDestination,
                        returnOrigin: searchCriteria.destination,
                        returnDestination: searchCriteria.origin,
                        outboundFlight,
                        returnFlight,
                        groundTransport,
                        totalCost,
                        feasible: true
                    });
                }
            }
        }
        return openJawOptions.filter(option => option.feasible);
    }
    async optimizeMultiCityRoute(criteria, availableFlights) {
        logger_1.logger.info(`Optimizing multi-city route for ${criteria.cities.length} cities`);
        const segments = [];
        let totalCost = 0;
        let totalTime = 0;
        for (let i = 0; i < criteria.cities.length - 1; i++) {
            const origin = criteria.cities[i];
            const destination = criteria.cities[i + 1];
            const segmentFlights = availableFlights.filter(flight => flight.route[0]?.origin === origin &&
                flight.route[flight.route.length - 1]?.destination === destination);
            if (segmentFlights.length === 0) {
                throw new Error(`No flights available from ${origin} to ${destination}`);
            }
            const bestFlight = this.selectBestSegmentFlight(segmentFlights, criteria);
            segments.push(bestFlight);
            totalCost += bestFlight.pricing.totalPrice;
            totalTime += bestFlight.duration;
        }
        const individualCosts = segments.reduce((sum, flight) => sum + flight.pricing.totalPrice, 0);
        const savings = individualCosts - totalCost;
        return {
            originalCriteria: this.convertMultiCityToSearchCriteria(criteria),
            optimizedFlights: segments,
            routeType: 'multi-city',
            totalCost,
            totalTime,
            savings,
            optimizationScore: this.calculateMultiCityScore(segments, criteria),
            recommendations: this.generateMultiCityRecommendations(segments, criteria),
            alternatives: []
        };
    }
    createDirectRoute(searchCriteria, availableFlights) {
        const directFlights = availableFlights.filter(flight => flight.route[0]?.origin === searchCriteria.origin &&
            flight.route[flight.route.length - 1]?.destination === searchCriteria.destination);
        const bestDirect = directFlights.reduce((best, current) => current.pricing.totalPrice < best.pricing.totalPrice ? current : best);
        return {
            originalCriteria: searchCriteria,
            optimizedFlights: [bestDirect],
            routeType: 'direct',
            totalCost: bestDirect.pricing.totalPrice,
            totalTime: bestDirect.duration,
            savings: 0,
            optimizationScore: 50,
            recommendations: ['Direct flight - fastest and simplest option'],
            alternatives: []
        };
    }
    calculateOptimizationScore(route, options) {
        let score = 0;
        if (options.prioritizeCost) {
            const costScore = Math.max(0, 40 - (route.totalCost / 100));
            score += costScore;
        }
        if (options.prioritizeTime) {
            const timeScore = Math.max(0, 30 - (route.totalTime / 60));
            score += timeScore;
        }
        if (options.prioritizePoints && route.pointsRequired) {
            const pointsScore = Math.max(0, 20 - (route.pointsRequired / 1000));
            score += pointsScore;
        }
        if (route.savings > 0) {
            score += Math.min(10, route.savings / 50);
        }
        return Math.round(score);
    }
    getNearbyAirports(airportCode, maxDistanceMiles) {
        const nearbyMap = {
            'JFK': ['LGA', 'EWR'],
            'LAX': ['BUR', 'LGB', 'SNA'],
            'ORD': ['MDW'],
            'DFW': ['DAL'],
            'SFO': ['SJC', 'OAK'],
            'LHR': ['LGW', 'STN', 'LTN'],
            'CDG': ['ORY'],
            'NRT': ['HND']
        };
        return [airportCode, ...(nearbyMap[airportCode] || [])];
    }
    findBestPositioningFlight(origin, destination, departureDate, availableFlights) {
        const positioningFlights = availableFlights.filter(flight => flight.route[0]?.origin === origin &&
            flight.route[flight.route.length - 1]?.destination === destination);
        if (positioningFlights.length === 0)
            return null;
        return positioningFlights.reduce((best, current) => current.pricing.totalPrice < best.pricing.totalPrice ? current : best);
    }
    findBestMainFlight(origin, destination, searchCriteria, availableFlights) {
        const mainFlights = availableFlights.filter(flight => flight.route[0]?.origin === origin &&
            flight.route[flight.route.length - 1]?.destination === destination);
        if (mainFlights.length === 0)
            return null;
        return mainFlights.reduce((best, current) => current.pricing.totalPrice < best.pricing.totalPrice ? current : best);
    }
    getDirectFlightCost(searchCriteria, availableFlights) {
        const directFlights = availableFlights.filter(flight => flight.route[0]?.origin === searchCriteria.origin &&
            flight.route[flight.route.length - 1]?.destination === searchCriteria.destination);
        if (directFlights.length === 0)
            return Infinity;
        return Math.min(...directFlights.map(f => f.pricing.totalPrice));
    }
    isTimingFeasible(positioningFlight, mainFlight) {
        const positioningArrival = positioningFlight.route[positioningFlight.route.length - 1].arrivalTime;
        const mainDeparture = mainFlight.route[0].departureTime;
        const layoverTime = (mainDeparture.getTime() - positioningArrival.getTime()) / (1000 * 60);
        return layoverTime >= this.MIN_LAYOVER_TIME && layoverTime <= this.MAX_LAYOVER_TIME;
    }
    calculateStopoverCost(city) {
        const baseCost = 50;
        const cityMultipliers = {
            'LHR': 1.5, 'CDG': 1.4, 'FRA': 1.3, 'AMS': 1.2,
            'NRT': 1.6, 'ICN': 1.3, 'SIN': 1.4, 'DXB': 1.5
        };
        return baseCost * (cityMultipliers[city] || 1.0);
    }
    getStopoverActivities(city) {
        const activities = {
            'LHR': ['London city tour', 'Museums', 'Shopping'],
            'CDG': ['Paris city center', 'Louvre', 'Eiffel Tower'],
            'AMS': ['Canal cruise', 'Museums', 'City center'],
            'NRT': ['Tokyo city tour', 'Traditional temples', 'Shopping'],
            'ICN': ['Seoul city tour', 'Palaces', 'Shopping'],
            'SIN': ['City tour', 'Gardens by the Bay', 'Shopping'],
            'DXB': ['Dubai Mall', 'Burj Khalifa', 'Desert safari']
        };
        return activities[city] || ['City tour', 'Local attractions'];
    }
    calculateGroundTransport(from, to, maxHours) {
        const routes = {
            'LGW': {
                'LHR': { method: 'train', duration: 1.5, cost: 25 }
            },
            'ORY': {
                'CDG': { method: 'train', duration: 1, cost: 15 }
            },
            'SJC': {
                'SFO': { method: 'car', duration: 1, cost: 30 }
            }
        };
        const route = routes[from]?.[to];
        if (!route || route.duration > maxHours) {
            return null;
        }
        return route;
    }
    createPositioningRoute(positioning) {
        return {
            originalCriteria: positioning.originalSearch,
            optimizedFlights: [positioning.positioningFlight, positioning.mainFlight],
            routeType: 'positioning',
            totalCost: positioning.totalCost,
            totalTime: positioning.totalTime,
            savings: positioning.savings,
            optimizationScore: 0,
            recommendations: [
                `Save $${positioning.savings} with positioning flight`,
                'Requires additional travel time but significant savings'
            ],
            alternatives: []
        };
    }
    createStopoverRoute(searchCriteria, stopover, availableFlights) {
        const stopoverFlight = availableFlights.find(flight => flight.route.some(segment => segment.destination === stopover.city));
        if (!stopoverFlight) {
            throw new Error(`No flight found with stopover in ${stopover.city}`);
        }
        return {
            originalCriteria: searchCriteria,
            optimizedFlights: [stopoverFlight],
            routeType: 'stopover',
            totalCost: stopoverFlight.pricing.totalPrice + stopover.additionalCost,
            totalTime: stopoverFlight.duration + (stopover.minStayDuration * 60),
            savings: -stopover.additionalCost,
            optimizationScore: 0,
            recommendations: [
                `Explore ${stopover.city} during your journey`,
                `Activities: ${stopover.availableActivities?.join(', ')}`
            ],
            alternatives: []
        };
    }
    createOpenJawRoute(openJaw) {
        return {
            originalCriteria: {
                origin: openJaw.outboundOrigin,
                destination: openJaw.outboundDestination,
                departureDate: openJaw.outboundFlight.route[0].departureTime,
                returnDate: openJaw.returnFlight.route[0].departureTime,
                passengers: { adults: 1, children: 0, infants: 0 },
                cabinClass: 'economy',
                flexible: false
            },
            optimizedFlights: [openJaw.outboundFlight, openJaw.returnFlight],
            routeType: 'open-jaw',
            totalCost: openJaw.totalCost,
            totalTime: openJaw.outboundFlight.duration + openJaw.returnFlight.duration + (openJaw.groundTransport?.duration || 0) * 60,
            savings: 0,
            optimizationScore: 0,
            recommendations: [
                'Open-jaw routing allows flexible ground travel',
                `Ground transport: ${openJaw.groundTransport?.method} (${openJaw.groundTransport?.duration}h)`
            ],
            alternatives: []
        };
    }
    selectBestSegmentFlight(flights, criteria) {
        return flights.reduce((best, current) => {
            const bestScore = this.calculateSegmentScore(best, criteria);
            const currentScore = this.calculateSegmentScore(current, criteria);
            return currentScore > bestScore ? current : best;
        });
    }
    calculateSegmentScore(flight, criteria) {
        let score = 100;
        score -= flight.pricing.totalPrice / 10;
        score -= flight.duration / 60;
        score -= flight.layovers * 5;
        return score;
    }
    calculateMultiCityScore(segments, criteria) {
        let score = 70;
        const avgLayovers = segments.reduce((sum, s) => sum + s.layovers, 0) / segments.length;
        score += Math.max(0, 10 - avgLayovers * 2);
        const totalCost = segments.reduce((sum, s) => sum + s.pricing.totalPrice, 0);
        const avgCost = totalCost / segments.length;
        if (avgCost < 500)
            score += 10;
        return Math.round(score);
    }
    generateMultiCityRecommendations(segments, criteria) {
        const recommendations = [];
        recommendations.push(`Multi-city itinerary covering ${criteria.cities.length} cities`);
        const totalLayovers = segments.reduce((sum, s) => sum + s.layovers, 0);
        if (totalLayovers === 0) {
            recommendations.push('All direct flights - optimal routing');
        }
        else {
            recommendations.push(`${totalLayovers} total layovers across all segments`);
        }
        const airlines = [...new Set(segments.map(s => s.airline))];
        if (airlines.length === 1) {
            recommendations.push(`Single airline (${airlines[0]}) - easier for changes and status`);
        }
        else {
            recommendations.push(`Multiple airlines - may require separate check-ins`);
        }
        return recommendations;
    }
    convertMultiCityToSearchCriteria(criteria) {
        return {
            origin: criteria.cities[0],
            destination: criteria.cities[criteria.cities.length - 1],
            departureDate: criteria.departureDate,
            returnDate: criteria.returnDate,
            passengers: criteria.passengers,
            cabinClass: criteria.cabinClass,
            flexible: criteria.flexible
        };
    }
}
exports.RouteOptimizationService = RouteOptimizationService;
//# sourceMappingURL=RouteOptimizationService.js.map