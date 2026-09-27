import { expect, test } from '@playwright/test';
import { HostCheck } from '../../plugin/server/host-check.ts';

const failing = (code: string) => async (): Promise<never> => {
  throw Object.assign(new Error(code), { code });
};
const resolving = async (): Promise<string[]> => ['192.0.2.1'];
const pending = (): Promise<never> => new Promise(() => undefined);

test.describe('HostCheck', () => {
  test('reports a host that DNS calls nonexistent and the system resolver does not find', async () => {
    expect(await new HostCheck(failing('ENOTFOUND'), pending).missing('no-such.example')).toBe(true);
    expect(await new HostCheck(failing('ENOTFOUND'), failing('ENOTFOUND')).missing('no-such.example')).toBe(true);
  });

  test('lets the page load when the host exists, DNS fails otherwise, or the system resolver finds it', async () => {
    expect(await new HostCheck(resolving, pending).missing('docs.example')).toBe(false);
    for (const code of ['ENODATA', 'ETIMEOUT', 'ESERVFAIL', 'ECONNREFUSED']) {
      expect(await new HostCheck(failing(code), pending).missing('docs.example'), code).toBe(false);
    }
    expect(await new HostCheck(failing('ENOTFOUND'), resolving).missing('myapp.test'), 'a name from the hosts file').toBe(false);
  });

  test('asks nothing about IP addresses and local names', async () => {
    const asked: string[] = [];
    const record = async (host: string): Promise<never> => {
      asked.push(host);
      throw Object.assign(new Error('ENOTFOUND'), { code: 'ENOTFOUND' });
    };
    for (const host of ['192.0.2.1', '[::1]', 'localhost', 'intranet', 'printer.local', 'app.localhost']) {
      expect(await new HostCheck(record, record).missing(host), host).toBe(false);
    }
    expect(asked).toEqual([]);
  });
});
