# Official Gemini routing audit — 11 October 2026

FRAME now calls only the official Google Gemini adapter. The existing server
environment retains `GEMINI_MODEL=gemini-3.8-flash` and `GEMINI_API_KEY`; the key
was neither printed nor changed. No global environment, Claude or Codex settings
were modified.

Before removal, the development-local environment selected an alternative
provider through the shared provider factory. All generation stages used that
factory. The factory and alternative adapter have now been deleted.

The current path is browser `/api/design` → `server/gemini.ts` →
`generateGeminiText` in `server/geminiResponse.ts` →
`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent`.
Analysis, planning, draft, JSON review, selected-screen modifications and
browser-rendered corrections share this path. Gemini's original structured
requests, prompts, retries, deadline/cancellation handling and all downstream
validators remain unchanged. Other credential/provider variables cannot select
another adapter; missing Gemini configuration fails before any upstream call.

Verification:

- Offline route tests mocked six successful Google responses and asserted the
  exact endpoint, model, Google authentication header, structured schemas and
  ordered stage diagnostics. They deliberately injected obsolete provider
  variables and verified that those values cannot redirect requests.
- Missing Google credentials fail with CONFIGURATION even when other synthetic
  credentials are present. Selected-screen isolation remains enforced.
- Full `npm test`: 66/66 passed. `npm run typecheck`: passed.
  `npm run build`: passed, with existing nonfatal Zod annotation warnings.
- The previous workspace development server was stopped and restarted on port
  5173. A local empty-prompt request returned HTTP 400 with `X-FRAME-Provider:
  gemini` and `X-FRAME-Model: gemini-3.8-flash`, before upstream generation.
  Evidence: `artifacts/gemini-only-runtime.json` and `gemini-only-tests.log`.
- No live provider calls occurred. Live model availability is not verified.

Files changed:

- Updated `server/gemini.ts`, `.env.example`, and `README.md`.
- Added `tests/geminiRouting.test.ts` and this routing report.
- Removed the obsolete local `.env.development.local` override (comments only
  after its provider entries were removed).
- Deleted `server/generationProvider.ts`, `server/tokenharbor.ts`,
  `scripts/check-tokenharbor.ts`, `tests/providerRuntime.test.ts`,
  `tests/tokenharbor.test.ts`, `tests/tokenharborDiagnostics.test.ts`,
  `tests/tokenharborCompletion.test.ts`, `docs/tokenharbor-provider.md`,
  `docs/tokenharbor-json-diagnosis.md`, and `docs/provider-runtime-diagnosis.md`.
- Deleted obsolete ignored artifacts: `artifacts/tokenharbor-setup/report.md`;
  `artifacts/provider-runtime/{tests.log,resolved.json,build.log}`;
  `artifacts/tokenharbor-compatibility/{tests.log,result.json,design.json,
  json-diagnostics-tests.log,json-diagnostics-tests-isolated.log,completion-tests.log}`.
- Regenerated `dist/index.html` through the production build; saved the two
  Gemini-only verification artifacts listed above.

Legacy provider/model strings occur only in the new adversarial routing tests
and this removal manifest. They are not runtime configuration or integrations.
