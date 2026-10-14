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

> [!IMPORTANT]
> **If you only wish to change colors, images and texts, do not fork our repo!** Starting with Ilmomasiina 3.0,
> these are all customizable on the Settings page of the admin UI. The `BRANDING_*` variables are
> only used as defaults by the backend and have no effect once imported to the database on first run.

Ilmomasiina is open source, and you can of course customize anything you want by forking the repository
and building your own version.

If you fork the repository and don't modify `ilmomasiina-models`,
your modified backend or frontend should be compatible with the current unmodified versions.

> [!NOTE]
> If you fix bugs or add functionality, it would be *very* appreciated to
> create a pull request to the Tietokilta repository so we can potentially integrate them
> in our version. That also reduces your maintenance work when upgrading.

## Building Docker images

### GitHub Actions

The easiest way to build and host your Docker image is using GitHub Actions. Your public repos
have free Actions time. The repository contains a workflow called
[`docker-build.yml`](../.github/workflows//docker-build.yml) that can easily be customized with
variables to build and push an image for your organization.

Simply [enable GitHub Actions](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-github-actions-settings-for-a-repository#managing-github-actions-permissions-for-your-repository)
for your fork and modify `docker-build.yml` as instructed in comments:

- Update `env` block as necessary.
- Change the repository names in `jobs.docker.if` to ensure the workflow runs;
  it's automatically disabled on forks to avoid unnecessary errors.
- Change other conditions in `on` and `jobs.docker.if` if you want to build on branch pushes
  or a different tag pattern. The `docker` is otherwise set up for either approach.

### Local Docker build

You can of course also build images locally.

Variables in `.env.example` can be passed as build args, though don't include secrets there.
Anything that *requires frontend rebuild* needs to be passed as a build arg and won't work as a normal env variable.

```
docker build \
  --build-arg PATH_PREFIX='/ilmo' \
  -t ilmomasiina .
```

You can then use `docker push` to a host of your choice, or run the container locally.
