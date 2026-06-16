# Production Installation Guide

This guide covers deploying PKPDApp in a production environment using Docker containers.

## Get the Code

First clone the repository:

```bash
git clone https://github.com/pkpdapp-team/pkpdapp.git
cd pkpdapp
```

## Environment Configuration

### `.env.prod` File

The configuration of the production application is stored in the `.env.prod` file in the root directory. Edit this file and variables to correspond to your particular setup, in particular make sure `HOST_NAME`, `DATABASE_URL` is set correctly and that `SECRET_KEY` is altered from the default. The variables are described below:

**Core Settings:**

- `DEBUG`: set to 0 for production
- `HOST_NAME`: the host name of the application
- `SECRET_KEY`: a large random string used for cryptographic signing
- `DATABASE_URL`: URL of a postgres database (e.g. postgres://username:password@postgres:5432/postgres). Note that any special characters in the password must be url-encoded. E.g. `postgres://user:p#ssword!@localhost/foobar` should be written as `postgres://user:p%23ssword!@localhost/foobar`.
- `ENABLE_SIGNUP`: set to 'true' to enable user sign up

**LDAP Authentication (Optional):**

The following variables are used for LDAP authentication:

- `AUTH_LDAP_USE`: set to 1 to use LDAP authentication
- `AUTH_LDAP_SERVER_URI`: URI of LDAP server (e.g. ldap://ldap.forumsys.com:389)

For direct binding:

- `AUTH_LDAP_DIRECT_BIND`: set to 1 to bind directly to LDAP server (see [here](https://django-auth-ldap.readthedocs.io/en/latest/authentication.html#direct-bind)
- `AUTH_LDAP_BIND_DN_TEMPLATE`: template for direct binding (e.g. `uid=%(user)s,dc=example,dc=com`)

For search/bind, connecting to the LDAP server either anonymously or with a fixed account and searching for the distinguished name of the authenticating user:

- `AUTH_LDAP_BIND_DN`: distinguished name of an authorized user (e.g. `cn=read-only-admin,dc=example,dc=com`)
- `AUTH_LDAP_BIND_PASSWORD`: password for the authorized user
- `AUTH_LDAP_SEARCH_BASE`: where to perform the search (e.g. `ou=mathematicians,dc=example,dc=com`)
- `AUTH_LDAP_SEARCH_BASE{i}`: additional search bases (optional, `i` can be one of `[2, 3, 4, 5]`). e.g. `AUTH_LDAP_SEARCH_BASE2=ou=scientists,dc=example,dc=com`
- `AUTH_LDAP_SEARCH_FILTER`: search filter based on authenticated username (`uid=%(user)s`)
- `AUTH_LDAP_USER_GROUP`: (optional) authentication will only succeed if user is in this LDAP group (e.g. `cn=user,ou=groups,dc=example,dc=com`). If not set, then any user in the search base will be authenticated.
- `AUTH_LDAP_ADMIN_GROUP`: (optional) user must be in this LDAP group to be a superuser (e.g. `cn=admin,ou=groups,dc=example,dc=com`). If not set, then no user will be a superuser.

**PrediLogin Authentication (Optional):**

The following variables are used for PrediLogin authentication:

- `AUTH_PREDILOGIN_USE`: set to 1 to use PrediLogin authentication
- `AUTH_PREDILOGIN_BASE_URL`: URL of PrediLogin API (e.g. <https://predilogin.example.com/api>)
- `AUTH_PREDILOGIN_API_KEY`: API key for PrediLogin (e.g. `your_api_key_here`)
- `AUTH_PREDILOGIN_ADMIN_GROUP`: user must be in this group to be a superuser (e.g. `admin`)
- `AUTH_PREDILOGIN_USER_GROUP`: authentication will only succeed if user is in this group (e.g. `user`)

**Email/Password Sign Up & Verification:**

When `ENABLE_SIGNUP` is `'true'`, users can register with an email and password. Registration sends a verification email (handled by [django-allauth](https://docs.allauth.org/)); the user must click the verification link before they can log in. Configure email delivery so these emails can be sent (if `EMAIL_HOST` is unset, emails are printed to the console, which is only suitable for development):

- `EMAIL_HOST`: SMTP server host name
- `EMAIL_PORT`: SMTP server port
- `EMAIL_HOST_USER`: SMTP username
- `EMAIL_HOST_PASSWORD`: SMTP password
- `DEFAULT_FROM_EMAIL`: the "from" address used for verification emails

The base URL that the verification link redirects back to is derived automatically from `HOST_NAME` (`https://<HOST_NAME>` in production). Set `FRONTEND_BASE_URL` only if you need to override this, e.g. when the frontend is served from a different host. The CSRF trusted origin is likewise derived from `HOST_NAME`; `CSRF_TRUSTED_ORIGINS` only needs setting to add extra origins.

**Social Login (Optional):**

Users can also sign up / log in via Google or GitHub. Register an OAuth app with each provider and set the following. The OAuth redirect (callback) URIs to register with the provider are `<host>/accounts/google/login/callback/` and `<host>/accounts/github/login/callback/`. Leave the variables unset to disable a provider.

- `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET`: Google OAuth credentials
- `GITHUB_OAUTH_CLIENT_ID` / `GITHUB_OAUTH_CLIENT_SECRET`: GitHub OAuth credentials

### Frontend Environment Variables

There are also a number of frontend variables that can be set in `frontend-v2/.env`:

- `VITE_APP_ROCHE`: set to true to enable Roche branding
- `VITE_APP_HELP_URL`: url of help page shown on login
- `VITE_APP_GA_ID`: Google Analytics ID to enable analytics.
- `VITE_ENABLE_SIGNUP`: set to true to enable user sign up
- `VITE_APP_ACK_TXT`: Acknowledgment text for login and signup pages

## SSL Certificate

The application's nginx terminates TLS on port 443. There are two supported ways to provide the certificate. Both use the same images and config; they differ only in where the certificate files come from.

### Option 1: Supply your own certificate (manual)

Place your certificate and key in a `.certs/` directory in the repository root (create it if needed), named `pkpdapp.crt` and `pkpdapp.key`. This is the default — no extra flags are needed when running the stack. To renew, replace the files and reload nginx (`docker compose exec app nginx -s reload`) or restart the container.

### Option 2: Automatic Let's Encrypt certificates (certbot)

This obtains and auto-renews a free certificate from Let's Encrypt using `certbot` on the host, with the app's nginx serving the ACME challenge over port 80. Use the `docker-compose.certbot.yml` override.

Prerequisites:

- A real domain name set as `HOST_NAME` in `.env.prod`, with a DNS A-record pointing at the server's public (Elastic) IP.
- Ports **80 and 443** open to the internet in the security group (port 80 is required for the ACME challenge and the HTTP→HTTPS redirect).
- `certbot` installed on the host (`sudo dnf install -y certbot` on Amazon Linux, `sudo apt install -y certbot` on Ubuntu).
- `HOST_NAME` available to docker-compose's variable substitution. The override references `${HOST_NAME}`, which compose reads from the shell environment or a root `.env` file (this is separate from `env_file: .env.prod`, which only sets variables *inside* the container). The simplest approach is to export it before running compose, e.g. `export HOST_NAME=your-domain.example`.

First-time bootstrap (nginx needs *some* certificate to start its 443 block, so create a throwaway self-signed one, then issue the real cert):

```bash
mkdir -p certbot-webroot .certs
# Throwaway self-signed cert so nginx can boot the first time:
openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
  -keyout .certs/pkpdapp.key -out .certs/pkpdapp.crt \
  -subj "/CN=${HOST_NAME}"

# Start the stack (base + certbot override). nginx now answers on port 80.
docker compose -f docker-compose.yml -f docker-compose.certbot.yml up -d

# Issue the real certificate via the webroot challenge, and reload nginx in the
# container whenever the cert is (re)issued:
sudo certbot certonly --webroot -w ./certbot-webroot -d "${HOST_NAME}" \
  --deploy-hook "docker compose -f $(pwd)/docker-compose.yml -f $(pwd)/docker-compose.certbot.yml exec -T app nginx -s reload"

# Recreate so nginx picks up the live Let's Encrypt cert path:
docker compose -f docker-compose.yml -f docker-compose.certbot.yml up -d
```

Auto-renewal: certbot installs a systemd timer (or cron) that runs `certbot renew` twice daily; renewals reuse the `--deploy-hook` recorded above, so nginx is reloaded automatically. To be explicit you can add a cron entry instead:

```cron
0 3 * * * certbot renew --quiet --deploy-hook "docker compose -f /path/to/repo/docker-compose.yml -f /path/to/repo/docker-compose.certbot.yml exec -T app nginx -s reload"
```

Verify with `sudo certbot renew --dry-run`.

## PostgreSQL Database

The application uses a PostgreSQL database. You should supply your own database and set the `DATABASE_URL` variable in the `.env.prod` file appropriately.

## Help Pages & Tutorials

To add tutorial videos to the application, you will need to create a csv file with the following columns (the first line of the csv file should be the column names):

- `Title`: title of the video
- `Type`: tab in which the video will be displayed (either `Tutorial X` where `X` is a number, `Project`, `Drug`, `Model`, `Trial Design`  or `Simulation`)
- `Link`: link to the video
- `Keywords`: keywords associated with the video (optional)

This file should be placed in the `pkpdapp/static/` directory and named `tutorial_videos.csv`.

To link to an external help page url, set the `REACT_APP_HELP_URL` variable in the `.env.prod` file to the url of the help page.

## Docker Deployment

The application is deployed using docker containers and docker-compose, so you will need to install these.

### Build the Containers

To build the containers, run the following command in the root directory of the repository. This runs a script that builds the containers (using `docker compose build`):

```bash
./build.sh
```

### Run the Application

Run the container in the foreground with:

```bash
docker compose up
```

To leave it running in the background, use `docker compose up -d`.

If you are running the bundled PostgreSQL database (see the PostgreSQL section) and/or automatic Let's Encrypt certificates (see the SSL Certificate section), layer the corresponding override files, e.g.:

```bash
docker compose -f docker-compose.yml -f docker-compose.postgres.yml -f docker-compose.certbot.yml up -d
```
