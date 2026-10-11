# Gemini HTTP 400 diagnosis — 11 October 2026

## Actual upstream evidence

One and only one live `generateContent` request was made. It used the existing
server-side `GEMINI_API_KEY` from the development environment (no credential was
printed or rewritten), `gemini-3.8-flash`, and the official endpoint:
`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent`.

The request isolated draft-schema acceptance using a short synthetic request,
the unchanged production mobile generation instructions and unchanged
`responseJsonSchema` (10023 UTF-8 bytes). `responseMimeType` was application/json;
a diagnostic-only 256-token output cap limited potential usage. This was not a
complete analysis/planning/design workflow and did not use a user's prompt.
There were no retries, model-list calls or second live verification calls.

Actual response: HTTP **400**, Google code **400**, Google status
**INVALID_ARGUMENT**, exact message **“Request contains an invalid argument.”**
Elapsed time: 2319ms. Sanitized evidence is saved in
`artifacts/gemini-400/diagnostic.json`.

Historical saved Google evidence identifies a **draft** rejection on 9 October,
after successful analysis and planning, with the same generic message. The new
live request independently reproduced rejection of a request using the current
draft schema. It does not prove which stage failed in the user's latest full
workflow, or which request field caused the rejection.

## Findings and limits

Google's official model documentation lists `gemini-3.8-flash` as a stable model
with structured-output support:
https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash

Google's structured-output documentation describes the supported JSON Schema
subset and warns that large/deep schemas may be rejected:
https://ai.google.dev/gemini-api/docs/generate-content/structured-output

The code, current environment and running server route to the same model.
The response does not report NOT_FOUND, PERMISSION_DENIED, or an invalid-key
message. However, a generic INVALID_ARGUMENT cannot establish whether the
underlying cause is a parameter, schema complexity, or an account restriction.
No specific schema incompatibility was confirmed. Numeric enums are documented
as supported, so they were not removed based on speculation.

The smallest evidence-based application change is diagnostic: every transport
event now records the nonsecret model and a bounded request summary containing
MIME type, structured-output presence, schema byte length/hash, optional output
cap, content count and system-instruction presence. Existing sanitized Google
code/status/message, stage, attempt and timing remain present. No headers,
credential values, schema contents, full prompts or exception text are logged.
The regression replays the actual Google error and verifies one attempt,
unaltered structured request, preserved failure stage and secret-free logs.

No model, production request format, design schema, prompt, validator or
generation stage was changed. This is **not a verified repair of Google's 400**.
Further isolation would require separately authorized controlled comparisons
(for example a small structured schema versus the full schema); none were run.

Files changed: `server/geminiDiagnostics.ts`, `server/geminiResponse.ts`,
`tests/geminiDiagnostics.test.ts`, `tests/geminiResponse.test.ts`,
`scripts/diagnose-gemini-request.ts`, and this report. Diagnostic/test artifacts
are ignored. The manual script requires `--live-once`; do not run it again as
part of automated testing.
