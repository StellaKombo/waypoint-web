# Native Android and iOS adapter

Waypoint can attach to an **existing, developer-authorized Appium session** on your own machine. Web testing uses the Chrome companion; native testing uses the separate Appium adapter. Native UI interactions are real WebDriver requests, not a simulated phone preview.

This adapter does not install Appium, create sessions, install applications, type credentials, or terminate your Appium session. You must already have Appium and the appropriate UiAutomator2 (Android) or XCUITest (iOS) driver configured. Your emulator, simulator or device must be running the intended test application in an existing session.

## Attach your session

In the extracted `waypoint-agent-kit` folder, set these environment variables before starting the Waypoint agent bridge:

```bash
export WAYPOINT_APPIUM_URL=http://127.0.0.1:4723
export WAYPOINT_APPIUM_SESSION_ID=your-existing-session-id
export WAYPOINT_NATIVE_PLATFORM=Android
export WAYPOINT_NATIVE_APP_ID=com.example.yourtestapp
node server.mjs
```

Use `iOS` and the bundle identifier for an iOS session. `WAYPOINT_NATIVE_APP_ID` is optional when the session advertises an app package or bundle identifier; clicks, scrolling and report generation require a known app identity. The adapter pins the initial identity and rejects later capability changes. It checks Android UI package identities when available, including identities obtained from session capabilities. Appium 1 style base paths are accepted, for example `http://127.0.0.1:4723/wd/hub`. Only loopback HTTP addresses (`127.0.0.1`, `localhost`, `[::1]`) are accepted. Credentials in the URL and redirects are rejected. Do not expose Appium publicly.

When running from the complete source project rather than the extracted agent kit, use `node agent-bridge/server.mjs` from the project root.

Complete sign-in and sensitive actions directly on the test device. Only use test data you are authorized to expose to the connected AI agent. Secure and editable input nodes are omitted from UI observations, but ordinary visible text and screenshots can contain personal information. Screenshots are not automatically redacted.

## Adapter API

```js
import { createNativeAdapter } from './native-adapter.mjs';
const native = createNativeAdapter();
native.status(); // Configuration status; does not prove a live connection.
await native.execute({ action: 'observe' });
await native.execute({ action: 'clickText', text: 'Settings' });
await native.execute({ action: 'assertText', text: 'Notification preferences' });
await native.execute({ action: 'scroll', direction: 'down' });
await native.execute({ action: 'screenshot' });
await native.execute({ action: 'replay', steps: [
  { action: 'clickText', text: 'Settings' },
  { action: 'assertText', text: 'Notification preferences' }
] });
await native.execute({ action: 'stop' }); // Leaves the Appium session running.
```

The UI or agent can express instructions in ordinary language; the execution layer accepts the bounded structured steps above. Neither YAML authoring nor an arbitrary JavaScript execution endpoint is required. A connected language-model agent must translate the user's instructions into these steps; this adapter itself is not a language model.

`observe` returns visible UI labels, types, geometry, enabled state and native target identity. Exact text clicks require one unique visible control, a driver-resolved element, and matching current geometry. Labels such as Sign in, Sign out, Pay, Send, Delete, Reset, Confirm, Allow and Submit require manual interaction. Screens containing secure/authentication/payment inputs also require manual interaction. These checks reduce accidental actions; they do not make arbitrary third-party app interactions universally safe.

Before a click, the adapter samples the target rectangle twice, at least 100 milliseconds apart. If it changes by more than two pixels or differs from the observed UI rectangle, the click is refused so a moving modal cannot silently receive a stale target action. This checks target geometry, not every kind of visual animation or app readiness.

Each driver request has a 10-second deadline. A whole command is limited to 30 seconds and a whole replay to five minutes, including observation and stability checks. These are cumulative limits: successful but slow requests cannot keep a journey running indefinitely. To adjust them, set `WAYPOINT_NATIVE_OPERATION_TIMEOUT_MS` or `WAYPOINT_NATIVE_REPLAY_TIMEOUT_MS` before starting the bridge; each must be an integer between 1 and 300000 milliseconds. Programmatic integrations can pass `operationTimeoutMs` and `replayTimeoutMs` to `createNativeAdapter`. A runner deadline creates a review item, leaves later steps untested, and is not classified as an application defect. A command already submitted to Appium may still complete on the device after the client aborts; inspect the device before retrying a timed-out interaction.

`replay` runs at most 50 steps, stops on the first failed or blocked step and returns a native report compatible with dashboard import. Reports require an app identifier from the attached session capabilities or `WAYPOINT_NATIVE_APP_ID`; an unknown identity produces an explicit error before replay interactions:

```json
{
  "schema": "waypoint.report.v1",
  "schemaVersion": 1,
  "id": "native-example-run",
  "createdAt": "2026-10-11T16:00:00.000Z",
  "title": "Native Android journey: com.example.yourtestapp",
  "target": { "kind": "native", "platform": "android", "appId": "com.example.yourtestapp" },
  "viewport": { "width": 360, "height": 800 },
  "checks": [{ "name": "Step 1: assertText Settings", "status": "passed", "detail": "Command completed against the attached Appium session." }],
  "findings": [],
  "mode": "native-attached-session",
  "status": "passed",
  "results": [{ "index": 0, "status": "passed", "result": { "ok": true } }],
  "coverage": { "realDeviceVerified": false, "note": "This report describes only commands against the attached session." }
}
```

`realDeviceVerified: false` means Waypoint does not certify whether your attached session is a physical device, emulator or simulator. Observed assertions and actions still reflect responses from your attached Appium session. A stop aborts the current client request and blocks subsequent commands until the bridge restarts. Closing the bridge or ending MCP input also stops native execution and discards queued native work. An already submitted driver action may finish; stop does not physically interrupt the device or terminate its Appium session.

Missing expected visible text is reported as an observed assertion failure. Ambiguous controls, driver errors, and manual-only steps are review items; they are not automatically classified as app defects. Unexecuted steps are marked not tested. Android controls with a different package identity from the configured or detected app are blocked. On iOS, advertised session capabilities identify the configured application but do not prove the current foreground app; keep the test app in front and supervise the session.

## Verification and limits

Run `node --test tests/native-adapter.test.mjs`. The tests exercise actual HTTP requests against a local mock WebDriver server, including observed geometry, blocked actions, duplicate targets, secure-field redaction, timeouts, stop behavior and report results. No Android or iOS device was available during development, so physical-device and emulator smoke testing remains necessary before claiming native production certification.

The current native adapter supports observation, PNG screenshots, exact-label clicking, exact-label assertions, vertical touch scrolling, bounded replay and cooperative stop. It does not provide arbitrary coordinate taps, credential entry, complex gestures, mobile browser contexts, session creation, device provisioning, app lifecycle management or image-only element recognition. Native custom views without usable accessibility labels require manual interaction.

Official protocol and setup references:

- https://appium.io/docs/en/latest/reference/api/webdriver/
- https://appium.io/docs/en/latest/quickstart/
- https://github.com/appium/appium-uiautomator2-driver
- https://github.com/appium/appium-xcuitest-driver
