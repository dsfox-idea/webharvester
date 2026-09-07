import { TestServer } from '../../src/test-server.ts';
import { expect, test } from './fixtures.ts';

interface FrameMark {
  url: string;
  top: boolean;
}

const readMark = (attribute: string | null): FrameMark => {
  if (!attribute) throw new Error('data-webharvester attribute missing');
  return JSON.parse(attribute) as FrameMark;
};

test.describe('live content script', () => {
  const server = new TestServer();
  let origin = '';

  test.beforeAll(async () => {
    origin = await server.start();
  });

  test.afterAll(async () => {
    await server.stop();
  });

  test('runs in the top frame, a nested http frame, and an about:blank frame', async ({ session }) => {
    const page = await session.context.newPage();
    await page.goto(`${origin}/`);

    const topMark = readMark(await page.locator('html').getAttribute('data-webharvester'));
    expect(topMark).toMatchObject({ url: `${origin}/`, top: true });

    const child = page.frameLocator('#child').locator('html');
    await expect(child).toHaveAttribute('data-webharvester', /"top":false/);
    expect(readMark(await child.getAttribute('data-webharvester'))).toMatchObject({ url: `${origin}/frame`, top: false });

    const blank = page.frameLocator('#blank').locator('html');
    await expect(blank).toHaveAttribute('data-webharvester', /"top":false/);
    expect(readMark(await blank.getAttribute('data-webharvester')).url).toBe('about:blank');

    await page.close();
  });
});
