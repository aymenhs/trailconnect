-- `openId` was Manus's name for "identity at the OAuth provider". It read as
-- the OpenID Connect protocol, which it never was — even before the Google
-- migration. Renamed to `externalId` to remove that ambiguity.
--
-- RENAME COLUMN preserves the data and the unique constraint's values; a
-- generated DROP+ADD would have discarded every existing identity.
ALTER TABLE `users` RENAME COLUMN `openId` TO `externalId`;
ALTER TABLE `users` RENAME INDEX `users_openId_unique` TO `users_externalId_unique`;
