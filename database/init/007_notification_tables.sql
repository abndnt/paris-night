-- Notification preferences table
CREATE TABLE notification_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    email_notifications BOOLEAN DEFAULT true,
    push_notifications BOOLEAN DEFAULT true,
    deal_alerts BOOLEAN DEFAULT true,
    price_drop_alerts BOOLEAN DEFAULT true,
    booking_updates BOOLEAN DEFAULT true,
    system_notifications BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Email templates table
CREATE TABLE email_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    subject VARCHAR(255) NOT NULL,
    html_content TEXT NOT NULL,
    text_content TEXT,
    variables JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_notification_preferences_user_id ON notification_preferences(user_id);
CREATE INDEX idx_email_templates_name ON email_templates(name);

-- Apply updated_at trigger
CREATE TRIGGER update_notification_preferences_updated_at BEFORE UPDATE ON notification_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_templates_updated_at BEFORE UPDATE ON email_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default email templates
INSERT INTO email_templates (name, subject, html_content, text_content, variables) VALUES
('booking_confirmation', 'Booking Confirmation - {{confirmationCode}}', 
 '<h1>Booking Confirmed!</h1><p>Your flight booking has been confirmed.</p><p>Confirmation Code: <strong>{{confirmationCode}}</strong></p><p>Flight Details:</p><ul><li>From: {{origin}} to {{destination}}</li><li>Date: {{departureDate}}</li><li>Passengers: {{passengerCount}}</li></ul><p>Total Cost: {{totalCost}}</p>',
 'Booking Confirmed!\n\nYour flight booking has been confirmed.\nConfirmation Code: {{confirmationCode}}\n\nFlight Details:\n- From: {{origin}} to {{destination}}\n- Date: {{departureDate}}\n- Passengers: {{passengerCount}}\n\nTotal Cost: {{totalCost}}',
 '["confirmationCode", "origin", "destination", "departureDate", "passengerCount", "totalCost"]'::jsonb),

('deal_alert', 'Great Deal Alert - {{origin}} to {{destination}}',
 '<h1>Great Deal Found!</h1><p>We found a great deal for your saved search:</p><p><strong>{{origin}} → {{destination}}</strong></p><p>Price: <strong>{{price}}</strong></p><p>Date: {{departureDate}}</p><p><a href="{{bookingUrl}}">Book Now</a></p>',
 'Great Deal Found!\n\nWe found a great deal for your saved search:\n{{origin}} → {{destination}}\n\nPrice: {{price}}\nDate: {{departureDate}}\n\nBook Now: {{bookingUrl}}',
 '["origin", "destination", "price", "departureDate", "bookingUrl"]'::jsonb),

('payment_confirmation', 'Payment Confirmation - {{amount}}',
 '<h1>Payment Confirmed</h1><p>Your payment has been successfully processed.</p><p>Amount: <strong>{{amount}}</strong></p><p>Transaction ID: {{transactionId}}</p><p>Date: {{paymentDate}}</p>',
 'Payment Confirmed\n\nYour payment has been successfully processed.\nAmount: {{amount}}\nTransaction ID: {{transactionId}}\nDate: {{paymentDate}}',
 '["amount", "transactionId", "paymentDate"]'::jsonb);