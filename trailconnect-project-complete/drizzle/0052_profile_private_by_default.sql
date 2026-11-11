-- Law 25 (s. 9.1) requires the most protective privacy setting by default.
-- New profiles now start private. Existing profiles keep their current value:
-- changing a member's visibility behind their back is not this migration's call.
ALTER TABLE `userProfiles` ALTER COLUMN `profileVisibility` SET DEFAULT 'private';
