# Waypoint Live QA Chrome bridge

Use your existing Chrome app tab for live frontend testing. Sign in yourself, authorize one tab, then run DOM audits, inspect an explicitly requested screenshot, click safe controls, change desktop/mobile viewport, record safe click journeys and replay them. Your app source code and login credentials are not needed.

## Install the developer build

1. Extract `waypoint-runner.zip` into a permanent folder. Keep its `waypoint-runner` folder intact.
2. Use desktop Google Chrome 120 or newer. Open `chrome://extensions` and enable **Developer mode**.
3. Click **Load unpacked** and choose the extracted `waypoint-runner` folder (the folder containing `manifest.json`).
4. Pin **Waypoint Live QA** using Chrome's extensions menu.
5. Open your app or staging website in a normal Chrome tab. Sign in manually using a test account. Do not open Chrome DevTools on the same app tab during a Waypoint session; it may detach the debugger.
6. Click the Waypoint extension on the app tab. Read and select the permissions you want to grant, then click **Authorize this app tab**. Chrome displays its debugging banner while live control is connected.
7. Copy the **extension ID** shown in the popup.
8. Open [Waypoint](https://waypoint-qa.hazyknoll5.chatgpt.site), choose **Connect**, paste the extension ID and connect. Return to your app tab and interact normally when recording; use the dashboard to audit or inspect captured evidence.

Chrome must permit unpacked extensions. Managed organization browsers may disable developer mode or debugger permissions. This development package has not been submitted to the Chrome Web Store. Safari, mobile Chrome, native Android/iOS apps and physical-device testing are not supported by this bridge.

## First smoke test with the included fixture

The kit includes `waypoint-runner/fixture`. Open a terminal in that folder and run `python3 -m http.server 8081` (Windows with Python installed: `py -m http.server 8081`). Open `http://localhost:8081/fixture.html` in Chrome, then authorize this fixture tab in the extension. Open Waypoint separately and connect using the extension ID. The fixture must run on this separate local origin; the dashboard's own origin is deliberately refused as an app target.

Run an audit, request a screenshot and switch between desktop and mobile. Check that fixture defects appear with the actual viewport. Write a journey using the fixture's visible safe navigation names and an expected visible result. Record a journey, stop recording and replay it after resetting the fixture's starting state. End the session and verify that another screenshot cannot be requested until you authorize again. Then repeat on your own staging app using test data. Keep the local fixture server running during this smoke test.

## Run a test

- Start with **Run audit**. Reports show actual observed DOM signals: horizontal overflow, visible images that failed to decode, missing control labels and responsive metadata. Small touch targets are suggestions, not automatic accessibility compliance failures.
- Change the viewport to **Mobile** or **Desktop**, then rerun the audit. This emulates browser geometry and touch events; it is not a physical phone or a different browser engine.
- Request a screenshot to inspect the currently approved tab. It may contain visible personal information. Screenshot coordinates use CSS pixels, which the dashboard maps from the preview image.
- Record a click journey, interact with safe navigation controls in the actual app tab, then stop recording. Text entered is never recorded. Add an expected visible text assertion to check the intended result.
- You can describe safe journeys with exact visible control names, such as `Click "New chat"` followed by `Expect "Choose a personality"`. Duplicate names and changed recorded labels stop the test instead of guessing.
- Replay starts from the app's current state. Put the app back in the intended starting state before running a journey. Waypoint does not reset your server data or reload sessions automatically.
- **Stop session** ends control, removes emulation overrides and detaches Chrome's debugger. Closing the app tab or navigating to another origin also stops the session. A full same-origin page navigation retains the approved session; the recorder resumes when the new main document finishes loading.

## Bring your own AI agent

The separate `waypoint-agent-kit.zip` download contains `server.mjs` and `README.md`: a local MCP server for any agent that supports MCP stdio tools. It exposes the same authorized session capabilities as the dashboard. It does not include a model, store provider API keys or create an autonomous agent for you.

1. Extract `waypoint-agent-kit.zip`, install Node.js 20 or newer and follow its `README.md` to add `server.mjs` to your MCP client.
2. Start the MCP server. It binds only `127.0.0.1:4242` and prints a randomly generated pairing token to stderr.
3. Authorize your app tab with the permissions you want to grant.
4. In the extension popup, paste the token into **Local bridge pairing token**, explicitly select the local AI agent consent checkbox and click **Pair local agent**.
5. Ask your agent to inspect the current app, audit it, click safe controls and assert expected visible text. Screenshots require screenshot consent, and interaction requires control consent.
6. Use **Disconnect agent** in the popup to revoke access immediately. **Stop session** also disconnects the agent. Tokens are held in Chrome's session storage and are cleared on browser restart or session stop; they are never sent to the dashboard.

Only the fixed local endpoint is permitted. The token and extension ID authenticate requests; the local bridge restricts extension origin and validates payloads. Do not share pairing tokens. An MCP tool timeout can mean an action's result is uncertain; inspect the actual app before retrying a mutating command. The server does not automatically retry mutations.

Agent stop requests use an independent control channel and interrupt an active journey before stop is acknowledged. If this control connection fails during an agent action, the session is canceled and the debugger detached. An expired or revoked local pairing must be explicitly paired again; a separate dashboard operation continues when only idle agent access is revoked.

## Scope and limitations

This is a usable developer testing foundation, not a hosted device farm or a guarantee that an app is release-ready. The dashboard alone does not control arbitrary websites; it needs this installed and authorized extension. Only one exact app origin and tab can be controlled at a time. The exact trusted dashboard origin is pinned in both the manifest and protocol validator; a fork must intentionally update both values.

Read-only audits and text assertions inspect the main document DOM, including open shadow roots for applicable audits. Cross-origin iframes and closed shadow DOM are not inspected. Visible text checks are DOM heuristics, not OCR or a full accessibility tree. Native mobile gestures, browser compatibility, performance profiling, security penetration testing, screenshots of hidden UI, authentication and CAPTCHA automation are not included.

Passwords, one-time codes, payment fields, sign-in/out, form submission, sending, purchases, file selection, downloads, publishing and destructive actions are stopped by conservative guards. Perform these actions manually in the app. This may also stop harmless controls whose names resemble sensitive actions. Client-side guards cannot infer every application's business meaning; only authorize trusted staging apps and use test data. This build does not offer a guard override.

Recording captures safe click selectors and accessible names, not typed values. The background worker persists safe steps as they occur and resumes recording after same-origin full navigation. There is a gap while a new document is loading. Replay checks each step separately, waits for loading to complete and checks the authorized origin before subsequent steps. If the document disappears before a click returns a result, replay stops with an uncertainty message; it does not assume success or retry the click. Snapshot screenshot clicks target the current page, so capture a fresh screenshot after navigation or layout changes.

Telemetry is collected only after session start. Console error arguments and exception object contents are intentionally excluded; errors are counted with generic descriptions. Failed HTTP requests include status and a URL stripped of credentials, query and fragment. Request/response bodies, cookies and headers are not stored. A report or explicitly requested screenshot may still contain personal information visible on your page. Use staging accounts and review evidence before exporting or sharing it.

The live Chrome extension must be installed and smoke-tested on the target desktop browser before releasing to users. Automated tests verify protocol guards, worker orchestration, DOM rules and fixture behavior; they do not substitute for Chrome installation, real app testing, device testing or Chrome Web Store review.

## Troubleshooting

**Dashboard reports extension unavailable:** check that the unpacked extension is enabled, copy its exact 32-character ID and use the exact dashboard URL above. The extension's external connection is intentionally restricted to this origin. A reinstalled unpacked extension may have a different ID.

**Connected bridge, no app session:** open the app tab, click the extension and authorize it. Opening the extension on the dashboard cannot authorize another tab.

**Permission or debugger errors:** close DevTools for the app tab, stop the session and reconnect. Another debugging extension may own the tab. Chrome's internal pages and the Waypoint dashboard cannot be selected as apps.

**Navigation stopped the session:** a different origin requires a new explicit authorization. Sign-in redirects should be completed manually before authorizing the final app origin.

**Agent pairing fails:** confirm your MCP server is running on `127.0.0.1:4242`, paste its current 64-character hexadecimal token, select agent consent and establish an app session first. A restarted bridge creates a new token. Only one paired extension is accepted by the local server.

**An assertion failed:** the expected text must exist visibly in the main document. Iframe text, canvas-rendered text, input values and hidden content are excluded. Use a short distinctive phrase.

See `PROTOCOL.md` for the complete message contract.
