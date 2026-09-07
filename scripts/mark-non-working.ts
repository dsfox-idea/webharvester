/**
 * Marks the permissions the last live run found not granted as non-working:
 * test-results/probe-report.json -> catalog/non-working.json.
 * Run the live tests with the full manifest first (npm run build-manifest -- --full).
 */
import { readFileSync } from 'node:fs';
import { NonWorkingList, type MeasuredReport } from '../src/non-working.ts';

const reportPath = process.argv[2] ?? 'test-results/probe-report.json';
const report = JSON.parse(readFileSync(reportPath, 'utf8')) as MeasuredReport;
const list = NonWorkingList.fromReport(report);
list.write();
console.log(`measured in ${list.measuredIn.versionLine}`);
console.log(`non-working: ${list.names.length} -> ${NonWorkingList.defaultPath}`);
for (const p of list.permissions) console.log(`  ${p.name}: ${p.reason} (${p.detail})`);
