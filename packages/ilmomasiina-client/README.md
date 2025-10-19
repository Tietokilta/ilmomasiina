# `ilmomasiina-client`

This package provides ready-to-use building blocks for [Ilmomasiina](https://github.com/Tietokilta/ilmomasiina)
frontends.

Frontend developers should import the supported items directly from `@tietokilta/ilmomasiina-client`. Most files
in `dist` are not part of the public interface. (The files in `dist/utils` are also public, but likely less stable.)

**Note:** Currently, importing the main entry point requires client-side React. You may want to import files from `dist`
directly if working with SSR.

**Note:** This package follows the versioning of Ilmomasiina. We will avoid breaking changes in the API, but minor
versions may occasionally be incompatible with each other. If writing custom frontends, we recommend fixing the
minor version (`"@tietokilta/ilmomasiina-client": "~2.x.x"` in `package.json`).

## Functionality

This package exports functions for three routes: `Events`, `SingleEvent`, and `EditSignup`.

For each of the views, the package exports the `use{ViewName}Context` hook, the `{ViewName}Provider` component, and
the `use{ViewName}State` hook. For more context on these, see
[docs/state-context.md](https://github.com/Tietokilta/ilmomasiina/blob/dev/docs/state-context.md).
