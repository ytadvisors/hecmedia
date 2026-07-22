# MBA-local Docker WordPress API for HECMedia development (task #82651)

An isolated, Docker-based WordPress instance for developing against the
HECMedia REST/GraphQL API without touching `prod-wp.hectv.org`. Runs on
worker-mba (192.168.1.6) under Colima. All ports are bound to `127.0.0.1` on
that host only — nothing is exposed to the wider network.

## What's covered

| Surface                                                                                | Status                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| WP REST v2 (`/wp-json/wp/v2/*`)                                                        | Full — core WordPress                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| WPGraphQL (`/graphql`)                                                                 | Core schema only (posts/pages/menus/generalSettings). **Does not** include the ACF-registered custom fields production uses (`postDetails`, `requiredPosts`, `feedDesign`, `magazines`, `pageTemplate`, `shouldOutputInFlatList`, etc.) — that field-registration code is custom WP-side PHP that isn't checked into this repo or any repo available in this environment, so it couldn't be audited or ported. All four `tests/e2e/graphql/*.e2e.test.js` suites query these fields and fail against this instance for that reason — expected, not a bug in this harness, but be aware **no** app-level GraphQL flow is exercisable here yet, only raw core-schema queries. |
| `wp-api-menus` v2 (`/wp-json/wp-api-menus/v2/menus`)                                   | Full — real plugin, installed by `seed.sh`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `hectv/v1` (`livevideos/live`, `token/email`, `token/thirdparty`, `users/me`, `users`) | **Local stub only** (`mu-plugins/hectv-v1-stub.php`). Same for the same reason as the GraphQL gap above: this is custom WP-side plugin code with no source available to this environment. The stub returns well-formed fixture JSON at the correct URLs so the app doesn't 404, but implements no real auth/video logic. Do not trust it for anything auth- or video-related.                                                                                                                                                                               |

If the real ACF field registrations or the real `hectv/v1` plugin source
become available (e.g. exported from the production WP admin, or found in a
repo not yet located), swap them in and delete the stub / gap note above.

## Prerequisites (worker-mba)

- Colima (`brew install colima`) — already installed.
- Docker CLI + compose plugin — already installed.
- Docker credential helper note: if `docker compose` fails with `error getting credentials - err: exec: "docker-credential-osxkeychain" ...`,
  it's because the `colima` context inherited a `credsStore: osxkeychain`
  config but the helper binary isn't on a non-interactive SSH `$PATH`. Fix by
  adding it for the session:
  ```
  export PATH="/Applications/Rancher Desktop.app/Contents/Resources/resources/darwin/bin:$PATH"
  ```
  (only needed for pulling public images; no credentials are actually stored).

## Start

```bash
ssh worker-mba
colima start --arch aarch64 --cpu 2 --memory 4   # if not already running; `colima status` to check
docker context use colima                         # if `docker context ls` doesn't already show colima as current
cd ~/hecmedia-dev-wp                               # deployed copy of dev-infra/wordpress/ — see "Deploying" below
cp .env.example .env    # first run only
docker compose up -d
./seed.sh               # first run only — installs wp-graphql + wp-api-menus, creates fixture menus/posts/pages
```

## Health check

```bash
docker compose ps                                            # both services should show healthy
curl -fsS http://localhost:8091/wp-json/ | head -c 200        # core REST
curl -fsS "http://localhost:8091/wp-json/wp/v2/posts?per_page=1"
curl -fsS "http://localhost:8091/wp-json/wp-api-menus/v2/menus"
curl -fsS http://localhost:8091/graphql -H 'Content-Type: application/json' \
  -d '{"query":"{ generalSettings { url } }"}'
curl -fsS http://localhost:8091/wp-json/hectv/v1/livevideos/live
```

wp-admin: `http://localhost:8091/wp-admin` — user `devadmin` / pass `devadmin`
(local-only fixture credentials, not real secrets).

### Verified app data flow

`tests/e2e/rest/posts.e2e.test.js` exercises the real `store/api/PostApi.js`
module the Next.js app uses, against this instance, via an SSH tunnel
(`ssh -L 8091:localhost:8091 worker-mba`):

```bash
export GATSBY_WP_HOST=http://localhost:8091 WP_HOST=http://localhost:8091
yarn test:e2e -- tests/e2e/rest/posts.e2e.test.js
```

`getAllPosts`, `getPostBySlug`, `getComments`, and `getArticles` pass — a real
app code path reading real (fixture) data end-to-end through this harness.
`getCategory` is skipped on a pre-existing app↔API contract break confirmed
against production (documented in that test file, dated 2026-07-16 —
`categoryList` route doesn't exist anywhere, not a harness gap). `getLiveVideos`
fails here because `mu-plugins/hectv-v1-stub.php`'s fixture response shape
(`{live, items, _stub}`) doesn't match what `PostApi.getLiveVideos()` expects
(`res.data` as a bare array) — a stub-fidelity gap in this harness, not a
production bug; fix the stub shape if this flow needs to be exercised locally.
No GraphQL app flow is exercisable yet — see the WPGraphQL row above.

## Reset

```bash
cd ~/hecmedia-dev-wp
docker compose down -v   # drops the named volumes (dev_db_data, dev_wp_data) — full wipe
docker compose up -d
./seed.sh
```

## Stop

```bash
cd ~/hecmedia-dev-wp && docker compose down     # keeps volumes; data survives
colima stop                                     # only if nothing else on worker-mba needs Docker
```

## Pointing the HECMedia app at this instance

Copy `.env.local.example` (repo root) to `.env.local`, or export directly:

```bash
export GATSBY_WP_HOST=http://localhost:8091
export WP_HOST=http://localhost:8091
export APOLLO_CLIENT_URI=http://localhost:8091/graphql
yarn dev
```

Production defaults are untouched — `tests/e2e/support/config.js` and
`next.config.js` only pick these up when the env vars are explicitly set, and
`tests/e2e/support/writeGuard.js` (see `tests/e2e/support/local-dev-env.e2e.test.js`)
independently refuses to allow writes against `prod-wp.hectv.org` /
`hectv.org` / `hecmedia.org` no matter what else is configured in the
process — a local override can never accidentally make a production target
writable.

From a machine other than worker-mba (e.g. this repo's usual dev laptop): the
compose file binds every port to `127.0.0.1` on worker-mba only (`docker port
hecmedia-dev-wp` confirms `80/tcp -> 127.0.0.1:8091`, not `0.0.0.0`), so
`http://192.168.1.6:8091` is **not** reachable directly, even from the same
LAN — that's intentional, not a bug, per the "Production safety" section
below. Use an SSH tunnel instead: `ssh -L 8091:localhost:8091 worker-mba`,
then point `GATSBY_WP_HOST`/`APOLLO_CLIENT_URI` at `http://localhost:8091` as
above. Verified working 2026-07-22.

## Deploying this config to worker-mba

The compose file, seed script, and mu-plugin stub live in this repo under
`dev-infra/wordpress/`. Sync them to worker-mba with:

```bash
rsync -a dev-infra/wordpress/ worker-mba:~/hecmedia-dev-wp/
```

worker-mba doesn't check out this repo directly for this purpose — `dev-infra/wordpress/`
is the source of truth; `~/hecmedia-dev-wp/` on worker-mba is a synced deployment of it.
Re-run the rsync after any change to `dev-infra/wordpress/` and re-run
`docker compose up -d` to pick it up.

## Production safety

- No production credentials, tokens, or dumps are used anywhere in this
  setup. `seed.sh` creates deterministic fixture content only.
- `docker-compose.yml` binds every port to `127.0.0.1` — nothing is reachable
  outside worker-mba itself except over an explicit SSH tunnel or direct LAN
  access to `192.168.1.6`, which was never exposed to the public internet.
- `mu-plugins/hectv-v1-stub.php` and the WPGraphQL/wp-api-menus install exist
  only inside this local container's `wp_data` volume; nothing here touches
  `prod-wp.hectv.org`.
