-- Migration script to add reminder_reason column to reminders table
-- Run this script to update existing database

USE plant_health_db;

-- Add reminder_reason column to reminders table
ALTER TABLE reminders 
ADD COLUMN reminder_reason TEXT AFTER message;

-- Update existing reminders with default reason
UPDATE reminders 
SET reminder_reason = CASE 
    WHEN reminder_type = 'watering' THEN '定期浇水可保持土壤湿度，促进植株健康生长。'
    WHEN reminder_type = 're_examination' THEN '需要再次检查植物健康状况，确认问题是否得到解决。'
    ELSE '请关注植物状况。'
END
WHERE reminder_reason IS NULL;

SELECT 'Migration completed successfully!' AS status;
