import type { CatalogEntry, FeatureAlternative } from './catalog.ts';

export type Platform = 'chromeos' | 'linux' | 'mac' | 'win' | 'desktop_android' | 'fuchsia';
/** version_info::Channel order: UNKNOWN(0) < CANARY < DEV < BETA < STABLE(4). */
export type Channel = 'unknown' | 'canary' | 'dev' | 'beta' | 'stable';
/** mojom::ManifestLocation, reduced to what an install can be. */
export type InstallLocation = 'unpacked' | 'webstore' | 'component' | 'external_component' | 'policy';
export type SessionType = 'regular' | 'kiosk' | 'autolaunched_kiosk';

export interface Environment {
  platform: Platform;
  channel: Channel;
  manifestVersion: number;
  location: InstallLocation;
  sessionType: SessionType;
  /** Command-line switches present on the browser process, without leading dashes. */
  commandLineSwitches: readonly string[];
  /** base::Feature names known to be enabled. Unknown flags count as disabled. */
  featureFlags: readonly string[];
}

export type UnavailableReason =
  | 'platform'
  | 'channel'
  | 'command-line-switch'
  | 'feature-flag'
  | 'session-type'
  | 'allowlist'
  | 'location'
  | 'min-manifest-version'
  | 'max-manifest-version'
  | 'dependency';

export interface Verdict {
  available: boolean;
  reason?: UnavailableReason;
  detail?: string;
}

/**
 * Re-implements the subset of extensions/common/features/simple_feature.cc that
 * decides whether a declared permission is granted to an installed extension:
 * SimpleFeature::GetEnvironmentAvailability, then GetManifestAvailability, then
 * dependencies; ComplexFeature returns the first available alternative, else
 * the first alternative's verdict.
 */
export class AvailabilityRules {
  static readonly channelRank: Readonly<Record<Channel, number>> = {
    unknown: 0,
    canary: 1,
    dev: 2,
    beta: 3,
    stable: 4,
  };

  private readonly env: Environment;

  constructor(env: Environment) {
    this.env = env;
  }

  get environment(): Environment {
    return this.env;
  }

  /** Playwright's bundled Chrome for Testing / Chromium: no Keystone id, so the channel is UNKNOWN. */
  static chromeForTesting(overrides: Partial<Environment> = {}): Environment {
    return {
      platform: AvailabilityRules.hostPlatform(),
      channel: 'unknown',
      manifestVersion: 3,
      location: 'unpacked',
      sessionType: 'regular',
      commandLineSwitches: [],
      featureFlags: [],
      ...overrides,
    };
  }

  static hostPlatform(): Platform {
    switch (process.platform) {
      case 'darwin':
        return 'mac';
      case 'win32':
        return 'win';
      case 'linux':
        return 'linux';
      default:
        throw new Error(`Unsupported host platform ${process.platform}`);
    }
  }

  evaluate(entry: CatalogEntry): Verdict {
    const verdicts = entry.alternatives.map((alternative) => this.evaluateAlternative(alternative));
    return verdicts.find((verdict) => verdict.available) ?? verdicts[0];
  }

  evaluateAlternative(alternative: FeatureAlternative): Verdict {
    return (
      this.environmentAvailability(alternative) ??
      this.manifestAvailability(alternative) ??
      this.dependencyAvailability(alternative) ?? { available: true }
    );
  }

  private environmentAvailability(alternative: FeatureAlternative): Verdict | undefined {
    if (alternative.platforms && !alternative.platforms.includes(this.env.platform)) {
      return AvailabilityRules.unavailable('platform', alternative.platforms.join(', '));
    }
    if (alternative.channel && !this.channelAllows(alternative.channel)) {
      return AvailabilityRules.unavailable('channel', alternative.channel);
    }
    if (alternative.command_line_switch && !this.env.commandLineSwitches.includes(alternative.command_line_switch)) {
      return AvailabilityRules.unavailable('command-line-switch', alternative.command_line_switch);
    }
    if (alternative.feature_flag && !this.env.featureFlags.includes(alternative.feature_flag)) {
      return AvailabilityRules.unavailable('feature-flag', alternative.feature_flag);
    }
    if (alternative.session_types && !alternative.session_types.includes(this.env.sessionType)) {
      return AvailabilityRules.unavailable('session-type', alternative.session_types.join(', '));
    }
    return undefined;
  }

  private manifestAvailability(alternative: FeatureAlternative): Verdict | undefined {
    if (this.env.location === 'component') return undefined; // component extensions get everything
    if (alternative.allowlist && alternative.allowlist.length > 0) {
      return AvailabilityRules.unavailable('allowlist', `${alternative.allowlist.length} allowlisted ids`);
    }
    if (alternative.location && !this.locationMatches(alternative.location)) {
      return AvailabilityRules.unavailable('location', alternative.location);
    }
    if (alternative.min_manifest_version !== undefined && this.env.manifestVersion < alternative.min_manifest_version) {
      return AvailabilityRules.unavailable('min-manifest-version', String(alternative.min_manifest_version));
    }
    if (alternative.max_manifest_version !== undefined && this.env.manifestVersion > alternative.max_manifest_version) {
      return AvailabilityRules.unavailable('max-manifest-version', String(alternative.max_manifest_version));
    }
    return undefined;
  }

  private dependencyAvailability(alternative: FeatureAlternative): Verdict | undefined {
    // The only dependencies permission features declare are `behavior:` ones
    // (e.g. imprivata_extension), which are satisfied by allowlisted ids only.
    const behaviors = (alternative.dependencies ?? []).filter((dependency) => dependency.startsWith('behavior:'));
    if (behaviors.length > 0) return AvailabilityRules.unavailable('dependency', behaviors.join(', '));
    return undefined;
  }

  private channelAllows(required: NonNullable<FeatureAlternative['channel']>): boolean {
    if (this.env.commandLineSwitches.includes('enable-experimental-extension-apis')) return true;
    const requiredRank = required === 'trunk' ? 0 : AvailabilityRules.channelRank[required];
    return requiredRank >= AvailabilityRules.channelRank[this.env.channel];
  }

  private locationMatches(required: NonNullable<FeatureAlternative['location']>): boolean {
    switch (required) {
      case 'component':
        return this.env.location === 'component';
      case 'external_component':
        return this.env.location === 'external_component';
      case 'policy':
        return this.env.location === 'policy';
      case 'unpacked':
        return this.env.location === 'unpacked';
    }
  }

  private static unavailable(reason: UnavailableReason, detail: string): Verdict {
    return { available: false, reason, detail };
  }
}
