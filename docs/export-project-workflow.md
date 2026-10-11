# Export dialog and independent projects

## Root causes

ExportModal was mounted inside TopBar, whose `backdrop-blur-md` creates a containing block for fixed descendants. Its `fixed inset-0` overlay therefore inherited the toolbar bounds rather than the browser viewport, centering a tall card against a 44px header. The whole card also scrolled with its footer inside the content and used a 90vh limit without reserving backdrop padding.

Project state had one module-level session snapshot and a constant `current-design` identity. There was no independent creation or switching operation. Generation had an edit fingerprint but no project lifetime identifier, so a late response or error could affect another project.

## Implementation

- `src/workspace/components/Dialog.tsx`: body portal, viewport-constrained flex dialog, separately scrolling body, fixed header/footer, background inert/scroll lock, focus trap/restoration and Escape.
- `ExportModal.tsx`: uses Dialog, keeps actual existing image/JSON/project-export operations; footer remains outside the scrolling body. JSON includes project identity.
- `NewProjectModal.tsx`: project name and Website/Mobile App selection; creates an actual empty schema screen and authoring tokens.
- `TopBar.tsx`, `ProjectMenu.tsx`, `NewScreenModal.tsx`: reachable creation/switching menu, one dropdown instance, reusable dialog for project and screen management. Duplicate now copies independently.
- `src/workspace/store.tsx`, `types.ts`: UUID identities, independent in-memory project snapshots, creation/open/duplicate/delete, default web/mobile dimensions, reset history/selection/UI, request epoch and abort guards including render review and stale finally/error paths.
- `WorkspaceLayout.tsx`, `ChatPanel.tsx`: remount project-specific editor controls on project changes; suppress background editing shortcuts while dialogs are open.
- `src/design/api.ts`: optional caller cancellation combined with existing request timeout.
- `src/home/store.tsx`, `components/Sidebar.tsx`: actual session project list, opening real project snapshots, New Project entry, consistent rename/delete/duplicate.
- `tests/projects.test.tsx`, `tests/projectHarness.tsx`, `scripts/check-project-workflow.ts`: deterministic integration and actual Chrome acceptance coverage.

## Verification

Chrome acceptance checks actual rendered dialogs at 1920x911, 1280x720, 800x600, 390x640, 320x320 and 640x240. Bounds, footer button hit testing, body portal, scrolling content, body lock, Escape and Tab wrap pass. A real mouse click downloads the new project's JSON including the correct project ID and edited component properties.

Website/mobile creation, previous document preservation, separate IDs, editing, undo/redo and actual prototype screen navigation pass. Browser first-generation tests use an isolated deterministic API response and the actual render-review/publish pipeline; this change does not claim a new live Gemini generation was run. Unit tests additionally hold an old request across project creation and a concurrent new request: abort is signalled and old success/finally cannot publish or clear the new generation. Provider remount restores the independent session document.

Image export acceptance passes direct PNG/JPEG and all-screen ZIP variants, full 3800px content, alpha/JPEG background, mobile dimensions, fonts/assets/icons, unchanged source state, useful asset failures, JSON and the existing project-export behavior. Evidence: `artifacts/projects/results.json`, `export-modal.png`, and `artifacts/image-export/latest-run.json`.

Typecheck passed; automated tests passed 39/39; production build passed (existing nonfatal Zod annotation warnings). The separate canvas regression passed scrolling, selection, zoom/Fit, device changes, token/property editing and undo/redo. The dispatch wrapper uses a stable callback so existing initialization effects do not rerun on every editor action.

## Existing limitations

Project documents remain client-memory session data. Browser refresh or tab closure loses them; JSON export provides a backup. No database or new persistent storage was introduced.

Website/React Native project export still downloads the existing `.zip-placeholder.txt` stating code generation is unavailable. A deployable source ZIP was not implemented by this layout/project-management change. The Files panel retains existing behavior; blank authoring documents do not invent generated source-code files.
