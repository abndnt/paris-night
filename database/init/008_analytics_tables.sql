-- Analytics Tables for Admin Dashboard

-- User Activity Tracking
CREATE TABLE IF NOT EXISTS user_activity (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    activity_type VARCHAR(50) NOT NULL, -- 'login', 'search', 'booking', 'chat', etc.
    page_path VARCHAR(255),
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    session_id VARCHAR(100),
    duration_seconds INTEGER
);

-- Search Analytics
CREATE TABLE IF NOT EXISTS search_analytics (
    id SERIAL PRIMARY KEY,
    search_id UUID REFERENCES flight_searches(id),
    user_id UUID REFERENCES users(id),
    origin VARCHAR(5),
    destination VARCHAR(5),
    search_date DATE,
    cabin_class VARCHAR(20),
    flexible_dates BOOLEAN,
    results_count INTEGER,
    selected_result_id UUID,
    search_to_selection_seconds INTEGER,
    search_criteria JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Booking Analytics
CREATE TABLE IF NOT EXISTS booking_analytics (
    id SERIAL PRIMARY KEY,
    booking_id UUID REFERENCES bookings(id),
    user_id UUID REFERENCES users(id),
    search_id UUID REFERENCES flight_searches(id),
    booking_value DECIMAL(10, 2),
    points_used INTEGER,
    points_value DECIMAL(10, 2),
    payment_method VARCHAR(50),
    booking_completion_time INTEGER, -- seconds from start to finish
    abandoned_step VARCHAR(50), -- NULL if completed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- System Performance Metrics
CREATE TABLE IF NOT EXISTS performance_metrics (
    id SERIAL PRIMARY KEY,
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(12, 4) NOT NULL,
    metric_unit VARCHAR(20) NOT NULL,
    component VARCHAR(50) NOT NULL, -- 'api', 'database', 'search', 'llm', etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Error Logs for Analytics
CREATE TABLE IF NOT EXISTS error_analytics (
    id SERIAL PRIMARY KEY,
    error_type VARCHAR(100) NOT NULL,
    error_message TEXT,
    stack_trace TEXT,
    user_id UUID REFERENCES users(id),
    path VARCHAR(255),
    request_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved BOOLEAN DEFAULT FALSE,
    resolution_notes TEXT
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON user_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_activity_type ON user_activity(activity_type);
CREATE INDEX IF NOT EXISTS idx_user_activity_created_at ON user_activity(created_at);

CREATE INDEX IF NOT EXISTS idx_search_analytics_user_id ON search_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_search_analytics_created_at ON search_analytics(created_at);
CREATE INDEX IF NOT EXISTS idx_search_analytics_origin_dest ON search_analytics(origin, destination);

CREATE INDEX IF NOT EXISTS idx_booking_analytics_user_id ON booking_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_booking_analytics_created_at ON booking_analytics(created_at);

CREATE INDEX IF NOT EXISTS idx_performance_metrics_component ON performance_metrics(component);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_created_at ON performance_metrics(created_at);

CREATE INDEX IF NOT EXISTS idx_error_analytics_error_type ON error_analytics(error_type);
CREATE INDEX IF NOT EXISTS idx_error_analytics_created_at ON error_analytics(created_at);