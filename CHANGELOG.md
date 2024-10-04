# Changelog

## 2.0.0-alpha34

- **BREAKING:** Add logo to Header - make sure to change or disable it on your instance
- **BREAKING:** Add dark mode variants of favicons - make sure to update yours
- The remaining time to confirm or edit a signup is now shown on the signup form
- Signups can now be edited for `SIGNUP_CONFIRM_MINS` minutes after creation, even if created just before an event's
  signup closes, if configured with `SIGNUP_CONFIRM_AFTER_CLOSE` (recommended).
- The confirmation time limit for signups is now configurable via `SIGNUP_CONFIRM_MINS`
- Add shorter header text option for mobile, configurable via `BRANDING_HEADER_TITLE_TEXT_SHORT`

## 2.0.0-alpha33

- Fixed radio/checkbox field layout when answers are invalid

## 2.0.0-alpha32

- Editor fields no longer incorrectly cause errors when cleared
- Underlines on links are now only used in select places when enabled

## 2.0.0-alpha31

- **Feature:** The event editor now gives per-field validation feedback and limits e.g. field lengths
- **Feature:** Events can now be previewed from the event editor
- **Feature:** Past events are now shown in a separate list for admins
- **Feature:** The event editor now allows setting a price for events (only a string, no special handling)
- Links are now easier to see with dark theme colors
- Signup start/end time and signup publicity are now part of "basic details" in the event editor
- The signup closure date is now shown in various places after signup closes
- Quota name is no longer shown in signup lists when there's only one quota
- Quota size fields now have placeholders to indicate what empty means
- TypeBox schemas now use Composite instead of Intersect for cleaner schemas

## 2.0.0-alpha30

- **BREAKING:** Changed default brand colors in email templates

## 2.0.0-alpha29

- **Feature:** Added user-friendly validation of signup fields
- **Feature:** Admin tokens now renew automatically, significantly reducing expired session errors

## 2.0.0-alpha28

- **Feature:** Queue positions are now shown in signup confirmation emails

## 2.0.0-alpha27

- Fixed a bug in external integrations

## 2.0.0-alpha26

- Improved integration options for external sites
- Removed Moment.js from the frontend
- Formatted source code with Prettier

## 2.0.0-alpha25

- Fixed a bug where deleted events would still keep their slugs reserved

## 2.0.0-alpha24

- Fixed a bug that broke events when questions were created with options

## 2.0.0-alpha23

- Fixed open quota size field

## 2.0.0-alpha22

- Fixed a CI bug

## 2.0.0-alpha21

- Fixed unlimited size quotas not working

## 2.0.0-alpha20

- Fixed a CI bug

## 2.0.0-alpha19

- Fixed a bug where signups couldn't be saved without an email field

## 2.0.0-alpha18

- **BREAKING:** Changed default brand colors in frontend & components
- Significant performance optimizations
- Multiple bug fixes
- Dependency upgrades, code quality and development improvements

## 2.0.0-alpha17 (changes since Athene's version)

**Visible features**:

- Interface is fully localized in Finnish and English
- Events can be created without a signup, and signups can be created with no event date
- Event descriptions support Markdown
- Name and email questions can be removed
- Users can choose whether their signup name is shown publicly
- Signups can be viewed even after editing closes
- Editable event slugs (instead of numeric IDs) in all user-visible URLs
- Unlisted events (hidden from event list, but can be signed up to)
- Admins can change their password and reset others' passwords
- iCalendar export of event list (can be imported to e.g. Google Calendar)
- Events have a category (can be filtered via API)
- Quotas and questions can be reordered after creating an event
- Admins are warned when changes to an event affect people already signed up
- Installation experience is documented and smoother than previously

**Major technical changes:**

- Entire project ported to TypeScript
- Frontend and backend split to multiple packages
- Backend ported to Fastify
- Frontend built using Vite
- NPM packages created for custom frontends/clients
- Project builds as Docker container automatically
- Dotenv support
- Significantly expanded documentation

**Other changes and fixes:**

- Error messages are actually useful
- "You got a spot from the queue" emails work consistently
- Refreshing/navigating away from a new signup or typoing the email address no longer make the signup unreachable
- Question options can contain semicolons
- Editor performance improved
- More thorough and configurable anonymization of old signups
- Sequential database IDs are no longer visible to users
- Deleted items are not stuck in the database forever
- Signup state (quota/queue and position) is more consistent
- Security vulnerabilities fixed
- Numerous other bug fixes and improvements
