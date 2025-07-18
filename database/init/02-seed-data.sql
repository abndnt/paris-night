-- Seed data for Flight Search SaaS
-- Initial data for development and testing

-- Insert sample reward programs
INSERT INTO reward_programs (name, type, valuation_rate, api_endpoint, is_active) VALUES
('Chase Ultimate Rewards', 'credit_card', 0.0125, 'https://api.chase.com/rewards', true),
('American Express Membership Rewards', 'credit_card', 0.0120, 'https://api.americanexpress.com/rewards', true),
('United MileagePlus', 'airline', 0.0110, 'https://api.united.com/mileageplus', true),
('Delta SkyMiles', 'airline', 0.0105, 'https://api.delta.com/skymiles', true),
('American AAdvantage', 'airline', 0.0115, 'https://api.aa.com/aadvantage', true),
('Southwest Rapid Rewards', 'airline', 0.0140, 'https://api.southwest.com/rapidrewards', true),
('Marriott Bonvoy', 'hotel', 0.0080, 'https://api.marriott.com/bonvoy', true),
('Hilton Honors', 'hotel', 0.0050, 'https://api.hilton.com/honors', true);

-- Create a test user for development
INSERT INTO users (email, password_hash, first_name, last_name) VALUES
('test@flightsearch.com', '$2b$10$rOzJqQjQjQjQjQjQjQjQjOzJqQjQjQjQjQjQjQjQjQjQjQjQjQjQj', 'Test', 'User');

-- Get the test user ID for foreign key references
DO $$
DECLARE
    test_user_id UUID;
BEGIN
    SELECT id INTO test_user_id FROM users WHERE email = 'test@flightsearch.com';
    
    -- Insert travel preferences for test user
    INSERT INTO travel_preferences (user_id, preferred_airlines, preferred_airports, seat_preference, preferred_cabin_class) VALUES
    (test_user_id, ARRAY['UA', 'DL', 'AA'], ARRAY['SFO', 'LAX', 'JFK'], 'aisle', 'economy');
    
    -- Insert sample reward accounts for test user
    INSERT INTO reward_accounts (user_id, program_id, account_number, balance) VALUES
    (test_user_id, (SELECT id FROM reward_programs WHERE name = 'Chase Ultimate Rewards'), 'UR123456789', 75000),
    (test_user_id, (SELECT id FROM reward_programs WHERE name = 'United MileagePlus'), 'MP987654321', 45000);
END $$;