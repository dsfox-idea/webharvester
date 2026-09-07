import { expect, test } from '@playwright/test';
import { NonWorkingList, type MeasuredReport } from '../../src/non-working.ts';

const report: MeasuredReport = {
  extensionId: 'id',
  manifestVersion: 3,
  userAgent: 'ua',
  ranAt: '2026-09-07T12:00:00.000Z',
  declared: ['alarms', 'wallpaper', 'dns'],
  granted: ['alarms'],
  grantedOrigins: ['<all_urls>'],
  results: [
    { permission: 'alarms', granted: true, namespace: null, conditional: null, exercise: { status: 'passed', detail: '' } },
    { permission: 'wallpaper', granted: false, namespace: null, conditional: null, exercise: { status: 'skipped', detail: '' } },
    { permission: 'dns', granted: false, namespace: null, conditional: null, exercise: { status: 'skipped', detail: '' } },
  ],
  browser: { versionLine: '26.905.1 Chromium: 153.0.8010.18', executablePath: '/Applications/Growser.app/Contents/MacOS/Growser', version: '153.0.8010.18' },
  expectations: [
    { name: 'alarms', verdict: { available: true } },
    { name: 'wallpaper', verdict: { available: false, reason: 'platform', detail: 'chromeos' } },
  ],
};

test.describe('NonWorkingList', () => {
  test('marks every not-granted permission with the predicted reason, or not-granted when there is none', () => {
    const list = NonWorkingList.fromReport(report);
    expect(list.permissions).toEqual([
      { name: 'wallpaper', reason: 'platform', detail: 'chromeos' },
      { name: 'dns', reason: 'not-granted', detail: 'not granted by the browser' },
    ]);
    expect(list.measuredIn).toEqual({
      versionLine: '26.905.1 Chromium: 153.0.8010.18',
      executablePath: '/Applications/Growser.app/Contents/MacOS/Growser',
      chromiumVersion: '153.0.8010.18',
      measuredAt: '2026-09-07T12:00:00.000Z',
    });
  });

  test('refuses a report without measurements', () => {
    expect(() => NonWorkingList.fromReport({ ...report, expectations: undefined })).toThrow(/run the live tests first/);
  });

  test('is empty when the file does not exist', () => {
    expect(NonWorkingList.load('/nonexistent/non-working.json').names).toEqual([]);
  });
});
