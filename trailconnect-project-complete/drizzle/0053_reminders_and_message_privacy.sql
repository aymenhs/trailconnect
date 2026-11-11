-- Departure reminders were never sent: `prepareEventReminder` had no caller and
-- the only channels were email and push, neither of which exists yet. The
-- outing maintenance task now sends them in the app and records each one here
-- so it goes out once.
ALTER TABLE `eventReminders` MODIFY COLUMN `channel` enum('email','push','in_app') NOT NULL;
--> statement-breakpoint
-- Law 25 (s. 9.1): direct messages now default to friends and outing
-- companions, as profiles default to private. Existing rows keep their value.
ALTER TABLE `userMessagingPreferences` ALTER COLUMN `directMessagePolicy` SET DEFAULT 'friends';
