# Netlify deployment

Netlify hosts AMPERE's Next.js console and snapshot API. Docker runs the Arkiv
node on your laptop or a persistent server. The collector runs beside that node
and uploads signed snapshots over HTTPS; Netlify stores the latest one in Blobs.
No inbound tunnel or public Arkiv RPC is needed.

```text
YOUR MACHINE / VPS                         NETLIFY
┌───────────────────────────┐              ┌───────────────────────────┐
│ Docker: owned Arkiv node  │              │ Next.js console + API     │
│       127.0.0.1:8545       │              │            ▲              │
│              ↓            │              │            │              │
│ AMPERE collector          │── HTTPS ────▶│ /api/ingest → Blobs        │
│ local records + signer    │ signed JSON  │ latest verified snapshot  │
└───────────────────────────┘              └───────────────────────────┘
```

This fits the Arkiv requirement that the collector runs next to the owned node.
Query benchmarks still run only against literal loopback addresses. Netlify does
not execute Docker, benchmarks, transaction sends, or the continuous collector.

## 1. Prepare the collector

Use the normal [local setup](../README.md#boot). Then print the public fingerprint
of its persistent report-signing key:

```sh
npm run cloud:identity
```

Copy the printed `AMPERE_SIGNER_SHA256` value. This is public. Keep the private
`.ampere/report-key.pem` on this machine; it is never needed by Netlify.

Generate a separate upload secret locally:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Keep this token private. It authenticates snapshot uploads, not wallet activity.

## 2. Create the Netlify project

Once publication is wanted, import the repository in Netlify. Use the included
[`netlify.toml`](../netlify.toml):

| Setting           | Value           |
| ----------------- | --------------- |
| Base directory    | Repository root |
| Build command     | `npm run build` |
| Publish directory | `.next`         |
| Node              | 22              |

Netlify auto-detects Next.js and applies its OpenNext adapter, including server
route handlers. Do not switch this app to a static export or upload a plain HTML
folder: the ingestion, recording and verification routes need server execution.
[Official Next.js support](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/)

A Git remote is not required for manual deployment. If keeping Git publication
deferred, the CLI can create/link a project and build from this checkout:

```sh
npx netlify-cli login
npx netlify-cli init --manual
npx netlify-cli build
npx netlify-cli deploy --prod
```

These are publishing instructions, not commands run automatically by AMPERE.
Configure the runtime variables below before the production deploy. Always run
the current build before deploying; do not deploy an old `.netlify` output.
For a site already connected to Git, the next production-branch push replaces a
manual production deploy. `.netlify/` is ignored because linking stores local
site state there.

In this Windows environment, native CLI packaging encountered filesystem/symlink
restrictions. The full offline Netlify build passed in a clean Linux container.
Prefer Netlify's hosted Git build, or run the manual CLI commands in a Linux
checkout (for example, inside WSL's Linux filesystem). A local Git clone copies
committed code without carrying `.ampere` data or generated Windows artifacts.

## 3. Configure Netlify runtime variables

In the Netlify project's environment settings, set these for the **production**
context. Their scope must include **Functions**, or use all scopes if your plan
does not offer individual scopes. Redeploy after changing them.

| Name                      | Value                                                             |
| ------------------------- | ----------------------------------------------------------------- |
| `AMPERE_STORAGE`          | `netlify`                                                         |
| `AMPERE_SITE_ORIGIN`      | `https://your-site.netlify.app` or the exact custom-domain origin |
| `AMPERE_PUBLIC_DASHBOARD` | `true` to deliberately share sanitized measurements               |
| `AMPERE_INGEST_TOKEN`     | The random upload secret from step 1                              |
| `AMPERE_SIGNER_SHA256`    | The fingerprint from `npm run cloud:identity`                     |

Use the environment UI/CLI for these variables. Values in `netlify.toml` are not
available to runtime functions. Do not prefix secrets with `NEXT_PUBLIC_`.
[Runtime environment variables](https://docs.netlify.com/build/functions/environment-variables/)

Hosted live reads are disabled unless `AMPERE_PUBLIC_DASHBOARD=true`. Enabling it
makes the sanitized recording and signed reports available to site visitors.
For a private operator dashboard, apply Netlify visitor access controls before
sharing its URL. There is no AMPERE user-account system.

Production snapshots persist across deploys in `ampere-production`. Preview and
branch builds use a separate namespace based on their build-time deploy ID.
Only the non-secret deployment identity is embedded at build time. Preview
deploys should not receive production upload credentials; use Example mode or
separate preview credentials and an exact preview origin when testing exports.

## 4. Connect your collector

On the machine with Docker, add to ignored `.env.local`:

```dotenv
ARKIV_RPC_URL=http://127.0.0.1:8545
ARKIV_CONTAINER=ampere-arkiv-1
AMPERE_PUBLISH_URL=https://your-site.netlify.app/api/ingest
AMPERE_INGEST_TOKEN=the-same-random-upload-secret
```

Do not copy Netlify's `AMPERE_STORAGE` setting into the local collector's env.

```sh
docker compose up -d
npm run doctor
npm run collect:watch
```

Each saved snapshot is signed locally and uploaded. Open the Netlify URL and
choose **Live**. You do not need `npm run dev` on the collector machine for the
hosted dashboard to work. The collector, node and internet connection must stay
running for fresh data; when they stop, the last saved snapshot remains and the
console marks it stale. A VPS can replace the laptop later using the same setup.

One collector is supported per production site. Snapshot writes replace the
latest blob; it is not a historical database or multi-operator aggregator.
The dashboard polls every five seconds and uploads occur after each collection
cycle, so hosting usage depends on collector uptime and number of viewers.

## Integrity and failure recovery

- Uploads require a bearer token, valid Ed25519 signature, matching configured
  signer fingerprint, live recording schema and a bounded 2 MB body.
- Old/replayed snapshots are refused. Where supplied by Blobs, storage revisions
  also guard replacement against concurrent changes. Run only one collector.
- Queries, wallet keys and signing keys remain on the collector. Only the
  allowed recording fields and public signature envelope are uploaded.
- The hosted Export action downloads the collector's original signed report.
  Example exports are synthetic and use an ephemeral server-generated key.
- Upload failure preserves the local recording and prints a generic warning.
  The next collection retries with its current snapshot; collection does not stop.
- `401`: check the token on both machines. `400`: check the public fingerprint,
  system clock and report validity. `503`: check Functions variables, Blobs and
  the explicit dashboard-sharing setting. `409`: a newer snapshot already exists.
- After changing the local signing key, update the Netlify fingerprint and
  redeploy before resuming uploads. Existing reports keep their embedded signer.
- A build-time privacy check rejects file traces containing `.ampere`, private
  query files, `.reference` or env files. This matters especially for manual
  builds on a machine that already has collected data and keys.

[Netlify Blobs documentation](https://docs.netlify.com/build/data-and-storage/netlify-blobs/)

## Validation status

Automated tests exercise the upload handler and read/export routes against the
official Blobs SDK's local server, including token rejection, signer mismatch,
tampering, replay, oversized bodies and local persistence through upload failure.
An actual hosted deployment and its first collector upload remain to be verified
when a Netlify project is selected and deployment is requested. The offline Linux
Netlify build completed through function packaging with Next.js Runtime 5.16.6;
the bundle privacy check passed with a deliberately present private-path marker.
