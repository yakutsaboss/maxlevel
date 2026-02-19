-- Run 77: Admin Notifications Center
-- Execute on server:
--   PGPASSWORD=postgres psql -h localhost -U postgres -d telegram_rpg -f /opt/wibecode-bot/database/migrations/run77_admin_notifications.sql

BEGIN;

-- ============================================================
-- 1. Create admin_notifications table
-- ============================================================

CREATE TABLE IF NOT EXISTS admin_notifications (
    id SERIAL PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    title TEXT NOT NULL,
    message TEXT,
    related_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Constraint: type must be one of the known notification types
ALTER TABLE admin_notifications ADD CONSTRAINT admin_notifications_type_check
    CHECK (type IN ('new_registration', 'achievement_unlock', 'payment', 'system_alert', 'tier_change'));

-- ============================================================
-- 2. Indexes for common query patterns
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_admin_notifications_is_read ON admin_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_type ON admin_notifications(type);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_created_at ON admin_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_related_user ON admin_notifications(related_user_id);

COMMENT ON TABLE admin_notifications IS 'Admin notification center — tracks events like new registrations, achievements, payments, alerts';

COMMIT;
