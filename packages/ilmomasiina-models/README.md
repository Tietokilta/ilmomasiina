# `ilmomasiina-models`

This package provides type definitions for the [Ilmomasiina](https://github.com/Tietokilta/ilmomasiina) API.

Frontend developers should import the supported types directly from `@tietokilta/ilmomasiina-models`. The files in
`dist` are not part of the public interface and are only to be used by the backend.

**Note:** This package follows the versioning of Ilmomasiina. We will avoid breaking changes in the API, but minor
versions may occasionally be incompatible with each other. If writing custom frontends, we recommend fixing the
minor version (`"@tietokilta/ilmomasiina-models": "~2.x.x"` in `package.json`).

## Package contents

- `src/enum.ts`: Enums used in the API and database.
- `src/schema`: Type definitions for the API.
- `src/models`: Definitions Sequelize model attributes. These do not exactly match their API equivalents.
- `src/attrs`: Names of SQL columns to fetch for events in different situations. May be removed.
