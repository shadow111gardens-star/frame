# Stitch server adapter and cache (Steps 1–2)

Validation: all 91 tests passed (including four mocked Stitch tests),
`npm run typecheck` passed, and `npm run build` passed. No live Stitch calls were made.

The existing Gemini route, editor, and browser-memory project storage are unchanged.
`stitchCache.generate({ prompt, deviceType: 'MOBILE' })` is the server entry point
for later provider routing. It returns saved HTML, download URLs, screen ID,
prompt hash, device type, creation timestamp, and a cache-hit indicator.

Configure server-only `.env` variables:

```dotenv
STITCH_API_KEY=
STITCH_PROJECT_ID=
```

The production server already loads `.env`; callers must load environment variables
before generating. No SDK or secret is imported by frontend code.
When project ID is missing, the first cache miss creates a project, saves its ID
in the ignored cache directory, and prints only the ID for copying into `.env`.
Following calls and process restarts reuse that saved ID. Tests never contact Stitch.

## Storage choice

This setup has Firebase browser authentication only, no server Admin credentials,
no GOOGLE_APPLICATION_CREDENTIALS or local application-default credentials, and
no existing Firestore server integration. The web Firebase key is not an Admin
credential. Accordingly the authorized fallback is `server/data/stitch-cache/`,
gitignored, with atomic JSON writes. No database or browser project storage changes
were made. Each entry contains `promptHash`, `deviceType`, `screenId`, `htmlUrl`,
`imageUrl`, `savedHtml`, and `createdAt`. Hashing uses exact prompt + deviceType.

Counters live in `calls-YYYY-MM-DD.json`, with UTC dates and attempted generate
counts, including SDK errors. Hits do not increment the counter or call the SDK.
Project creation and downloads are not generate calls. Counts are logged on the server.

## SDK verification and security

Installed npm SDK 0.3.5 source (`dist/src/spec/errors.d.ts`) contains exactly the
seven requested codes. It does not contain CLARIFICATION_REQUIRED, despite the
newer repository README mentioning it; no handler was added for that code.
The SDK exposes `project(id).generate(prompt, 'MOBILE')`, `screen.screenId`,
`getHtml()`, `getImage()`, and singleton `callTool('create_project', { title })`.
HTML is fetched from the returned HTTPS URL on the server. SDK exception text is
never passed through, because it may contain credentials or other private details.

The public Firebase web key in `src/auth/firebase.ts` remains public configuration.
In Google Cloud, restrict it to the required Firebase APIs and authorized web
origins; review Firebase Authentication authorized domains and enforce appropriate
Firestore/Storage rules if those services are enabled. Do not use it as a server secret.

## Limits and deferred work

- Provider routing, iframe preview, UI controls, and localStorage project-ID handling
  are deferred to Steps 3–4. There are no localStorage writes in this server-only step.
- Download URLs may expire; saved HTML survives, but linked assets and screenshots
  may become unavailable. Cache hits never regenerate or refresh URLs automatically.
- Calls measure attempts, not exact billed credits or remaining quota. No daily
  quota is assumed or enforced; RATE_LIMITED gives a readable quota message.
- Output is HTML only, without editable layers or Figma export.
- Use one server process with a persistent writable disk. Misses are serialized
  within that process; multiple processes sharing the directory are not supported.
- If generation succeeds but downloading or saving fails, no completed cache entry
  exists; a later retry can consume another generation credit.
- Changing project/key does not invalidate this prompt/device cache; clear or move
  the cache directory deliberately if isolation between projects is required.
