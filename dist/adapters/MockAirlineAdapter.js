"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockAirlineAdapter = void 0;
const BaseAirlineAdapter_1 = require("./BaseAirlineAdapter");
class MockAirlineAdapter extends BaseAirlineAdapter_1.BaseAirlineAdapter {
    constructor(config, rateLimiter, cache, options = {}) {
        super('mock', config, rateLimiter, cache);
        this.mockDelay = options.mockDelay || 500;
        this.shouldSimulateError = options.shouldSimulateError || false;
        this.errorRate = options.errorRate || 0.1;
    }
    async makeApiRequest(request) {
        await this.sleep(this.mockDelay);
        if (this.shouldSimulateError && Math.random() < this.errorRate) {
            const errorTypes = [
                { status: 500, message: 'Internal Server Error' },
                { status: 429, message: 'Rate Limit Exceeded' },
                { status: 503, message: 'Service Unavailable' },
                { code: 'ETIMEDOUT', message: 'Request Timeout' }
            ];
            const error = errorTypes[Math.floor(Math.random() * errorTypes.length)];
            const mockError = new Error(error.message);
            mockError.response = 'status' in error ? { status: error.status } : undefined;
            mockError.code = 'code' in error ? error.code : undefined;
            throw mockError;
        }
        return this.generateMockFlightData(request);
    }
    async normalizeResponse(rawResponse, request) {
        const flights = rawResponse.flights.map((flight) => ({
            id: flight.id,
            airline: flight.airline,
            flightNumber: flight.flightNumber,
            route: flight.route,
            pricing: flight.pricing,
            availability: flight.availability,
            duration: flight.duration,
            layovers: flight.layovers,
            layoverDuration: flight.layoverDuration,
            score: flight.score
        }));
        return {
            requestId: request.requestId,
            flights,
            totalResults: flights.length,
            searchTime: this.mockDelay,
            currency: 'USD',
            timestamp: new Date(),
            source: this.name
        };
    }
    handleApiError(error) {
        return {
            code: error.code || 'MOCK_ERROR',
            message: error.message || 'Mock airline API error',
            details: {
                status: error.response?.status,
                originalError: error.message
            },
            retryable: this.isRetryableError(error),
            timestamp: new Date()
        };
    }
    generateMockFlightData(request) {
        const { searchCriteria } = request;
        const flights = [];
        const numFlights = Math.floor(Math.random() * 6) + 3;
        for (let i = 0; i < numFlights; i++) {
            const flight = this.generateMockFlight(searchCriteria, i);
            flights.push(flight);
        }
        return { flights };
    }
    generateMockFlight(searchCriteria, index) {
        const airlines = ['AA', 'UA', 'DL', 'WN', 'B6', 'AS'];
        const aircraft = ['Boeing 737', 'Airbus A320', 'Boeing 777', 'Airbus A330', 'Boeing 787'];
        const airline = airlines[Math.floor(Math.random() * airlines.length)];
        const flightNumber = `${airline}${Math.floor(Math.random() * 9000) + 1000}`;
        const departureDate = new Date(searchCriteria.departureDate);
        departureDate.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));
        const durationMinutes = Math.floor(Math.random() * 360) + 120;
        const arrivalTime = new Date(departureDate.getTime() + durationMinutes * 60000);
        const hasLayover = Math.random() < 0.3;
        const layovers = hasLayover ? 1 : 0;
        let route;
        if (hasLayover) {
            const layoverAirports = ['DFW', 'ATL', 'ORD', 'LAX', 'JFK', 'DEN', 'PHX'];
            const layoverAirport = layoverAirports[Math.floor(Math.random() * layoverAirports.length)] || 'DFW';
            const layoverDuration = Math.floor(Math.random() * 180) + 60;
            const firstSegmentDuration = Math.floor(durationMinutes * 0.6);
            const secondSegmentDuration = durationMinutes - firstSegmentDuration - layoverDuration;
            const firstArrival = new Date(departureDate.getTime() + firstSegmentDuration * 60000);
            const secondDeparture = new Date(firstArrival.getTime() + layoverDuration * 60000);
            const finalArrival = new Date(secondDeparture.getTime() + secondSegmentDuration * 60000);
            route = [
                {
                    airline,
                    flightNumber,
                    origin: searchCriteria.origin,
                    destination: layoverAirport,
                    departureTime: departureDate,
                    arrivalTime: firstArrival,
                    duration: firstSegmentDuration,
                    aircraft: aircraft[Math.floor(Math.random() * aircraft.length)]
                },
                {
                    airline,
                    flightNumber: `${airline}${Math.floor(Math.random() * 9000) + 1000}`,
                    origin: layoverAirport,
                    destination: searchCriteria.destination,
                    departureTime: secondDeparture,
                    arrivalTime: finalArrival,
                    duration: secondSegmentDuration,
                    aircraft: aircraft[Math.floor(Math.random() * aircraft.length)]
                }
            ];
        }
        else {
            route = [
                {
                    airline,
                    flightNumber,
                    origin: searchCriteria.origin,
                    destination: searchCriteria.destination,
                    departureTime: departureDate,
                    arrivalTime: arrivalTime,
                    duration: durationMinutes,
                    aircraft: aircraft[Math.floor(Math.random() * aircraft.length)]
                }
            ];
        }
        const baseCashPrice = Math.floor(Math.random() * 800) + 200;
        const taxes = Math.floor(baseCashPrice * 0.15);
        const fees = Math.floor(Math.random() * 50) + 10;
        const pricing = {
            cashPrice: baseCashPrice,
            currency: 'USD',
            pointsOptions: [
                {
                    program: 'Chase Ultimate Rewards',
                    pointsRequired: Math.floor(baseCashPrice * 80),
                    cashComponent: taxes + fees,
                    transferRatio: 1.0,
                    bestValue: true
                },
                {
                    program: `${airline} Miles`,
                    pointsRequired: Math.floor(baseCashPrice * 100),
                    cashComponent: taxes + fees,
                    transferRatio: 1.0,
                    bestValue: false
                }
            ],
            taxes,
            fees,
            totalPrice: baseCashPrice + taxes + fees
        };
        const availability = {
            availableSeats: Math.floor(Math.random() * 9) + 1,
            bookingClass: searchCriteria.cabinClass === 'economy' ? 'Y' :
                searchCriteria.cabinClass === 'business' ? 'J' : 'F',
            fareBasis: `${searchCriteria.cabinClass.toUpperCase()}${Math.floor(Math.random() * 9)}`
        };
        if (Math.random() < 0.5) {
            availability.restrictions = ['Non-refundable', '24hr cancellation'];
        }
        const priceScore = Math.max(0, 100 - (baseCashPrice - 200) / 8);
        const durationScore = Math.max(0, 100 - (durationMinutes - 120) / 3);
        const layoverScore = layovers === 0 ? 100 : 50;
        const score = Math.round((priceScore + durationScore + layoverScore) / 3);
        return {
            id: `mock-flight-${index + 1}`,
            airline,
            flightNumber,
            route,
            pricing,
            availability,
            duration: durationMinutes,
            layovers,
            layoverDuration: hasLayover ? route.reduce((total, segment, idx) => {
                if (idx < route.length - 1) {
                    const nextSegment = route[idx + 1];
                    if (nextSegment) {
                        return total + (nextSegment.departureTime.getTime() - segment.arrivalTime.getTime()) / 60000;
                    }
                }
                return total;
            }, 0) : undefined,
            score
        };
    }
    async healthCheck() {
        return !this.shouldSimulateError || Math.random() > this.errorRate;
    }
    setMockDelay(delay) {
        this.mockDelay = delay;
    }
    setErrorSimulation(shouldSimulate, errorRate) {
        this.shouldSimulateError = shouldSimulate;
        if (errorRate !== undefined) {
            this.errorRate = errorRate;
        }
    }
    async generateScenario(scenario) {
        switch (scenario) {
            case 'no-flights':
                return { flights: [] };
            case 'expensive-flights':
                return {
                    flights: Array.from({ length: 3 }, (_, i) => {
                        const flight = this.generateMockFlight({
                            origin: 'LAX',
                            destination: 'JFK',
                            departureDate: new Date(),
                            cabinClass: 'economy'
                        }, i);
                        flight.pricing.cashPrice = Math.floor(Math.random() * 1000) + 1500;
                        flight.pricing.totalPrice = flight.pricing.cashPrice + flight.pricing.taxes + flight.pricing.fees;
                        return flight;
                    })
                };
            case 'direct-only':
                return {
                    flights: Array.from({ length: 4 }, (_, i) => {
                        const flight = this.generateMockFlight({
                            origin: 'LAX',
                            destination: 'JFK',
                            departureDate: new Date(),
                            cabinClass: 'economy'
                        }, i);
                        flight.layovers = 0;
                        flight.route = [flight.route[0]];
                        return flight;
                    })
                };
            case 'layovers-only':
                return {
                    flights: Array.from({ length: 3 }, (_, i) => {
                        const flight = this.generateMockFlight({
                            origin: 'LAX',
                            destination: 'JFK',
                            departureDate: new Date(),
                            cabinClass: 'economy'
                        }, i);
                        while (flight.layovers === 0) {
                            Object.assign(flight, this.generateMockFlight({
                                origin: 'LAX',
                                destination: 'JFK',
                                departureDate: new Date(),
                                cabinClass: 'economy'
                            }, i));
                        }
                        return flight;
                    })
                };
            default:
                throw new Error(`Unknown scenario: ${scenario}`);
        }
    }
}
exports.MockAirlineAdapter = MockAirlineAdapter;
//# sourceMappingURL=MockAirlineAdapter.js.map