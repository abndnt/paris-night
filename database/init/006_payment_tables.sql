-- Payment system tables for Flight Search SaaS

-- Payment intents table
CREATE TABLE IF NOT EXISTS payment_intents (
    id VARCHAR(255) PRIMARY KEY,
    booking_id UUID NOT NULL,
    user_id UUID NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    payment_method JSONB NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    provider_intent_id VARCHAR(255),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT fk_payment_intent_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    CONSTRAINT fk_payment_intent_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT chk_payment_intent_amount CHECK (amount >= 0),
    CONSTRAINT chk_payment_intent_status CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled'))
);

-- Payment transactions table
CREATE TABLE IF NOT EXISTS payment_transactions (
    id VARCHAR(255) PRIMARY KEY,
    payment_intent_id VARCHAR(255) NOT NULL,
    booking_id UUID NOT NULL,
    user_id UUID NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    type VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    provider VARCHAR(50) NOT NULL,
    provider_transaction_id VARCHAR(255),
    points_transaction JSONB,
    failure_reason TEXT,
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT fk_payment_transaction_intent FOREIGN KEY (payment_intent_id) REFERENCES payment_intents(id) ON DELETE CASCADE,
    CONSTRAINT fk_payment_transaction_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    CONSTRAINT fk_payment_transaction_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT chk_payment_transaction_amount CHECK (amount >= 0),
    CONSTRAINT chk_payment_transaction_type CHECK (type IN ('charge', 'refund', 'points_redemption')),
    CONSTRAINT chk_payment_transaction_status CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled')),
    CONSTRAINT chk_payment_transaction_provider CHECK (provider IN ('stripe', 'points_system'))
);

-- Payment receipts table
CREATE TABLE IF NOT EXISTS payment_receipts (
    id VARCHAR(255) PRIMARY KEY,
    payment_intent_id VARCHAR(255) NOT NULL,
    booking_id UUID NOT NULL,
    user_id UUID NOT NULL,
    receipt_number VARCHAR(50) NOT NULL UNIQUE,
    total_amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    payment_breakdown JSONB NOT NULL,
    payment_method JSONB NOT NULL,
    issued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    receipt_url TEXT,
    
    CONSTRAINT fk_payment_receipt_intent FOREIGN KEY (payment_intent_id) REFERENCES payment_intents(id) ON DELETE CASCADE,
    CONSTRAINT fk_payment_receipt_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    CONSTRAINT fk_payment_receipt_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT chk_payment_receipt_amount CHECK (total_amount >= 0)
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_payment_intents_booking_id ON payment_intents(booking_id);
CREATE INDEX IF NOT EXISTS idx_payment_intents_user_id ON payment_intents(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_intents_status ON payment_intents(status);
CREATE INDEX IF NOT EXISTS idx_payment_intents_created_at ON payment_intents(created_at);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_intent_id ON payment_transactions(payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_booking_id ON payment_transactions(booking_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id ON payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_type ON payment_transactions(type);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_created_at ON payment_transactions(created_at);

CREATE INDEX IF NOT EXISTS idx_payment_receipts_booking_id ON payment_receipts(booking_id);
CREATE INDEX IF NOT EXISTS idx_payment_receipts_user_id ON payment_receipts(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_receipts_receipt_number ON payment_receipts(receipt_number);
CREATE INDEX IF NOT EXISTS idx_payment_receipts_issued_at ON payment_receipts(issued_at);

-- Add payment-related columns to bookings table if they don't exist
DO $$ 
BEGIN
    -- Add payment_status column to bookings table
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'bookings' AND column_name = 'payment_status') THEN
        ALTER TABLE bookings ADD COLUMN payment_status VARCHAR(50) DEFAULT 'pending';
        ALTER TABLE bookings ADD CONSTRAINT chk_booking_payment_status 
            CHECK (payment_status IN ('pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled'));
    END IF;
    
    -- Add payment_intent_id column to bookings table
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'bookings' AND column_name = 'payment_intent_id') THEN
        ALTER TABLE bookings ADD COLUMN payment_intent_id VARCHAR(255);
        ALTER TABLE bookings ADD CONSTRAINT fk_booking_payment_intent 
            FOREIGN KEY (payment_intent_id) REFERENCES payment_intents(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Create indexes for new booking columns
CREATE INDEX IF NOT EXISTS idx_bookings_payment_status ON bookings(payment_status);
CREATE INDEX IF NOT EXISTS idx_bookings_payment_intent_id ON bookings(payment_intent_id);

-- Insert sample payment data for testing (optional)
-- This would be removed in production
INSERT INTO payment_intents (
    id, booking_id, user_id, amount, currency, payment_method, status, created_at, updated_at
) VALUES (
    'pi_sample_123',
    (SELECT id FROM bookings LIMIT 1),
    (SELECT id FROM users LIMIT 1),
    299.99,
    'USD',
    '{"type": "credit_card", "provider": "stripe", "creditCard": {"last4": "4242", "brand": "visa"}}',
    'completed',
    NOW() - INTERVAL '1 day',
    NOW() - INTERVAL '1 day'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO payment_transactions (
    id, payment_intent_id, booking_id, user_id, amount, currency, type, status, provider, processed_at, created_at
) VALUES (
    'txn_sample_123',
    'pi_sample_123',
    (SELECT booking_id FROM payment_intents WHERE id = 'pi_sample_123'),
    (SELECT user_id FROM payment_intents WHERE id = 'pi_sample_123'),
    299.99,
    'USD',
    'charge',
    'completed',
    'stripe',
    NOW() - INTERVAL '1 day',
    NOW() - INTERVAL '1 day'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO payment_receipts (
    id, payment_intent_id, booking_id, user_id, receipt_number, total_amount, currency, 
    payment_breakdown, payment_method, issued_at
) VALUES (
    'rcpt_sample_123',
    'pi_sample_123',
    (SELECT booking_id FROM payment_intents WHERE id = 'pi_sample_123'),
    (SELECT user_id FROM payment_intents WHERE id = 'pi_sample_123'),
    'RCP-20241218-ABC123',
    299.99,
    'USD',
    '{"cashAmount": 299.99, "taxes": 25.50, "fees": 15.00}',
    '{"type": "credit_card", "provider": "stripe", "creditCard": {"last4": "4242", "brand": "visa"}}',
    NOW() - INTERVAL '1 day'
) ON CONFLICT (id) DO NOTHING;

-- Add comments for documentation
COMMENT ON TABLE payment_intents IS 'Stores payment intents for booking transactions';
COMMENT ON TABLE payment_transactions IS 'Records all payment transactions including charges and refunds';
COMMENT ON TABLE payment_receipts IS 'Stores generated payment receipts for completed transactions';

COMMENT ON COLUMN payment_intents.provider_intent_id IS 'External payment provider intent ID (e.g., Stripe payment intent ID)';
COMMENT ON COLUMN payment_transactions.points_transaction IS 'JSON object containing points transaction details for points-based payments';
COMMENT ON COLUMN payment_receipts.payment_breakdown IS 'JSON object containing detailed breakdown of payment amounts';
COMMENT ON COLUMN payment_receipts.receipt_number IS 'Human-readable receipt number for customer reference';