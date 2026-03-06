# Hacking Ilmomasiina

This document presents a few ways you might want to use Ilmomasiina outside our pre-packaged image.

## Embedding with state hooks and providers

To embed events on your own React frontend, you can import the `@tietokilta/ilmomasiina-client` package (available on npm).
This package contains:

- React hooks to fetch and manage state for the Events, SingleEvent and EditSignup routes.
- Provider components that do the fetch and provide the state in a context.
- Locale strings in Finnish and English for all UI needed for those routes.
- Utility functions for formatting API objects, such as flattening and sorting signups.

## API models

You can also implement a fully custom API client by only importing the API models from `@tietokilta/ilmomasiina-models`
(also available on npm).

## App customization

**If you only wish to change colors and texts,** you might want to avoid forking our repo. Instead, write a
GitHub Action that clones this repo (as a submodule or directly), replaces `_definitions.scss` through a modified
`Dockerfile`, and builds your own Docker image. This makes your update process trivial when this repo is updated.

If you fork the repository and don't modify `ilmomasiina-models`,
your modified backend or frontend should be compatible with the current unmodified versions.
Don't forget to submit a PR if your code might be useful to others!
