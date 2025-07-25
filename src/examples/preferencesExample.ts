/**
 * Example demonstrating user preferences and personalization features
 * This shows how to use the travel preferences system for personalized flight search
 */

import { Pool } from 'pg';
import { TravelPreferencesModel, CreateTravelPreferencesData } from '../models/TravelPreferences';
import { PreferenceFilterService } from '../services/PreferenceFilterService';
import { PersonalizationEngine } from '../services/PersonalizationEngine';
import { PreferenceLearningService } from '../services/PreferenceLearningService';
import { FlightResult } from '../models/FlightSearch';

// Mock database connection (replace with actual connection in real usage)
const mockDb = new Pool({
  connectionString: process.env['DATABASE_URL'] || 'postgresql://localhost:5432/flight_search_dev'
});

async function demonstratePreferences() {
  console.log('🎯 Flight Search Preferences & Personalization Demo\n');

  // Initialize services
  const preferencesModel = new TravelPreferencesModel(mockDb);
  const filterService = new PreferenceFilterService();
  const personalizationEngine = new PersonalizationEngine(mockDb);
  const learningService = new PreferenceLearningService(mockDb);

  const userId = 'demo-user-123';

  try {
    // 1. Create user travel preferences
    console.log('1️⃣ Creating user travel preferences...');
    const preferencesData: CreateTravelPreferencesData = {
      userId,
      preferredAirlines: ['AA', 'DL', 'UA'],
      preferredAirports: ['JFK', 'LAX', 'ORD', 'ATL'],
      seatPreference: 'aisle',
      mealPreference: 'vegetarian',
      maxLayovers: 1,
      preferredCabinClass: 'economy',
    };

    const preferences = await preferencesModel.upsert(preferencesData);
    console.log('✅ Preferences created:', {
      preferredAirlines: preferences.preferredAirlines,
      preferredAirports: preferences.preferredAirports,
      seatPreference: preferences.seatPreference,
      maxLayovers: preferences.maxLayovers,
      preferredCabinClass: preferences.preferredCabinClass,
    });

    // 2. Mock flight search results
    console.log('\n2️⃣ Mock flight search results...');
    const mockFlightResults: FlightResult[] = [
      {
        id: 'flight-1',
        airline: 'AA', // Preferred airline
        flightNumber: 'AA100',
        route: [
          {
            flightNumber: 'AA100',
            airline: 'AA',
            origin: 'JFK', // Preferred airport
            destination: 'LAX', // Preferred airport
            departureTime: new Date('2024-06-01T10:00:00Z'),
            arrivalTime: new Date('2024-06-01T13:00:00Z'),
            duration: 360,
            aircraft: 'Boeing 737',
          }
        ],
        pricing: {
          cashPrice: 300,
          currency: 'USD',
          pointsOptions: [],
          taxes: 50,
          fees: 0,
          totalPrice: 350,
        },
        availability: {
          availableSeats: 10,
          bookingClass: 'Y', // Economy class
          fareBasis: 'Y',
        },
        duration: 360,
        layovers: 0, // Direct flight (better than max 1 layover preference)
      },
      {
        id: 'flight-2',
        airline: 'SW', // Not preferred airline
        flightNumber: 'SW200',
        route: [
          {
            flightNumber: 'SW200',
            airline: 'SW',
            origin: 'LGA', // Not preferred airport
            destination: 'LAX',
            departureTime: new Date('2024-06-01T08:00:00Z'),
            arrivalTime: new Date('2024-06-01T11:00:00Z'),
            duration: 360,
            aircraft: 'Boeing 737',
          }
        ],
        pricing: {
          cashPrice: 250,
          currency: 'USD',
          pointsOptions: [],
          taxes: 40,
          fees: 0,
          totalPrice: 290,
        },
        availability: {
          availableSeats: 15,
          bookingClass: 'Y',
          fareBasis: 'Y',
        },
        duration: 360,
        layovers: 0,
      },
      {
        id: 'flight-3',
        airline: 'UA', // Preferred airline
        flightNumber: 'UA300',
        route: [
          {
            flightNumber: 'UA300',
            airline: 'UA',
            origin: 'JFK', // Preferred airport
            destination: 'ORD', // Preferred airport
            departureTime: new Date('2024-06-01T09:00:00Z'),
            arrivalTime: new Date('2024-06-01T11:00:00Z'),
            duration: 180,
            aircraft: 'Boeing 777',
          },
          {
            flightNumber: 'UA301',
            airline: 'UA',
            origin: 'ORD',
            destination: 'LAX',
            departureTime: new Date('2024-06-01T12:00:00Z'),
            arrivalTime: new Date('2024-06-01T14:00:00Z'),
            duration: 240,
            aircraft: 'Boeing 777',
          }
        ],
        pricing: {
          cashPrice: 320,
          currency: 'USD',
          pointsOptions: [],
          taxes: 55,
          fees: 0,
          totalPrice: 375,
        },
        availability: {
          availableSeats: 8,
          bookingClass: 'Y',
          fareBasis: 'Y',
        },
        duration: 420,
        layovers: 1, // Matches max layover preference
      }
    ];

    console.log(`✅ Found ${mockFlightResults.length} flight options`);

    // 3. Filter and rank results by preferences
    console.log('\n3️⃣ Filtering and ranking flights by preferences...');
    const filteredResults = await filterService.filterByPreferences(
      mockFlightResults,
      preferences,
      { strictFiltering: false } // Rank by preference, don't exclude
    );

    console.log('✅ Results ranked by preference score:');
    filteredResults.results.forEach((flight, index) => {
      console.log(`   ${index + 1}. ${flight.airline} ${flight.flightNumber} - ${flight.route[0]?.origin} to ${flight.route[flight.route.length - 1]?.destination}`);
      console.log(`      Price: $${flight.pricing.totalPrice}, Layovers: ${flight.layovers}`);
      console.log(`      Matches: Airline=${preferences.preferredAirlines.includes(flight.airline)}, Airport=${flight.route.some(r => preferences.preferredAirports.includes(r.origin) || preferences.preferredAirports.includes(r.destination))}`);
    });

    console.log(`\n   Applied filters: ${filteredResults.appliedFilters.join(', ')}`);

    // 4. Get search recommendations based on preferences
    console.log('\n4️⃣ Getting search recommendations...');
    const searchRecommendations = await filterService.getSearchRecommendations(preferences);
    console.log('✅ Search recommendations:', {
      recommendedAirlines: searchRecommendations.recommendedAirlines,
      recommendedAirports: searchRecommendations.recommendedAirports.slice(0, 3), // Show first 3
      recommendedCabinClass: searchRecommendations.recommendedCabinClass,
      recommendedMaxLayovers: searchRecommendations.recommendedMaxLayovers,
    });

    // 5. Generate personalized recommendations
    console.log('\n5️⃣ Generating personalized recommendations...');
    try {
      const personalizedRecs = await personalizationEngine.generateRecommendations(userId);
      console.log(`✅ Generated ${personalizedRecs.length} personalized recommendations:`);
      personalizedRecs.slice(0, 3).forEach((rec, index) => {
        console.log(`   ${index + 1}. ${rec.type.toUpperCase()}: ${rec.title}`);
        console.log(`      ${rec.description} (Score: ${rec.score})`);
      });
    } catch (error) {
      console.log('ℹ️ Personalized recommendations require booking/search history');
    }

    // 6. Demonstrate preference learning
    console.log('\n6️⃣ Demonstrating preference learning...');
    try {
      const learningResult = await learningService.learnAndUpdatePreferences(userId);
      console.log(`✅ Learning confidence: ${(learningResult.learningConfidence * 100).toFixed(1)}%`);
      console.log(`   Generated ${learningResult.insights.length} insights:`);
      learningResult.insights.slice(0, 2).forEach((insight, index) => {
        console.log(`   ${index + 1}. ${insight.type.toUpperCase()}: ${insight.insight}`);
        console.log(`      Confidence: ${(insight.confidence * 100).toFixed(1)}%`);
      });
    } catch (error) {
      console.log('ℹ️ Preference learning requires booking history');
    }

    // 7. Update preferences
    console.log('\n7️⃣ Updating preferences...');
    const updatedPreferences = await preferencesModel.update(userId, {
      preferredAirlines: ['AA', 'DL', 'UA', 'SW'], // Add Southwest
      maxLayovers: 2, // Allow more layovers
    });

    if (updatedPreferences) {
      console.log('✅ Preferences updated:', {
        preferredAirlines: updatedPreferences.preferredAirlines,
        maxLayovers: updatedPreferences.maxLayovers,
      });
    }

    // 8. Re-filter with updated preferences
    console.log('\n8️⃣ Re-filtering with updated preferences...');
    const reFilteredResults = await filterService.filterByPreferences(
      mockFlightResults,
      updatedPreferences,
      { strictFiltering: false }
    );

    console.log('✅ Updated ranking:');
    reFilteredResults.results.forEach((flight, index) => {
      console.log(`   ${index + 1}. ${flight.airline} ${flight.flightNumber} - $${flight.pricing.totalPrice}`);
    });

    console.log('\n🎉 Preferences demo completed successfully!');

  } catch (error) {
    console.error('❌ Error in preferences demo:', error);
  } finally {
    // Clean up
    try {
      await preferencesModel.delete(userId);
      console.log('\n🧹 Demo data cleaned up');
    } catch (error) {
      console.log('ℹ️ Cleanup not needed (demo data may not exist)');
    }
  }
}

// Example usage scenarios
async function usageScenarios() {
  console.log('\n📚 Common Usage Scenarios:\n');

  console.log('1. Business Traveler Profile:');
  console.log('   - Preferred airlines: AA, DL (for status benefits)');
  console.log('   - Preferred airports: Hub airports (ATL, DFW, ORD)');
  console.log('   - Cabin class: Business for long flights, Economy for short');
  console.log('   - Max layovers: 1 (time-sensitive)');
  console.log('   - Seat preference: Aisle (for easy access)');

  console.log('\n2. Leisure Traveler Profile:');
  console.log('   - Preferred airlines: Budget carriers (SW, B6, NK)');
  console.log('   - Preferred airports: Secondary airports for better deals');
  console.log('   - Cabin class: Economy (cost-conscious)');
  console.log('   - Max layovers: 2 (flexible for savings)');
  console.log('   - Seat preference: Window (for views)');

  console.log('\n3. Points Enthusiast Profile:');
  console.log('   - Preferred airlines: Based on credit card partnerships');
  console.log('   - Preferred airports: Hub airports for award availability');
  console.log('   - Cabin class: Premium (maximize point value)');
  console.log('   - Max layovers: 2 (flexible for award space)');
  console.log('   - Focus on point optimization over cash price');

  console.log('\n4. Family Traveler Profile:');
  console.log('   - Preferred airlines: Family-friendly (DL, AA)');
  console.log('   - Preferred airports: Major hubs with amenities');
  console.log('   - Cabin class: Economy+ (extra space)');
  console.log('   - Max layovers: 1 (minimize travel complexity)');
  console.log('   - Seat preference: Together seating priority');
}

// Run the demo
if (require.main === module) {
  demonstratePreferences()
    .then(() => usageScenarios())
    .then(() => {
      console.log('\n✨ Demo completed! Check the code for implementation details.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Demo failed:', error);
      process.exit(1);
    });
}

export {
  demonstratePreferences,
  usageScenarios,
};