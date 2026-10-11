# Persistent Gemini errors: live diagnosis

## Confirmed cause

On 2026-10-09, using FRAME's actual development configuration resolution (`loadEnv(development)` plus process-environment overrides), the configured model was `gemini-3.8-flash`, with a key present and no process model override. Neither the key nor prompts were logged.

The official Models GET request using that key returned HTTP 200, `models/gemini-3.8-flash`, and `generateContent` in supported methods. An actual FRAME prompt-analysis call then returned HTTP 503 after 10707ms: Google code 503, status `UNAVAILABLE`, message `This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later.` The existing retry, after a 550ms jittered delay, succeeded and produced validated mobile-app analysis. This verifies both model access and actual generation permission. It reproduces a live 503 and recovery; it does not reproduce three consecutive live 503s or prove every historical failure occurred in analysis.

The current error is temporary upstream service demand, not evidence of an invalid model, credentials or broken editable-design schema. Three consecutive responses can still exhaust the existing bounded retry policy. Application code cannot repair Google's availability.

Evidence: `artifacts/gemini-availability/latest.json`. The official model documentation lists this model and structured-output support: https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash

## Actual application gaps and fixes

The previous handler threw away the entire Google error body and inferred status names from HTTP status. That hid Google's explanation. It now reads at most 64KiB, logs only sanitized error code/status/message (message capped at 300 characters), and redacts the actual key, complete/escaped prompt strings, request text, credential patterns and URLs before logging. Stage, attempt and elapsed time accompany both failure and successful upstream responses. Reader disposal cannot mask a known HTTP error.

Retry-After values above ten seconds were previously rejected even if they fit the overall deadline. Values that did not fit were labelled a timeout before the deadline actually expired. Valid numeric/date Retry-After values are now respected within the remaining budget; impossible waits preserve the actual 429/503 error and retry guidance. Exhausted rate limits retain final Retry-After advice. Three total attempts, jittered backoff, existing deadlines, fresh signals and intentional-cancellation checks remain unchanged.

The old StrictMode mount-cleanup abort was fixed previously and remains covered by an abort-aware regression test. The current request path does not abort its caller controller because it received HTTP 503: error-body disposal and request timer cleanup are separate, and normal response completion does not trigger the route's disconnect cancellation. Project changes/unmounts deliberately cancel; deadline expiry is a timeout. A remaining frontend gap labelled an AbortError as cancellation even when neither caller nor timeout signal was aborted. Such unattributed connection interruptions now report a retryable network error, without inventing user intent. Known HTTP failure still wins over an error-body AbortError. No live AbortError occurred during this probe.

The three core quality stages (planning, draft, visual review) and preceding analysis remain intact. `server/designInstructions.ts` was inspected and not changed. Model configuration, generation instructions, schema validation, editing, undo/redo, render review and atomic publication/prompt preservation remain intact.

## Exact files changed in this follow-up

- `server/geminiDiagnostics.ts`: bounded Google error decoding and redaction.
- `server/geminiResponse.ts`: real metadata/elapsed-time logging, stage-aware actionable unavailability, deadline-aware Retry-After handling; existing retry count retained.
- `server/gemini.ts`: return controlled stage and retry delay metadata.
- `src/design/api.ts`: distinguish unattributed AbortError from intentional cancellation.
- `scripts/check-gemini-availability.ts`: opt-in live metadata plus actual FRAME analysis probe using runtime configuration; no model switch.
- `tests/geminiDiagnostics.test.ts`: redaction, original Google status/stage/timing, numeric/date Retry-After, exhaustion and insufficient-budget behavior.
- `tests/designApi.test.ts`: unknown abort remains a network interruption, one accurate HTTP error, cancellation/timeout handling.
- `README.md`: correct the outdated one-retry documentation.
- `docs/gemini-persistent-errors.md`: this report.

## Verification limits

Final checks: `npm run typecheck` passed; `npm test` passed all 50 tests with zero failures (output in `artifacts/gemini-persistent-errors-tests.log`); `npm run build` passed. The build emitted existing nonfatal Zod annotation warnings.

Live model/key access and one upstream 503 followed by successful retry were verified. Three consecutive 503s, invalid credentials/model status, rate limits, genuine cancellation, timeouts and design preservation are tested with controlled simulations and the actual local HTTP route. No full live website/mobile design was generated in this follow-up. Google's service availability is not claimed fixed.
