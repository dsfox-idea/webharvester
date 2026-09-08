# background

**Permission string:** `background`
**API namespace:** capability permission — no dedicated `chrome.*` namespace

## Interface (official)

Makes Chrome start up early (as soon as the user logs into their computer, before they launch Chrome), and shut down late (even after its last window is closed, until the user explicitly quits Chrome).

## What it's for (broad)

Keep the browser process (and the extension) alive early at login and late after the last window closes. Broadly: run an always-on local agent, a sync daemon, a message relay, or a watchdog that must not miss events while no window is open.
