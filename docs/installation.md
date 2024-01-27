# Installation

This file contains installation and customization instructions for Ilmomasiina,
both for [production](#production) and [development](#development).

## Customization

If you want to change any of the following, you'll need to modify the code slightly and
build your own Docker image (if using Docker):

- Hosting in a subfolder (instead of directly at `https://ilmo.your.domain/`)
- Colors ([`packages/ilmomasiina-components/src/styles/_definitions.scss`](../packages/ilmomasiina-components/src/styles/_definitions.scss))
- Header logo (TBD)
- Header title (build args or [`packages/ilmomasiina-frontend/src/branding.ts`](../packages/ilmomasiina-frontend/src/branding.ts))
- Footer links (as above)
- Favicon (`packages/ilmomasiina-frontend/public/*.png`)
- Translations (`packages/ilmomasiina-*/src/locales/*.json`)

You can of course make further UI changes, but that is not documented.

How build arguments are passed depends on your build method:
- [GitHub Actions](#github-actions): Workflow YAML file
- [Docker Compose](#docker-compose): Compose YAML file
- [Local Docker build](#local-docker-build): build command

**Note:** If you fix bugs or add functionality, it would be *very* appreciated to
create a pull request to the Tietokilta repository so we can potentially integrate them
in our version. That also reduces your maintenance work when upgrading.

### Building customized Docker images

#### GitHub Actions

The easiest way to build and host your Docker image is using GitHub Actions. Your public repos
have free Actions time. The repository contains a workflow called
[`docker-build.yml`](../.github/workflows//docker-build.yml) that can easily be customized with
variables to build and push an image for your organization.

Simply [enable GitHub Actions](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-github-actions-settings-for-a-repository#managing-github-actions-permissions-for-your-repository)
for your fork and modify the `env` block in `docker-build.yml` as instructed.
You'll also need to change the repository name in `jobs.docker.if` to ensure the workflow runs -
it's automatically disabled on forks to avoid unnecessary errors.

With the current workflow setup, the following trigger an image build:
- `prod` branch pushes tags `prod` and `latest`
- `staging` branch pushes tag `staging`
- tags starting with `v` push semver tags (`major.minor` and full version)

#### Local Docker build

You can of course also build images locally.

```
docker build \
  --build-arg BRANDING_HEADER_TITLE_TEXT='Ilmomasiina' \
  --build-arg BRANDING_FOOTER_GDPR_TEXT='Tietosuoja' \
  --build-arg BRANDING_FOOTER_GDPR_LINK='https://example.com' \
  --build-arg BRANDING_FOOTER_HOME_TEXT='Kotisivu' \
  --build-arg BRANDING_FOOTER_HOME_LINK='https://example.com' \
  --build-arg BRANDING_LOGIN_PLACEHOLDER_EMAIL='admin@example.com' \
  -t ilmomasiina .
```

You can then use `docker push` to a host of your choice, or run the container locally.

## Production

There are a few ways to run Ilmomasiina in production:

- [Docker as Azure Web App](#azure) (used by Tietokilta)
- [Docker without Azure](#docker-manual) (same setup, should work)
- [Docker Compose](#docker-compose) (currently untested)
- [Without Docker](#running-without-docker) (not recommended)

Other prerequisites:

- You'll need to bring your own [email service](#email-sending).
- When running outside Azure and without Docker Compose, you'll need a separate [database](#database-setup).
- When running outside Azure, you may also need to setup [reverse proxying](#reverse-proxy).

### Generating secrets

You'll need to generate at least two secrets for Ilmomasiina, `NEW_EDIT_TOKEN_SECRET` and `FEATHERS_AUTH_SECRET`.

These need to be **different** secure random strings with enough entropy. You can use a password generator and
generate passwords with at least 32 characters, or e.g. run `openssl rand -hex 32` to generate them.

### Database setup

You'll need a MySQL/MariaDB or PostgreSQL database, and a user with full privileges to the DB.
Instructions are provided here for [PostgreSQL in Docker](#postgresql-with-docker),
and both [MariaDB](#ubuntudebian-mariadb-installation) and [PostgreSQL](#ubuntudebian-postgresql-installation)
on Linux without Docker.

The app will automatically create the database schema upon startup.

#### PostgreSQL with Docker

Especially for development, running PostgreSQL with Docker may be the easiest option.

1. Create the data directory: `mkdir data`
2. Start a container for PostgreSQL. You can change the values for user/password/DB name; you'll need to put
   those in `.env` later.
    ```shell
    docker run -d \
      --name ilmo_postgres \
      -p 5432:5432 \
      -e POSTGRES_USER=ilmo_user \
      -e POSTGRES_PASSWORD=<add a password here> \
      -e POSTGRES_DB=ilmomasiina \
      -v ./data:/var/lib/postgresql/data \
      postgres
    ```
3. If you have the PostgreSQL client installed, try signing in: `psql -h localhost -U ilmo_user ilmomasiina`

#### Ubuntu/Debian MariaDB installation

If you intend to run your own database, you can follow these instructions to install one on a Ubuntu or Debian system.

1. Install MariaDB with `sudo apt install default-mysql-server`
2. MariaDB should start automatically. Run `sudo systemctl start mariadb` if necessary.
3. Open a MariaDB session with `sudo -u root mysql`.
4. Create the `ilmomasiina` database:
    ```sql
    CREATE DATABASE ilmomasiina;
    ```
5. Create a new user for Ilmomasiina:
    ```sql
    CREATE USER 'ilmo_user'@'localhost' IDENTIFIED BY '<add a password here>';
    ```
6. Grant permissions on the new database:
   ```sql
   GRANT ALL PRIVILEGES ON ilmomasiina.* TO 'ilmo_user'@'localhost';
   ```
7. Exit the MariaDB session with `exit`.
8. Try signing in with your new user: `mysql -u ilmo_user -p`
   (don't put your password in the command).

#### Ubuntu/Debian PostgreSQL installation

1. Install PostgreSQL with `sudo apt install postgresql`
2. PostgreSQL should start automatically. Run `sudo systemctl start postgresql` if necessary.
3. Open a PostgreSQL session with `sudo -u postgres psql`.
4. Create a new user for Ilmomasiina:
    ```sql
    CREATE USER ilmo_user WITH PASSWORD '<add a password here>';
    ```
5. Create the `ilmomasiina` database:
    ```sql
    CREATE DATABASE ilmomasiina WITH OWNER ilmo_user;
    ```
6. Exit the PostgreSQL session with `exit`.
7. Try signing in with your new user: `psql -h localhost -U ilmo_user ilmomasiina`.

### Email sending

Ilmomasiina needs a way to send emails, both for signup confirmation and user passwords.

Mailgun and SMTP providers are currently supported. With minor changes, sending mail could
be also done via Sendgrid or other services. Ilmomasiina uses Nodemailer - PRs welcome.

**Note:** If Ilmomasiina is run without an email provider configured, email contents will
be printed to the console instead. This can be used for debugging.

#### Mailgun

[Mailgun](https://www.mailgun.com/) is relatively cheap and can be enabled via env variables.

- `MAILGUN_API_KEY` = Mailgun API key (created under *Domain settings* &rarr; *Sending API keys*)
- `MAILGUN_DOMAIN` = Authorized sending domain in Mailgun
- `MAILGUN_HOST` = `api.eu.mailgun.net` or `api.mailgun.net` depending on region

#### SMTP

You can configure SMTP servers via env variables.

- `SMTP_HOST` = SMTP server
- `SMTP_PORT` = SMTP port, typically 25, 465 or 587
- `SMTP_USER` = SMTP username
- `SMTP_PASSWORD` = SMTP password
- `SMTP_TLS` = typically `true` if using TLS (port 465), `false` otherwise
    - Requiring STARTTLS is not currently supported - PRs welcome

**Note:** Using your own mail server gets you labelled as spam easily and should be avoided in production. User-facing email providers like Google might also not want you sending automatic email via them.

### Azure

Tietokilta uses Azure to run Ilmomasiina. Azure gives credits for free to non-profits which should be enough for this.

Azure recently reduced free credits to $2000, which is barely enough to run a production-grade App Service (P1v2/P0v3).
B-tier App Service Plans have been tried and at least B1 doesn't seem to handle load well.

1. **Optional:** Build and push a [customized Docker image](#customization), if necessary.
2. Create an *Azure Database for PostgreSQL Flexible Server* (resource category *Databases*).
    - *Basics* step: ([screenshot](./screenshots/db-basics.png))
        - *Server name:* Choose freely.
        - *Region:* Choose freely, but probably Europe.
        - *PostgreSQL version:* 15
        - *Workload type:* Development
        - *Compute + storage:* Choosing Development should pick you a B-tier SKU. We're not entirely sure if these have enough performance in practice.
        - *Authentication method:* PostgreSQL authentication only
        - *Admin username:* Choose freely.
        - *Admin password:* Choose freely & save for later.
    - *Networking* step:
        - *Connectivity method:* Public
        - Check *Allow public access from any Azure service within Azure to this server*
    - *Security* and *Tags* can be skipped
2. From the *Databases* page, create a database on that server.
    - The name can be chosen freely.
3. **Recommended:** Create a user on the server and grant access to the database.
    - You can technically also use the PostgreSQL admin user if you don't use the database for anything else.
    - This requires connecting to the database manually:
        1. From the *Networking* page, under *Firewall rules*, add a rule for *current client IP address* and save. Wait a bit for the changes to apply.
        2. From the *Connect* tab, copy the `psql` command to your shell:
           ```shell
           psql -h {postgres-server-name}.postgres.database.azure.com -p 5432 -U {admin_user_name} {db_name}
           ```
           - This all-in-one command is under *Connect from browser or locally*. You can also use the variant with environment variables.
           - The portal was a bit buggy for me and I needed to add the database name manually.
        3. Create a new user for Ilmomasiina:
            ```sql
            CREATE USER ilmo_user WITH PASSWORD '<add a password here>';
            ```
        4. Grant access to the database for the new user:
            ```sql
            GRANT ALL PRIVILEGES ON SCHEMA public TO ilmo_user;
            ```
        5. Exit the PostgreSQL session with `exit`.
        6. Try signing in with your new user: replace your admin username in the `psql`
           command with the new user (above: `ilmo_user`).
5. Create an *Azure Web App* (resource category *Web*).
    - *Basics* step: ([screenshot](./screenshots/web-app-basics.png))
        - *Web App name:* Choose freely, will appear in your URLs as `https://{your-app-name}.azurewebsites.net/`.
        - *Publish:* Docker Container
        - *Operating System:* Linux
        - *Region:* Choose freely, but probably same as your database.
        - *Linux Plan:* Reuse an existing one or create a new one.
        - *Pricing plan:* B2 has been tested and isn't very performant. You may want to go for P1v2/P0v3 if your budget allows.
    - *Database* step can be skipped
    - *Docker* step: ([screenshot](./screenshots/web-app-docker.png))
        - *Options:* Single Container
        - *Image Source:* Private Registry
        - *Server URL:* `https://ghcr.io`
        - *Image and tag:*
          - Non-customized Tietokilta image, latest stable version: `tietokilta/ilmomasiina:latest`
          - Non-customized Tietokilta image, pinned version: `tietokilta/ilmomasiina:2.0.0` (example)
          - Customized image, built in CI or uploaded by you: `yourorg/ilmomasiina:latest` (example)
        - If you use Docker Hub or Azure Container Registry, change these accordingly
    - *Networking* step:
        - *Enable public access:* On
    - *Monitoring* and *Tags* can be skipped
6. Read [.env.example](../.env.example). Set relevant variables as *Application settings* on the *Configuration* page. You'll need at least:
    - `PORT` and `WEBSITES_PORT` must match (you can set both to 3000)
    - `DB_DIALECT` = `postgres`
    - `DB_HOST` = Domain name of your PostgreSQL server (from *Connect* page)
    - `DB_USER` = username of PostgreSQL user (above: `ilmo_user`)
    - `DB_PASSWORD` = password of PostgreSQL user
    - `DB_DATABASE` = name of PostgreSQL database
    - `DB_SSL` = `true` (required with Azure's default config)
    - `NEW_EDIT_TOKEN_SECRET` = secure random string (see [_Generating secrets_](#generating-secrets))
    - `FEATHERS_AUTH_SECRET` = secure random string (see [_Generating secrets_](#generating-secrets))
    - `MAIL_FROM` = "From" email for system messages
    - `MAILGUN_*` **or** `SMTP_*` for email credentials (see [_Email sending_](#email-sending))
    - `BASE_URL` = `https://{your-app-name}.azurewebsites.net/`
    - `BRANDING_MAIL_FOOTER_TEXT` and `BRANDING_MAIL_FOOTER_LINK` (may be empty)
7. Access the app at `https://{your-app-name}.azurewebsites.net/`.
    - If something is broken, check the *Log stream* page or read logs via `https://{your-app-name}.scm.azurewebsites.net/`.

### Docker Compose

You can use Docker Compose to run both a database and production container locally.
**Currently, we don't actively test this configuration.**

1. Create a `.env` file at the root of this repository. You can copy [.env.example](../.env.example) to begin and read the instructions within.
2. **Optional:** Modify `args` in `docker-compose.prod.yml` for frontend customization.
3. **Optional:** Make [customizations](#customization) in other files if necessary.
4. Run `docker-compose -f docker-compose.prod.yml up` manually or e.g. via `systemd`.
5. Access the app at <http://localhost:8000>.

### Docker (manual)

If you don't want to use Docker Compose, or already have a database, you can run a plain Docker container locally.

1. Create a `.env` file at the root of this repository. You can copy [.env.example](../.env.example) to begin and read the instructions within.
2. **Optional:** Make [customizations](#customization) in other files if necessary.
    - After this, build your customized image via [GitHub Actions](#github-actions) or [locally](#local-docker-build).
3. Run the container manually or with e.g. `systemd`.
      ```
      docker run -it --rm --init --env-file=.env -p 3000:3000 ghcr.io/tietokilta/ilmomasiina:latest
      ```
    - You might have to add stuff here to e.g. allow database connections.
      - In particular, `--network host` allows connecting to a database running on `localhost` on the host machine. Remove `-p 3000:3000` when using this.
    - This runs a non-customized Tietokilta image from the latest stable version. For other options, replace `ghcr.io/tietokilta/ilmomasiina:latest` with:
      - Non-customized Tietokilta image, pinned version: `ghcr.io/tietokilta/ilmomasiina:2.0.0` (example)
      - Customized image, built in CI or uploaded by you: `ghcr.io/yourorg/ilmomasiina:latest` (example)
      - Locally built image: `ilmomasiina` (what was after `-t` in `docker build`)
4. Access the app at <http://localhost:3000>.

### Running without Docker

You can also set up a production deployment without Docker. **This method is not recommended.**

1. Install a suitable Node version (e.g. using nvm).
2. Run `npm install -g pnpm@8` to install pnpm. Then run `pnpm install --frozen-lockfile` to setup cross-dependencies
   between packages and install other dependencies.
3. Create a `.env` file at the root of this repository. You can copy [.env.example](../.env.example) to begin and read the instructions within.
4. **Optional:** Make [customizations](#customization) in other files if necessary.
5. Run `npm run clean` followed by `npm run build`.
6. Use e.g. `systemd` or `pm2` (`npm install -g pm2`) to run the server process:
    ```
    node packages/ilmomasiina-backend/dist/bin/server.js
    ```
7. Access the app at <http://localhost:3000>.

### Reverse proxy

If you want to serve ilmomasiina from a subdirectory of your website, you need to set up reverse proxying.

This will also require changing the `PATH_PREFIX` env variable when building the frontend or container.

The examples assume `/ilmo/` is the subdirectory and `PORT` is 3000 - adjust accordingly if needed.

The examples use the backend server to serve the frontend files, which is less efficient than using
a proper web server to serve them. (PRs welcome with instructions on how to set up a better method.)

#### Apache + `mod_proxy`

This approach requires access to Apache config.

```apache
# proxy https://your.website/ilmo/whatever to http://127.0.0.1:3000/whatever
<Location "/ilmo/">
  ProxyPass "http://127.0.0.1:3000/"
</Location>
```

#### Apache + `mod_rewrite`

This approach works both in `.htaccess` (with suitable `AllowOverride`s) or Apache config.
In Apache config, you may need to change the rules slightly.

It can use either the backend server or Apache to also serve the frontend files.
If Apache is to be used, the built frontend must be placed in the folder. **(untested)**

```apache
RewriteEngine On

# redirect https://your.website/ilmo to https://your.website/ilmo/
RewriteBase /
RewriteRule ^ilmo$ ilmo/ [NC,R=301,L]

# always proxy https://your.website/ilmo/ to http://127.0.0.1:3000/
RewriteRule ^ilmo/(.*)$ http://127.0.0.1:3000/$1 [P,L]

# proxy https://your.website/ilmo/whatever to http://127.0.0.1:3000/whatever,
# but only if the file doesn't exist in the webroot
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^ilmo/(.*)$ http://127.0.0.1:3000/$1 [P,L]
```

## Development

In development, we recommend [running *without* Docker](#running-without-docker-1). It's easier to use in most cases,
but you'll need to [set up your own database](#database-setup). That is easiest to do [with Docker](#postgresql-with-docker).

There's also a [Docker Compose setup](#docker-compose-1) with some significant drawbacks.

### VS Code setup

Currently Prettier is not used in the project, so here is a recommended `.vscode/settings.json` config:

```json
{
  "[typescript]": {
    "editor.defaultFormatter": "vscode.typescript-language-features"
  },
  "[typescriptreact]": {
    "editor.defaultFormatter": "vscode.typescript-language-features"
  }
}
```

### Running without Docker

1. Install a suitable Node version (e.g. using nvm).
2. Install a database.
    - See [_Database setup_](#database-setup) for instructions on setting up MySQL.
    - You can also use Docker for a database.
    - SQLite may also work, but is currently untested.
3. Create a `.env` file at the root of this repository. You can copy [.env.example](../.env.example) to begin and read the instructions within.
4. Run `npm install -g pnpm@8` to install pnpm. Then run `pnpm install --frozen-lockfile` to setup cross-dependencies
   between packages and install other dependencies.
5. Run `npm start` or `pnpm start`. This will start the frontend and backend dev servers in parallel.
    - If you want cleaner output, you can run `npm start` separately in `packages/ilmomasiina-frontend` and
      `packages/ilmomasiina-backend`.
    - Alternatively, you can use `pnpm run --filter=@tietokilta/ilmomasiina-frontend start`
      (and similar for the backend).
6. Access the app at <http://localhost:3000>.

### Docker Compose

The entire development setup can also be run within Docker using Docker Compose. The
[docker-compose dev setup](../docker-compose.yml) is located at the root of this repository, and contains a
pre-configured PostgreSQL server, so an external database server is not required.

1. Create a `.env` file at the root of this repository. You can copy [.env.example](../.env.example) to begin and read the instructions within.
2. Go to the repository root and run `docker-compose up`. This builds the dev container and starts the frontend and
   backend servers in parallel.
3. Access the app at <http://localhost:3000>.

Due to how the dev Docker is set up, you will still need to rebuild the development image if you change the
dependencies, package.json or ESLint configs. You'll also need Node.js and pnpm installed locally to do that.

### Test database setup

To run tests, you'll likely want another test database so test data doesn't clutter your manual development database.

1. Follow the same steps as in [the usual database setup](#database-setup), but name the database something different. This example uses `ilmo_test`.
2. Create a `.env.test` file at the root of this repository. Assuming your test database runs on the same MySQL/Postgres server, just put this in:
    ```shell
    DB_DATABASE=ilmo_test
    THIS_IS_A_TEST_DB_AND_CAN_BE_WIPED=1
    ```
    - The latter line is required to avoid accidental loss of data, because the test suite truncates all database
      tables whenever you run `npm test`. **Make absolutely sure you're not using an important database for testing.**
      You most likely want to move your regular database configs to `.env.development` or `.env.production`, and copy
      the necessary bits over to `.env.test`.
