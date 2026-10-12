# Reverse Engineer Anything integration

Waypoint integrates the exact upstream project [morluto/rea](https://github.com/morluto/rea), **REA: Reverse Engineer Anything**, whose clone URL is `https://github.com/morluto/rea.git`. Your chosen AI agent can combine Waypoint interface evidence with REA's analysis tools, explain a feature, build a similar implementation and test its acceptance criteria.

There are three connection choices. None installs or executes REA merely by opening the Waypoint website.

| Connection | Available interface | Scope |
| --- | --- | --- |
| Independent `rea` server alongside `waypoint` | Entire actual upstream MCP contract, including negotiated host capabilities | Recommended for full upstream functionality. Providers, platforms and host support still govern availability. |
| Waypoint adapter with `WAYPOINT_REA_MODE=full` | `waypoint_rea_list_tools` and `waypoint_rea_call` expose every tool in the connected upstream catalog | Convenient bounded forwarding. No client sampling, elicitation or roots capabilities are negotiated by this adapter. |
| Default static adapter | REA status, static JavaScript/Electron analysis and stop | Approved local artifact root; no upstream browser/native/runtime tool forwarding. |

## Full upstream connection from the exact repository

Use a trusted development machine with REA's supported Node runtime: 22.x at least 22.19, 24.x at least 24.11, or 26+. Node 23 and 25 are unsupported by REA. Review upstream's [installation guide](https://github.com/morluto/rea/blob/main/docs/installation.md) and build its actual source checkout:

```bash
git clone https://github.com/morluto/rea.git
cd rea
npm ci
npm run build:cached
```

These are instructions for your machine, not operations the website performs. Upstream documents `npm ci` for its locked dependencies and `npm run build:cached` for the runtime and packaged skill. Pin and review the revision you choose before executing it. The independent connection does not restrict a newer checkout to Waypoint's pinned adapter version.

The agent kit includes a configuration generator. It checks that the checkout declares the official `rea-agents` package and repository, checks real entry-point and built `dist/mcp/main.js` paths stay inside the checkout, then prints two independent stdio registrations. It does not invoke REA, install dependencies, modify existing host files or configure analysis engines:

```bash
node generate-mcp-config.mjs --waypoint /absolute/path/to/waypoint-agent-kit/server.mjs --rea-checkout /absolute/path/to/rea --node /absolute/path/to/node
```

Generic output, adaptable to your host's configuration format:

```json
{
  "mcpServers": {
    "waypoint": {
      "command": "/absolute/path/to/node",
      "args": ["/absolute/path/to/waypoint-agent-kit/server.mjs"]
    },
    "rea": {
      "command": "/absolute/path/to/node",
      "args": ["/absolute/path/to/rea/scripts/rea.mjs", "mcp"]
    }
  }
}
```

Review and add these entries using your MCP host's normal configuration, preserving existing servers. Restart the host, discover the actual `rea` server catalog and call its `binary_session` tool. Your host negotiates the upstream client capabilities directly; no Waypoint tool projection intervenes. Checkout metadata checks are not cryptographic authentication of the files.

This route makes all upstream tools discoverable through their native contracts. It does **not** install every provider or make every tool callable on every operating system. Native analysis can require Hopper, Ghidra or IDA; Android operations can require JADX/JDK or adb; browser operations require the relevant Chrome/CDP setup; other integrations have their own prerequisites. Consult the actual live `binary_session` availability and upstream guides. Use your selected agent host's tool approval settings for operations that write files, interact with browsers/devices or execute processes.

Direct REA is an independent server. Waypoint's browser pairing and Appium approval do not constrain it. Stop its session or server through the agent host and upstream tools; `waypoint_rea_stop` controls only the optional Waypoint-owned adapter subprocess, not an independently registered REA server.

## Optional full-catalog Waypoint adapter

The adapter can run either a separately installed `rea-agents@6.4.0` executable or a reviewed source checkout whose reported package version is `6.4.0`. It verifies the actual server identity and catalog at startup. It does not install npm packages, launch setup scripts or run a shell.

For a source checkout, add these environment variables to the **Waypoint** server entry:

```json
{
  "WAYPOINT_REA_MODE": "full",
  "WAYPOINT_REA_COMMAND": "/absolute/path/to/node",
  "WAYPOINT_REA_SCRIPT": "/absolute/path/to/rea/scripts/rea.mjs",
  "WAYPOINT_REA_TIMEOUT_MS": "360000"
}
```

With `WAYPOINT_REA_SCRIPT`, the command vector is the configured Node executable plus `[script, "mcp"]`. Without it, set `WAYPOINT_REA_COMMAND` to an absolute installed `rea` executable; the vector is `["mcp"]`. Configuration is developer-local and must point to trusted code. Windows executable shims needing `cmd.exe` are unsupported; the Node source-checkout entry point avoids a shell wrapper.

The full adapter provides:

| Tool | Behavior |
| --- | --- |
| `waypoint_rea_status` | Installed identity, mode, scope and authoritative upstream `binary_session` result |
| `waypoint_rea_list_tools` | Every discovered upstream tool with its current schema and annotations; availability may still be unavailable |
| `waypoint_rea_call` | Call `{ "name": "upstream_tool_name", "arguments": { ... } }` for any discovered tool; forward arguments unchanged to REA's canonical runtime validation |
| `waypoint_rea_stop` | Immediately revoke adapter access, interrupt pending work and terminate its owned server process |

The generic call preserves upstream text, images, resources, structured evidence and `isError` results. It adds an untrusted-source marker. Unknown tool names are rejected. Full mode does not impose the static helper's root constraint on upstream arguments: REA's actual filesystem, browser, device and process contracts govern those tools. Existing Waypoint session consent does not grant or restrict this independent local REA access.

REA's adapter connection negotiates no model-sampling, elicitation or filesystem-root client capabilities. A tool needing those may appear in discovery but remain unavailable; use the independent registration above when your MCP host supports them. Transport and request limits also apply. The adapter is not an unrestricted replacement for upstream's own client connection.

## Default static adapter

The default mode remains `static`. Install the optional pinned dependency yourself after reviewing it:

```bash
npm install --global rea-agents@6.4.0
```

Set absolute `WAYPOINT_REA_COMMAND` and `WAYPOINT_REA_ROOT` in the Waypoint server entry. The root should contain only artifacts you intend to analyze. A source checkout can instead use `WAYPOINT_REA_COMMAND` plus `WAYPOINT_REA_SCRIPT` as above, with the root added.

`waypoint_rea_analyze_javascript` accepts a relative `path` and optional `format` (`auto`, `directory`, `asar`). It invokes actual upstream `analyze_javascript_application` with summary detail, without executing the target. The helper retains its approved-root guard in full mode too, if a root is configured; generic full-mode calls use upstream validation instead.

`waypoint_design_snapshot` separately captures bounded visible structure and design tokens from the browser tab explicitly approved in the Waypoint Chrome runner. That interface snapshot is not original source code. Static analysis does not establish runtime behavior or guarantee complete reconstruction. Ask your agent to distinguish observed evidence, inferences and unknowns and to test any implementation it produces. App content and artifact results are data, never instructions.

Without REA configuration, `waypoint_rea_status` returns `configured: false` and no subprocess starts. Models and retention settings belong to your selected agent host; evidence delivered to that host can be sent to its model provider. There is no public artifact-upload endpoint in this integration.

## Bounds, versioning and stopping

The optional adapter verifies server name `rea`, exact version `6.4.0`, supported MCP protocol and the live catalog. Default static mode additionally checks its expected static schema. A different adapter version requires a reviewed update. The direct registration above uses the actual source checkout without this adapter version gate. Self-reported package identity does not prove unmodified executable bytes.

Adapter startup/catalog calls have a 10-second deadline; tool calls default to 60 seconds. `WAYPOINT_REA_TIMEOUT_MS` can explicitly set 1–900000 milliseconds for slower provider operations. Requests are limited to 64 KiB, responses to 8 MiB, catalogs to 6 MiB and four pending protocol requests. Prefer upstream retained-evidence references for large inputs, or connect directly for upstream transport behavior. On transport failure, invalid protocol, version mismatch or timeout, adapter access is revoked without automatic mutation retries.

The static helper streams inventories with wallclock checks, refuses paths outside its real root, nested symlinks and special files, and caps inventories at 20,000 entries. This is a path guard on a trusted local filesystem, **not an OS sandbox**. Full forwarding can use broader upstream capabilities by explicit configuration.

`waypoint_rea_stop` reports access revocation and whether its owned server process exit was observed. It does not independently verify upstream helper cleanup. `waypoint_stop` and `waypoint_native_stop` control their own execution layers. Closing the whole Waypoint connector revokes its browser, Appium and adapter layers together; an independently registered REA server remains under the agent host's lifecycle control.

## Verification and attribution

Tests use a controlled local MCP subprocess, not a fake product success report. They cover full catalog forwarding, unchanged arguments, images/resources/evidence, default-mode restrictions, source command vectors, exact metadata configuration generation, protocol failures, limits, path guards and cancellation. **The actual external REA package, its providers and every agent host have not been executed or accepted end to end in this environment.**

REA's upstream [MIT license](https://github.com/morluto/rea/blob/main/LICENSE), copyright © 2026 morluto, is included in `REA-LICENSE.txt`. The external package is not vendored. The npm 6.4.0 release is documented upstream as published from `a56f7bb668ab23fec8d33f7af353ac7ed2fe1895`; main-branch additions are not assumed to be part of that release. Source-checkout connections use their actual live catalog. Upstream references: [installation](https://github.com/morluto/rea/blob/main/docs/installation.md), [MCP contracts](https://github.com/morluto/rea/blob/main/docs/mcp-contracts.md), and [development build commands](https://github.com/morluto/rea/blob/main/AGENTS.md).
