# Changelog

## 3.0.0-dev

**TODO:**

- The backend no longer allows saving questions with duplicate or ambiguous options (TODO)
- Event end date is now required (TODO)
- Migration support for MySQL to PostgreSQL

**Breaking changes:**

- Removed support for MySQL databases; only PostgreSQL is supported from now on
- Added payment support via Stripe
  - Paid signups cannot be edited or deleted by users after payment, unless the price does not change
  - Custom frontends should be updated to support payments if enabled
  - New error codes and locale strings related to payments
- Removed support for the `EMAIL_BASE_URL` environment variable. Use `BASE_URL` and/or `FRONTENDS` instead.
- Removed support for the `MAIL_DEFAULT_LANG` environment variable. Use `DEFAULT_LANGUAGE` instead.
- Removed support for the `EVENT_DETAILS_URL`, `EDIT_SIGNUP_URL` and `ADMIN_URL`
  environment variables. Use the new `FRONTENDS` system instead.
- **ilmomasiina-models**: Removed database models (moved to `ilmomasiina-backend`).

**Features:**

- Proper support for multiple frontends
  - Events can now specify a preferred frontend, and emails will use the correct URLs
- **ilmomasiina-client:** Added payment support to EditSignup, including new state flags in context

**Bug fixes and improvements:**

- Added lots of backend tests
- Improved validation of signup answers
- Enabled hot reloading of locale files in development mode

## 2.1.0-beta.3

**Bug fixes and improvements:**

- Enabled code splitting for the frontend, halving the initial page load from its previous size

## 2.1.0-beta.2

**Bug fixes and improvements:**

- Upgraded backend dependencies to latest versions, including Node 24 and Fastify 5

## 2.1.0-beta.1

**Bug fixes and improvements:**

- Upgraded most frontend dependencies to modern versions, including React 19 and Bootstrap 5
- **ilmomasiina-client:** Now officially supports React 19

## 2.0.0

- **First stable release of Ilmomasiina 2.0!** The `dev` branch will be used for Ilmomasiina 3.0 in the
  near future, while backwards-compatible 2.x releases will be released from the `2.x` branch for some time.

## 2.0.0-rc.2

**Bug fixes and improvements:**

- Fixed answer options from non-default languages not being valid for signups
- Fixed answer options getting desynced between languages when changing question types
- The event editor no longer shows a non-functional "Create signup" button when there are no quotas

## 2.0.0-rc.1

**Breaking changes:**

- **API:** Improved event validation errors, some HTTP status codes changed

**Features:**

- Added a button to copy events

**Bug fixes and improvements:**

- Include event info in signup creation audit logs
- Fix event editor crashing for events with no language version in the app's default language

## 2.0.0-alpha46

**Bug fixes and improvements:**

- Avoid another error for older servers in `getLocalizedEvent`

## 2.0.0-alpha45

**Breaking changes:**

- **ilmomasiina-client:** Replaced `getLocalizedQuotaForEditSignup` with `getLocalizedSignup`

**Bug fixes and improvements:**

- Fix localization of current quota in signup editor
- Avoid errors for older servers in `getLocalizedEvent`

## 2.0.0-alpha44

**Features:**

- Also build ESM versions of public packages

## 2.0.0-alpha43

**Bug fixes and improvements:**

- Minor typing improvements

## 2.0.0-alpha42

**Breaking changes:**

- **Customization:** Restructuring moved all customization to the `@tietokilta/ilmomasiina-frontend` package.
- **ilmomasiina-components:** Replaced the `@tietokilta/ilmomasiina-components` package with
  `ilmomasiina-client`, which gets rid of shared React components and only provides API helpers, React hooks for state
  and API, and locale strings

**Features:**

- Added comprehensive multi-language support to events; API is backwards compatible and older clients will
  see the default language of events

**Bug fixes and improvements:**

- Localization fixes
- Updated dependencies
- Development environment improvements

## 2.0.0-alpha41

**Bug fixes and improvements:**

- Fix issue that caused failure in rendering the CreateEvent page

## 2.0.0-alpha40

**Bug fixes and improvements:**

- Fix issue that caused the backend to lock up on concurrent signups

## 2.0.0-alpha39

**Features:**

- Admins can now create and edit signups via the Signups tab
- Admins can now view signups grouped by quota
- Signup creation is now audit logged to mitigate spamming

**Bug fixes and improvements:**

- Quota information is now consistently hidden when signups are disabled for an event
- Minor layout and styling improvements to frontend

## 2.0.0-alpha38

**Bug fixes and improvements:**

- Fix answers sticking around when updating a signup

## 2.0.0-alpha37

**Breaking changes:**

- **API:** Past events are now accessed using the `maxAge` parameter instead of `since`

**Features:**

- The cutoff for old event viewing by regular users is now configurable via `HIDE_EVENT_AFTER_DAYS`
- Add API for admins to create and edit signups

**Bug fixes and improvements:**

- Further bug fixes to past events

## 2.0.0-alpha36

**Bug fixes and improvements:**

- Bug fixes to past events

## 2.0.0-alpha35

**Bug fixes and improvements:**

- Bug fixes to past events

## 2.0.0-alpha34

**Breaking changes:**

- **Customization:** Add logo to Header - make sure to change or disable it on your instance
- **Customization:** Add dark mode variants of favicons - make sure to update yours

**Features:**

- The remaining time to confirm or edit a signup is now shown on the signup form
- Signups can now be edited for `SIGNUP_CONFIRM_MINS` minutes after creation, even if created just before an event's
  signup closes, if configured with `SIGNUP_CONFIRM_AFTER_CLOSE` (recommended).
- The confirmation time limit for signups is now configurable via `SIGNUP_CONFIRM_MINS`
- Past events within the last 6 months can now be listed by regular users via the `since` parameter
- Add shorter header text option for mobile, configurable via `BRANDING_HEADER_TITLE_TEXT_SHORT`

## 2.0.0-alpha33

**Bug fixes and improvements:**

- Fixed radio/checkbox field layout when answers are invalid

## 2.0.0-alpha32

**Bug fixes and improvements:**

- Editor fields no longer incorrectly cause errors when cleared
- Underlines on links are now only used in select places when enabled

## 2.0.0-alpha31

**Features:**

- The event editor now gives per-field validation feedback and limits e.g. field lengths
- Events can now be previewed from the event editor
- Past events are now shown in a separate list for admins
- The event editor now allows setting a price for events (only a string, no special handling)
- The signup closure date is now shown in various places after signup closes

**Bug fixes and improvements:**

- Links are now easier to see with dark theme colors
- Signup start/end time and signup publicity are now part of "basic details" in the event editor
- Quota name is no longer shown in signup lists when there's only one quota
- Quota size fields now have placeholders to indicate what empty means
- TypeBox schemas now use Composite instead of Intersect for cleaner schemas

## 2.0.0-alpha30

**Breaking changes:**

- **Customization:** Changed default brand colors in email templates

## 2.0.0-alpha29

**Features:**

- Added user-friendly validation of signup fields
- Admin tokens now renew automatically, significantly reducing expired session errors

## 2.0.0-alpha28

**Features:**

- Queue positions are now shown in signup confirmation emails

## 2.0.0-alpha27

**Bug fixes and improvements:**

- Fixed a bug in external integrations

## 2.0.0-alpha26

**Bug fixes and improvements:**

- Improved integration options for external sites
- Removed Moment.js from the frontend
- Formatted source code with Prettier

## 2.0.0-alpha25

**Bug fixes and improvements:**

- Fixed a bug where deleted events would still keep their slugs reserved

## 2.0.0-alpha24

**Bug fixes and improvements:**

- Fixed a bug that broke events when questions were created with options

## 2.0.0-alpha23

**Bug fixes and improvements:**

- Fixed open quota size field

## 2.0.0-alpha22

**Bug fixes and improvements:**

- Fixed a CI bug

## 2.0.0-alpha21

**Bug fixes and improvements:**

- Fixed unlimited size quotas not working

## 2.0.0-alpha20

**Bug fixes and improvements:**

- Fixed a CI bug

## 2.0.0-alpha19

**Bug fixes and improvements:**

- Fixed a bug where signups couldn't be saved without an email field

## 2.0.0-alpha18

**Breaking changes:**

- **Customization:** Changed default brand colors in frontend & components

**Bug fixes and improvements:**

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
