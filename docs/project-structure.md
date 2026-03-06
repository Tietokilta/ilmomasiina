# Project structure

## Package management

The project uses [pnpm](https://pnpm.io/) to manage the code in separate packages. This allows for cleaner code
and package files.

To prepare for development, pnpm must bootstrap the cross-dependencies between projects. To do this, install pnpm and
then simply run `pnpm install` or `npm run bootstrap`.

## Package dependencies

The package dependencies are slighly complicated to manage properly, so that all tooling understands them:

- Each `package.json` refers to the packages it depends on, with version `workspace:*`. pnpm then symlinks the packages
  into `node_modules`.
- All files are imported from `@tietokilta/ilmomasiina-foo` or `@tietokilta/ilmomasiina-foo/dist`, just as they would
  in external code that depends on Ilmomasiina.
- Each importable `package.json` specifies `exports`, including a root export and potentially other files in `./dist`.
    - These main exports point to the compiled `.js` and `.d.ts` files under `./dist`.
    - `./src` is also exported and points to `.ts` files for TypeScript compilation.
- `references` in each `tsconfig.json` points to other `tsconfig`s.
    - This allows us to import files from other packages as if they were already compiled, and the TypeScript compiler
      will automatically compile them on demand, even if the target `dist` doesn't exist already.
    - This also requires using `tsc --build` for both type checking and building.
- `ts-node` (and by extension `ts-node-dev`), which we use for the backend, doesn't understand `references`.
  Therefore, the cross-package imports are also defined in `paths` in `tsconfig.json`, which `ts-node` _does_ understand.
- Vite (used for frontend builds) also doesn't understand `references`, so we use `paths` again, along with the
  `vite-tsconfig-paths` plugin.

To avoid mysterious errors from TypeScript compiler instances running simultaneously on the same folder, the root
project's `package.json` specifies `--workspace-concurrency=1` to prevent pnpm from running those tasks in parallel.

## Packages

The project is divided into four packages. Source folders are listed under each, roughly in order of importance.

- `ilmomasiina-models` contains the single source of truth for the API data model:
    - `src/schema`: TypeBox OpenAPI schema for the API layer.
- `ilmomasiina-backend` contains the backend code and depends on `ilmomasiina-models`.
    - `src/config.ts`: Config loading and validation. All environment variable access goes through here.
    - `src/models`: Sequelize models implementing the interfaces from `ilmomasiina-models`.
    - `src/models/attrs.ts`: Defines the attribute names picked from the DB, passed to Sequelize `attributes`.
    - `src/routes`: API route implementations. Most code goes here.
    - `src/cron`: Functions that run periodical maintenance tasks.
    - `src/locales`: Locale files for things like email subjects.
    - `src/mail`: Code for formatting and sending emails.
    - `emails`: Pug templates and CSS for email templates.
    - `test`: Backend test code.
- `ilmomasiina-client` contains reusable client code for the user-facing parts of the frontend.
    - `src/modules`: API access and minimal state logic for each route provided by this package.
      See [state-context.md](./state-context.md) for more on what these files contain.
    - `src/locales`: Locale files for the routes.
- `ilmomasiina-frontend` contains the frontend code and Vite config for building and developing it.
  It also depends on `ilmomasiina-models` and `ilmomasiina-client` but not `ilmomasiina-backend`.
    - `src/modules`: Redux reducers for each route.
    - `src/routes`: React implementations for each route.
    - `src/locales`: Locale files for the app.
    - `src/styles`: Styles for the app.
    - `src/containers`: Router for the app.
    - `src/components`: Some reusable components shared between routes.
    - `src/store`: Redux store.
    - `src/branding.ts`: Definitions for some configurable branding strings.
    - `src/paths.tsx`: Definitions for the router paths.
- In addition, the root folder has a `package.json`, which is used for ESLint and other development dependencies
  that are shared between the packages. That package contains no code.

### Source of truth for models

The source of truth for *database models* is `ilmomasiina-backend/src/models`. Each of the files therein contains
multiple copies of the attributes:

- A `FooAttributes` interface to act as the source of truth.
- A `FooCreationAttributes` interface with auto-generatable attributes `Omit`ted.
- A Sequelize model class with attributes redeclared as `public attribute!: type;` to implement the interface.
- A `setupFooModel` function that calls `Model.init(...)`.
- Errors *ARE NOT* raised by TS if extra attributes are defined in the class body, or if the attribute *types* in
  `Model.init` do not match those in `FooAttributes`. These must be kept in sync manually.
- Errors *are* raised if attributes in `FooAttributes` are missing from the class body, or if the attributes in
  `Model.init` do not match the *names* in `FooAttributes`.

The source of truth for *API models* is in `ilmomasiina-models/src/schema`, which contains TypeBox schemas (and
corresponding `Static<>` TypeScript types) that define requests and responses.

- These schemas are used both by the backend to validate requests and format responses, and by the frontend
  to define types for API responses.
- The backend uses the `return foo as unknown as StringifyApi<typeof foo>` pattern to type-check that the returned
  type from endpoints matches the schema when Dates are replaced by strings. (Other non-JSONable types are not used.)

## Technologies and design choices

Many of the libraries listed below were inherited from the Athene version of the code and might be subject to change,
if it benefits the project.

- [TypeScript](https://www.typescriptlang.org/) everywhere
- [pnpm](https://pnpm.io/) to manage the multiple packages
- [Lodash](https://lodash.com/) used where necessary, but preferring native methods

### Models

- [TypeBox](https://github.com/sinclairzx81/typebox) to create JSON Schema with TS typings

### Backend

- [Sequelize](https://sequelize.org/master/) as ORM
- [Fastify](https://www.fastify.io/) as REST backend
- [Nodemailer](https://nodemailer.com/about/) to send emails

### Frontend

The frontend is built with [Vite](https://vitejs.dev/).

Libraries:

- [React v19](https://reactjs.org/) with mostly functional components
- [Bootstrap v5](https://getbootstrap.com/docs/5.3/getting-started/introduction/) and
  [React-Bootstrap v3](https://react-bootstrap.netlify.app/) for UI components
- [SCSS](https://sass-lang.com/)
- [Zustand](https://zustand.docs.pmnd.rs/)
    - Some state is handled locally, if there's no need to share it between components
- [React Router](https://reactrouter.com/)
- [i18next](https://www.i18next.com/) for internationalization
- [Formik](https://formik.org/)

## Frontend serving

The project is configured to run development servers for the frontend and backend with `npm start`. In development,
Vite proxies API calls to the backend server.

In production, the backend server can optionally serve the compiled frontend bundle, but ideally a separate reverse
proxy such as Nginx or e.g. an Azure Static Website is used for this purpose.
