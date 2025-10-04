-- Create Comprehensive Notification System
-- Supports admin-to-user messaging, system notifications, and user interaction

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Content
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'info', -- 'info', 'success', 'warning', 'error', 'announcement'
    
    -- Targeting
    recipient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- NULL for system messages
    
    -- Metadata
    is_read BOOLEAN DEFAULT FALSE,
    is_pinned BOOLEAN DEFAULT FALSE,
    priority VARCHAR(20) DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
    
    -- Related data
    related_type VARCHAR(50), -- 'registration', 'program', 'payment', etc.
    related_id UUID, -- ID of related entity
    action_url TEXT, -- Optional URL for action button
    action_label VARCHAR(100), -- Label for action button
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE, -- Optional expiration
    
    -- Admin features
    is_broadcast BOOLEAN DEFAULT FALSE, -- True if sent to all users
    broadcast_role VARCHAR(50), -- Send to specific role (student, admin)
    
    -- Metadata
    metadata JSONB DEFAULT '{}' -- For extensibility
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(recipient_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_pinned ON notifications(recipient_id, is_pinned, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_broadcast ON notifications(is_broadcast, broadcast_role);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own notifications
CREATE POLICY "Users can view their notifications" ON notifications
    FOR SELECT USING (
        auth.uid() = recipient_id OR
        (is_broadcast = TRUE AND (
            broadcast_role IS NULL OR 
            broadcast_role = (SELECT role FROM profiles WHERE id = auth.uid())
        ))
    );

-- Users can update their own notifications (mark as read, pin, etc.)
CREATE POLICY "Users can update their notifications" ON notifications
    FOR UPDATE USING (auth.uid() = recipient_id)
    WITH CHECK (auth.uid() = recipient_id);

-- Admins can do everything
CREATE POLICY "Admins can manage all notifications" ON notifications
    FOR ALL USING (
        auth.uid() IN (
            SELECT id FROM profiles WHERE role = 'admin'
        )
    );

-- Create notification templates table for admin efficiency
CREATE TABLE IF NOT EXISTS notification_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'info',
    priority VARCHAR(20) DEFAULT 'normal',
    action_label VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Metadata for template variables
    variables JSONB DEFAULT '[]' -- Array of variable names like ["student_name", "program_title"]
);

-- Enable RLS for templates (admin only)
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can manage templates" ON notification_templates
    FOR ALL USING (
        auth.uid() IN (
            SELECT id FROM profiles WHERE role = 'admin'
        )
    );

-- Create view for user notification summary
CREATE OR REPLACE VIEW user_notification_summary AS
SELECT 
    recipient_id as user_id,
    COUNT(*) as total_notifications,
    COUNT(*) FILTER (WHERE is_read = FALSE) as unread_count,
    COUNT(*) FILTER (WHERE is_pinned = TRUE) as pinned_count,
    COUNT(*) FILTER (WHERE priority = 'urgent') as urgent_count,
    MAX(created_at) as latest_notification
FROM notifications
WHERE (expires_at IS NULL OR expires_at > NOW())
GROUP BY recipient_id;

GRANT SELECT ON user_notification_summary TO authenticated;

-- Function to send notification to user
CREATE OR REPLACE FUNCTION send_notification(
    p_recipient_id UUID,
    p_title VARCHAR(255),
    p_message TEXT,
    p_type VARCHAR(50) DEFAULT 'info',
    p_priority VARCHAR(20) DEFAULT 'normal',
    p_sender_id UUID DEFAULT NULL,
    p_action_url TEXT DEFAULT NULL,
    p_action_label VARCHAR(100) DEFAULT NULL,
    p_related_type VARCHAR(50) DEFAULT NULL,
    p_related_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    notification_id UUID;
BEGIN
    INSERT INTO notifications (
        recipient_id, title, message, type, priority, sender_id,
        action_url, action_label, related_type, related_id
    ) VALUES (
        p_recipient_id, p_title, p_message, p_type, p_priority, p_sender_id,
        p_action_url, p_action_label, p_related_type, p_related_id
    ) RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to send broadcast notification
CREATE OR REPLACE FUNCTION send_broadcast_notification(
    p_title VARCHAR(255),
    p_message TEXT,
    p_type VARCHAR(50) DEFAULT 'announcement',
    p_priority VARCHAR(20) DEFAULT 'normal',
    p_sender_id UUID DEFAULT NULL,
    p_broadcast_role VARCHAR(50) DEFAULT NULL,
    p_action_url TEXT DEFAULT NULL,
    p_action_label VARCHAR(100) DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    notification_id UUID;
    user_record RECORD;
BEGIN
    -- Create broadcast notification
    INSERT INTO notifications (
        title, message, type, priority, sender_id, is_broadcast, 
        broadcast_role, action_url, action_label
    ) VALUES (
        p_title, p_message, p_type, p_priority, p_sender_id, TRUE,
        p_broadcast_role, p_action_url, p_action_label
    ) RETURNING id INTO notification_id;
    
    -- Also create individual notifications for each targeted user
    FOR user_record IN 
        SELECT id FROM profiles 
        WHERE p_broadcast_role IS NULL OR role = p_broadcast_role
    LOOP
        INSERT INTO notifications (
            recipient_id, title, message, type, priority, sender_id,
            action_url, action_label
        ) VALUES (
            user_record.id, p_title, p_message, p_type, p_priority, p_sender_id,
            p_action_url, p_action_label
        );
    END LOOP;
    
    RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(notification_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE notifications 
    SET is_read = TRUE, read_at = NOW()
    WHERE id = notification_id 
    AND recipient_id = auth.uid()
    AND is_read = FALSE;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark all notifications as read for a user
CREATE OR REPLACE FUNCTION mark_all_notifications_read()
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE notifications 
    SET is_read = TRUE, read_at = NOW()
    WHERE recipient_id = auth.uid() 
    AND is_read = FALSE;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to pin/unpin notification
CREATE OR REPLACE FUNCTION toggle_notification_pin(notification_id UUID, pin_status BOOLEAN)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE notifications 
    SET is_pinned = pin_status
    WHERE id = notification_id 
    AND recipient_id = auth.uid();
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup old notifications
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete notifications older than 6 months that are read and not pinned
    DELETE FROM notifications 
    WHERE created_at < NOW() - INTERVAL '6 months'
    AND is_read = TRUE 
    AND is_pinned = FALSE
    AND (expires_at IS NULL OR expires_at < NOW());
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION send_notification TO authenticated;
GRANT EXECUTE ON FUNCTION send_broadcast_notification TO authenticated;
GRANT EXECUTE ON FUNCTION mark_notification_read TO authenticated;
GRANT EXECUTE ON FUNCTION mark_all_notifications_read TO authenticated;
GRANT EXECUTE ON FUNCTION toggle_notification_pin TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_notifications TO authenticated;

-- Create some default notification templates
INSERT INTO notification_templates (name, title, message, type, priority, action_label, variables) VALUES
('welcome_student', 'Welcome to {{program_title}}!', 
 'Hello {{student_name}}, welcome to our learning program! We''re excited to have you join us. Your learning journey begins now.', 
 'success', 'normal', 'View Dashboard', '["student_name", "program_title"]'),

('registration_approved', 'Registration Approved ✅', 
 'Great news {{student_name}}! Your registration for {{program_title}} has been approved. You can now access your course materials and schedule.',
 'success', 'high', 'Access Course', '["student_name", "program_title"]'),

('payment_reminder', 'Payment Reminder', 
 'Dear {{student_name}}, this is a friendly reminder that your payment for {{program_title}} is due. Please complete your payment to continue accessing the course.',
 'warning', 'high', 'Pay Now', '["student_name", "program_title"]'),

('course_starting', 'Course Starting Soon!', 
 'Hello {{student_name}}, your course {{program_title}} will begin on {{start_date}}. Please ensure you have all necessary materials ready.',
 'info', 'normal', 'Prepare', '["student_name", "program_title", "start_date"]'),

('assignment_due', 'Assignment Due Reminder', 
 'Hi {{student_name}}, you have an assignment due for {{program_title}}. Deadline: {{due_date}}. Don''t forget to submit!',
 'warning', 'normal', 'Submit Assignment', '["student_name", "program_title", "due_date"]');

-- Create trigger to auto-update notification counts (for real-time updates)
CREATE OR REPLACE FUNCTION notify_notification_change()
RETURNS TRIGGER AS $$
BEGIN
    -- You can add real-time notification logic here
    -- For now, this is a placeholder for future real-time features
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_notification_change
    AFTER INSERT OR UPDATE OR DELETE ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION notify_notification_change();
