# FRAME Firebase Authentication â€” Step 1

The current checkout (`fe14e72`) reverted `firebase done locally` (`062609c`). It had no Firebase SDK, auth provider, route protection, or real logout. The earlier implementation also defaulted to workspace and initialized Analytics; this implementation corrects those behaviors.

## Files and configuration

- `src/auth/firebase.ts`: supplied public web configuration for `frame-44bbd`, single default app with configuration validation, official Firebase Auth adapter. Only app and auth SDK modules are imported.
- `src/auth/store.ts`: one page-lifetime auth observer, initial restoration, popup sign-in, redirect fallback/recovery, friendly errors, duplicate prevention, and Firebase logout.
- `src/auth/AuthProvider.tsx`: reusable provider and `useAuth`, exposing user, UID, status, busy, error, signIn, and logout.
- `src/main.tsx` and `src/App.tsx`: provider integration and protected hash routes.
- Existing CTA components, account settings, and logout confirmation are wired to Firebase without changing their visual design.

No Firebase environment file is required: the exact supplied configuration lives in `src/auth/firebase.ts`. Existing environment settings are for AI generation and remain untouched. No Admin keys or service accounts are used. Firebase 12.10.0 supports the installed Node 22 runtime.

## Navigation

Start Designing and Sign in explicitly open Google popup authentication with `prompt: select_account`, including when Firebase has restored an existing session. These CTA clicks request `forcePopup: true` so the previous session shortcut cannot send the visitor straight to home. Successful authentication navigates to `#home`; cancellation keeps the existing session and current page. Workspace continues to open through the existing home generation flow. Programmatic signIn without forcePopup still supports the normal authenticated navigation shortcut.

Navbar, Hero, final CTA, and About Start Designing actions use `AuthButton`: a native `button` with `type="button"`, no home href, and native disabled state. Their existing classes and children are retained. The remaining template-card AuthLink has a neutral href. Native link navigation cannot bypass Firebase and send these CTAs to home. Open `http://localhost:5173/` to test the landing CTA; opening `#home` directly still restores a valid existing session by design.

Direct signed-out visits to home/workspace wait for initial auth resolution, then replace the private URL with the landing URL. The intended route is remembered in sessionStorage. Explicit `signIn('#workspace')` supports deliberate recovery, but Start Designing always overrides the destination to home. Refresh restores the session without navigating away. Hash navigation and browser history remain supported.

Blocked or unsupported popup authentication falls back to Firebase redirect with a remembered destination. Closed/cancelled popups display a retry message. Redirect errors do not disable subsequent auth observations. Logout uses Firebase signOut and returns to landing.

## Manual Console checks â€” not verified here

Open [Firebase Console](https://console.firebase.google.com/project/frame-44bbd/authentication/providers) and verify Google is enabled. The user reports enabling it, but this session has no authenticated Console access.

The live Firebase public project configuration endpoint was checked: authorized domains include `localhost`, `frame-44bbd.firebaseapp.com`, and `frame-44bbd.web.app`. No localhost change is needed. Add the actual production hostname when deploying. Run `npm run dev` and use its localhost URL; do not open the build using file://.

The supplied authDomain differs from localhost and most production hosts. Browsers blocking third-party storage can prevent redirect completion. Follow [Firebase redirect deployment guidance](https://firebase.google.com/docs/auth/web/redirect-best-practices) for a supported same-domain Hosting, proxy, or self-host configuration. Adding an authorized domain alone does not solve storage restrictions. Popup is the normal desktop path. No hosting/domain settings were changed here.

See [Google authentication SDK documentation](https://firebase.google.com/docs/auth/web/google-signin).

## Verification

Automated tests mock Firebase; they do not prove live authentication. Coverage includes exact configuration/single app, loading, one observer, successful sign-in, existing CTA navigation to home, restored-user navigation, protected routes, logout/failure, sanitized errors, refresh, popup fallback, and redirect recovery/failure. Run `npm test`, `npm run typecheck`, and `npm run build`.

Start Designing calls the popup SDK synchronously from the click once restoration is resolved, with a fresh GoogleAuthProvider per attempt. Both new and returning Google users use the same Firebase sign-in API; the returned User and UID are retained unchanged. No separate account creation, email-based profile lookup, or generated replacement UID is used. A different-provider account collision displays an error instead of attempting to create another account.

`tests/startDesigning.test.tsx` renders the actual App and Hero CTA and spies at the Firebase SDK boundary. It covers new and returning user responses, synchronous popup invocation, fresh providers, duplicate clicks, loading, network error and retry, original Firebase UID preservation, home navigation, and already-authenticated navigation. This is mocked verification, not live Google authentication.

Verification result: all 87 tests passed, TypeScript checks passed, and the production build passed.

Live browser verification on `http://localhost:5173/`: the actual navbar and Hero Start Designing CTAs each opened the real Google sign-in screen at accounts.google.com for `frame-44bbd.firebaseapp.com`. Both displayed Connecting Google, disabled further submission, stayed on the landing route before authentication, and displayed a cancellation message after the popup was closed. No browser page errors occurred. Screenshots and the repeatable Playwright check are in `artifacts/auth-browser/` (ignored by Git).

A complete Google login and returned live UID have NOT been verified: no Google credentials were entered. Manual acceptance still needed: complete Google login, confirm home and actual identity in account settings, refresh, generate a design to enter workspace, log out, and verify private links return to landing. Console Google-provider enablement has not been independently inspected.

Dependency audit reports 9 vulnerabilities (8 high, 1 low) in tooling and the Firebase package's unused transitive Firestore/gRPC modules. The official umbrella SDK installs Firestore transitively; FRAME never imports or initializes it. No broad dependency upgrades were performed. Existing Zod annotation warnings do not fail the build.

No Firestore, Storage, Analytics, billing changes, user/project documents, or persistence were implemented. AI generation, model settings, design schema, and editor state were preserved. No Git commit or push was performed.
