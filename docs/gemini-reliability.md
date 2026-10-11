# Gemini request reliability and cancellation

## Findings

The configured local model is `gemini-3.8-flash`. The model and all design-generation instructions remain unchanged.

An upstream HTTP 503 was handled in `server/geminiResponse.ts`, with only one fixed-delay retry. The server discarded its error body but did not log the original HTTP status. Transport exceptions were caught without distinguishing a timeout from cancellation. Disposal of a failed response body occurred outside that catch and could throw an AbortError that masked the observed HTTP failure. There was no caller signal from the HTTP route to stop work after the browser disconnected.

The reproducible frontend abort is independent of HTTP 503: `src/main.tsx` mounts React StrictMode; the provider's mount effect consumed the pending prompt and immediately started fetch. StrictMode's cleanup aborted that controller, then set `alive` true on its second setup. That made the aborted first request eligible to publish an error, while the consumed prompt prevented a replacement request. Raw fetch exceptions passed into the chat message unchanged. The previous tests mocked fetch without honoring abort signals, so they did not expose this lifecycle error.

A 503 response does not itself abort the browser request. Historical production diagnostics were not available, so the exact source of the reported user's individual abort cannot be proven retroactively. The lifecycle regression, timeout ambiguity and disposal-masking path are reproduced in tests, and new controlled diagnostics distinguish future failures.

## Changes

- `server/geminiResponse.ts`: maximum three attempts per Gemini stage (initial + two retries), exponential 500/1000ms base delays with 0-50% jitter, bounded Retry-After support, fresh attempt controllers, abort-aware backoff, distinct timeout/cancellation errors, original HTTP status metadata and allowlisted diagnostics. Retry HTTP 408/429/500/502/503/504 and transient transport/per-attempt timeouts only; no retries for invalid credentials/model IDs, other permanent statuses, malformed API JSON, blocked/truncated results or schema failures. An overall deadline or intentional cancellation ends the request without another attempt. Response disposal cannot replace a known HTTP error.
- `server/gemini.ts`: cancellation propagates from disconnected/aborted HTTP clients to all stages; no writes to destroyed responses; configurable deadline and per-attempt budgets; named stage diagnostics; upstream status returned separately from local API status; missing configuration is non-retryable.
- `server/index.ts`: server request timeout follows the configured budget with headroom.
- `src/design/api.ts`: one browser POST, explicit disposable timer, normalized error codes, sanitized client-side diagnostics, HTTP errors retained even if error-body consumption fails. The server owns retries; browser retries cannot multiply stage attempts.
- `src/workspace/store.tsx`: consume/start the pending prompt after the committed mount survives StrictMode's synchronous probe; cancel that scheduling on cleanup. Explicit project/unmount abort reasons and lifetime invalidation suppress stale errors. Existing synchronous request lock, prompt messages, atomic design publication and fingerprint protection remain.
- `shared/generationTiming.ts`: shared timeout defaults and bounded setting parser.
- `src/vite-env.d.ts`: Vite environment typing.
- `.env.example`: optional timeout settings; no key/model changes.
- `tests/geminiResponse.test.ts`: eventual third-attempt success, exhausted retries, fresh signals, jitter, permanent errors, cancellation before fetch/during fetch/backoff, overall/per-attempt/body timeouts, disposal AbortError and diagnostics redaction.
- `tests/designApi.test.ts`: single preserved HTTP error, genuine browser cancellation, header/body timeout normalization and no duplicate POST retry.
- `tests/strictGeneration.test.tsx`: real StrictMode lifecycle with an abort-aware fetch, exact original prompt, single committed submission, duplicate suppression, one 503 UI message and existing-design preservation.
- `tests/generationRoute.test.ts`: actual local HTTP disconnect aborts upstream work; configurable overall timeout returns a controlled 504.
- `tests/server.test.ts`: three upstream attempts and original 503 metadata through the real route.
- `tests/editor.test.tsx`: wait for committed asynchronous initialization before assertions; other editor regression coverage retained.

## Configuration and diagnostics

Defaults remain 350000ms for the server's entire multi-stage API request, 180000ms per Gemini attempt, and 370000ms for the browser request. Optional `.env` settings: `GEMINI_GENERATION_TIMEOUT_MS`, `GEMINI_ATTEMPT_TIMEOUT_MS`, `VITE_UI_GENERATION_TIMEOUT_MS`. Values are bounded to 1000-900000ms. The browser budget is sent with the request; the server uses the smaller server/client budget with headroom. Restart development servers after configuration changes; rebuild production assets for VITE settings.

Server logs include event, stage, attempt, original HTTP status, controlled status classification and backoff delay. Client logs include controlled error code and caller/timeout cancellation source. Logs never include API keys, URLs, request/response bodies, prompts or raw exception messages. New logs show if a request is cancelled by project change, workspace cleanup or client disconnect.

Verification uses deterministic upstream simulations and an actual local HTTP server; it does not claim Google never returns 503 or that a new live Gemini request was made. Persistent upstream failures still end in one honest, retryable error with the user's data preserved.

## Actual verification results

- `npm run typecheck`: passed.
- `npm test`: 46/46 passed, zero failures. Full output is in `artifacts/gemini-reliability-tests.log`.
- `npm run build`: passed; existing nonfatal Zod annotation warnings remain.
- No live upstream Gemini request or model change was performed.
