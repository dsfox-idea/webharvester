import { promises as dns } from 'node:dns';
import { isIP } from 'node:net';

/** Whether a host name is known not to exist. */
export interface HostProbe {
  missing(host: string): Promise<boolean>;
}

type Query = (host: string) => Promise<unknown>;

/**
 * Tells in a fraction of a second that a host name does not exist, which Growser never reports: its tab stays
 * loading until web_fetch gives up after 20 s. Measured on Windows: a DNS query answers NXDOMAIN in about 60 ms,
 * the system resolver (getaddrinfo) in 11 s. Only NXDOMAIN counts, and only if the system resolver has found
 * nothing in the meantime (a name from the hosts file resolves there at once); any other answer, a DNS failure,
 * an IP address or a local name lets the page load as before.
 */
export class HostCheck implements HostProbe {
  static readonly queryTimeoutMs = 1_500;
  static readonly lookupGraceMs = 500;

  private readonly query: Query;
  private readonly lookup: Query;

  constructor(query?: Query, lookup: Query = (host) => dns.lookup(host)) {
    const resolver = new dns.Resolver({ timeout: HostCheck.queryTimeoutMs, tries: 1 });
    this.query = query ?? ((host) => resolver.resolve4(host));
    this.lookup = lookup;
  }

  async missing(host: string): Promise<boolean> {
    const name = host.replace(/^\[(.*)\]$/, '$1');
    if (isIP(name) || !name.includes('.') || /\.(local|localhost)$/i.test(name)) return false;
    const found = this.lookup(name).then(
      () => true,
      () => false,
    );
    try {
      await this.query(name);
      return false;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOTFOUND') return false;
    }
    const grace = new Promise<boolean>((resolve) => setTimeout(() => resolve(false), HostCheck.lookupGraceMs));
    return !(await Promise.race([found, grace]));
  }
}
