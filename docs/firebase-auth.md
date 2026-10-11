FRAME uses Firebase's modular Google Authentication SDK with the supplied public web configuration for project `frame-44bbd`. `firebase@12.10.0` supports the installed Node 22 runtime. Only App, Auth and optional Analytics modules are imported; no database or server credentials are added.

The existing Start Designing and Sign in links open Google sign-in, then `#workspace`. Restored users skip the popup. One page-lifetime `onAuthStateChanged` listener restores the session, including under React StrictMode. Initial route access waits for both auth restoration and redirect-result processing. Firebase's default browser persistence remains in effect. Firebase initializes the default app once and refuses an existing default app belonging to another project.

Popup authentication is preferred. Blocked popups and unsupported popup environments use Firebase redirect authentication. Only `#home` or `#workspace` can be stored as a return destination in sessionStorage. Cancelled/failed sign-in stays outside the workspace, displays a safe message, and allows another attempt. Duplicate requests are prevented. The existing logout confirmation calls Firebase signOut; a failed logout retains the user/session. Account settings show the actual Firebase display name and email as read-only values. `useAuth()` exposes the authenticated Firebase UID, name, email and photo URL; it never fabricates a UID.

Required manual Firebase Console setup (not verified by this implementation):

1. Open the **frame-44bbd** Firebase project. Under Authentication → Sign-in method/providers, enable **Google**, set the required project support email, and save.
2. Under Authentication → Settings → Authorized domains, explicitly verify/add `localhost` and the actual deployed FRAME hostname. Add `127.0.0.1` only if testing through that hostname. Do not assume localhost is automatically enabled for newer projects.
3. Confirm the web app matches the supplied app ID and authDomain `frame-44bbd.firebaseapp.com`; verify API-key application restrictions permit the intended domains and Firebase Authentication.
4. For deployment outside Firebase Hosting, review Firebase's redirect best practices. Modern browsers can block the cross-origin auth helper's storage access. Configure a supported same-origin auth-helper/proxy or Firebase Hosting arrangement before relying on redirect fallback; merely adding an authorized domain does not solve that storage restriction. Do not change authDomain to an unrelated host without setting up the helper and authorized OAuth redirect URI.
5. Run FRAME, click Start Designing, sign in with Google, confirm `#workspace`, refresh to verify restoration, and use the existing home logout action. Check cancelled popup and direct `#workspace` access while signed out.

Official setup: [Google sign-in](https://firebase.google.com/docs/auth/web/google-signin), [redirect deployment requirements](https://firebase.google.com/docs/auth/web/redirect-best-practices).

No additional environment variables are required: the supplied Firebase web config lives in `src/auth/firebase.ts`. Those web identifiers are public browser configuration, not a service-account key. Existing server-only Gemini environment variables and configuration remain unchanged. Never place a service-account private key in this frontend or any `VITE_` variable.

This task adds browser authentication and client route protection. It does not add server-side Firebase ID-token verification to `/api/design`, database project storage, per-user local-project ownership or account migration. Existing project session behavior remains unchanged; this is not backend authorization or per-account data isolation.

Verification uses mocked Firebase adapters and a JSDOM test of the actual App/CTA/protected routes. No live Google account sign-in or Firebase Console configuration has been verified. No live Gemini calls are used by the tests.
