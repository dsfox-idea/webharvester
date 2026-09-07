import { ProbeRegistry } from './registry.js';
import { chromeCall } from './chrome-call.js';

/** Runs every probe against the live extension and produces a serializable report. */
export class ProbeRunner {
  async run() {
    const manifest = chrome.runtime.getManifest();
    const granted = await chromeCall(chrome.permissions.getAll);
    const grantedSet = new Set(granted.permissions ?? []);
    const probes = ProbeRegistry.forPermissions(manifest.permissions ?? []);

    const results = [];
    for (const probe of probes) {
      results.push(await probe.run(grantedSet));
    }

    return {
      extensionId: chrome.runtime.id,
      manifestVersion: manifest.manifest_version,
      userAgent: navigator.userAgent,
      ranAt: new Date().toISOString(),
      declared: [...(manifest.permissions ?? [])],
      granted: [...grantedSet].sort(),
      grantedOrigins: [...(granted.origins ?? [])].sort(),
      results,
    };
  }
}
