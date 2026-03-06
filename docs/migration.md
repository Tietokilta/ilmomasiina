# Migration

This file documents:

- The migration from MySQL/MariaDB to PostgreSQL for Ilmomasiina v3+
- The migration from Athene's Ilmomasiina to Ilmomasiina v2+

## Migration from MySQL/MariaDB to PostgreSQL

TODO. A tool of some kind will be provided.

## Migration from Athene's Ilmomasiina

If you're still using Athene's Ilmomasiina version, you'll need to run some manual migrations steps before
Ilmomasiina's built-in migrations can take over.

The below SQL script is written for MySQL/MariaDB. If you use PostgreSQL, ask your favorite AI to convert it over.

After running the script, start the latest version of Ilmomasiina v2.x to run the built-in migrations.

**Please make full backups of your data before proceeding with this migration.**

```sql
-- add slug support

ALTER TABLE `event`
ADD `slug` VARCHAR(255) NOT NULL AFTER `title`;
UPDATE `event`
SET `slug` = CONVERT(`id`, CHAR);
ALTER TABLE `event`
ADD CONSTRAINT UNIQUE (`slug`);

-- change ids to randomized strings

ALTER TABLE `question`
DROP CONSTRAINT `question_ibfk_1`;
ALTER TABLE `quota`
DROP CONSTRAINT `quota_ibfk_1`;
ALTER TABLE `signup`
DROP CONSTRAINT `signup_ibfk_1`;
ALTER TABLE `answer`
DROP CONSTRAINT `answer_ibfk_1`,
DROP CONSTRAINT `answer_ibfk_2`;

ALTER TABLE `event`
MODIFY `id` CHAR(12) NOT NULL;
ALTER TABLE `question`
MODIFY `id` CHAR(12) NOT NULL,
MODIFY `eventId` CHAR(12) NOT NULL;
ALTER TABLE `quota`
MODIFY `id` CHAR(12) NOT NULL,
MODIFY `eventId` CHAR(12) NOT NULL;
ALTER TABLE `signup`
MODIFY `id` CHAR(12) NOT NULL,
MODIFY `quotaId` CHAR(12) NOT NULL;
ALTER TABLE `answer`
MODIFY `signupId` CHAR(12) NOT NULL,
MODIFY `questionId` CHAR(12) NOT NULL;

ALTER TABLE `question`
ADD FOREIGN KEY `question_ibfk_1` (`eventId`) REFERENCES `event` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `quota`
ADD FOREIGN KEY `quota_ibfk_1` (`eventId`) REFERENCES `event` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `signup`
ADD FOREIGN KEY `signup_ibfk_1` (`quotaId`) REFERENCES `quota` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `answer`
ADD FOREIGN KEY `answer_ibfk_1` (`signupId`) REFERENCES `signup` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
ADD FOREIGN KEY `answer_ibfk_2` (`questionId`) REFERENCES `question` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- add reordering support to questions and quotas

ALTER TABLE `question`
ADD `order` INTEGER NOT NULL AFTER `eventId`;
ALTER TABLE `quota`
ADD `order` INTEGER NOT NULL AFTER `eventId`;

-- add listed attribute

ALTER TABLE `event`
ADD `listed` BOOLEAN NOT NULL DEFAULT 1 AFTER `draft`;

-- store status and position in signups

ALTER TABLE `signup`
ADD `status` ENUM('in-quota', 'in-open', 'in-queue') DEFAULT NULL AFTER `confirmedAt`,
ADD `position` INTEGER DEFAULT NULL AFTER `status`;

-- allow events without signup and vice versa

ALTER TABLE `event`
MODIFY `date` DATETIME DEFAULT NULL,
MODIFY `registrationStartDate` DATETIME DEFAULT NULL,
MODIFY `registrationEndDate` DATETIME DEFAULT NULL;

-- add event categories

ALTER TABLE `event`
ADD `category` VARCHAR(255) NOT NULL DEFAULT '' AFTER `webpageUrl`;

-- make names optional in signups

ALTER TABLE `event`
ADD `nameQuestion` BOOLEAN NOT NULL DEFAULT 1 AFTER `signupsPublic`,
ADD `emailQuestion` BOOLEAN NOT NULL DEFAULT 1 AFTER `signupsPublic`;

-- allow hiding names in signups

ALTER TABLE `signup`
ADD `namePublic` BOOLEAN NOT NULL DEFAULT 0 AFTER `lastName`;
-- keep names public in previously existing signups
UPDATE `signup`
SET `namePublic` = 1;

-- ensure unlimited quotas are stored as size=NULL instead of size=0

UPDATE `quota`
SET `size` = NULL WHERE `size` = 0;

```
