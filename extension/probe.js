import { ProbeRunner } from './probes/runner.js';

/** Renders a ProbeRunner report into the probe page and exposes it to tests. */
class ProbePage {
  constructor(runner) {
    this.runner = runner;
    this.lastReport = null;
    this.rows = document.getElementById('rows');
    this.summary = document.getElementById('summary');
    this.status = document.getElementById('status');
    document.getElementById('run').addEventListener('click', () => this.run());
  }

  async run() {
    this.status.textContent = 'running...';
    try {
      const report = await this.runner.run();
      report.nonWorking = await this.loadNonWorking();
      this.lastReport = report;
      this.render(report);
      this.status.textContent = `done at ${report.ranAt}`;
      console.log('[webharvester] probe report', report);
      return report;
    } catch (error) {
      this.status.textContent = `failed: ${error.message}`;
      console.error('[webharvester] probe run failed', error);
      throw error;
    }
  }

  /** Permissions measured as non-working and left out of the manifest (extension/non-working.json). */
  async loadNonWorking() {
    try {
      const response = await fetch(chrome.runtime.getURL('non-working.json'));
      return response.ok ? await response.json() : { permissions: [] };
    } catch {
      return { permissions: [] };
    }
  }

  render(report) {
    const granted = report.results.filter((r) => r.granted).length;
    const passed = report.results.filter((r) => r.exercise.status === 'passed').length;
    const failed = report.results.filter((r) => r.exercise.status === 'failed').length;
    const nonWorking = report.nonWorking?.permissions ?? [];
    this.summary.textContent =
      `${report.extensionId}: ${report.declared.length} declared, ${granted} granted, ` +
      `${report.grantedOrigins.length} origins, exercises passed ${passed}, failed ${failed}, ` +
      `${nonWorking.length} non-working left out of the manifest`;
    this.rows.replaceChildren(
      ...report.results.map((result, index) => this.row(result, index + 1)),
      ...nonWorking.map((entry, index) => this.nonWorkingRow(entry, report.results.length + index + 1)),
    );
  }

  nonWorkingRow(entry, index) {
    const tr = document.createElement('tr');
    tr.className = 'non-working';
    for (const [text, className] of [
      [String(index), ''],
      [entry.name, ''],
      ['non-working', 'no'],
      ['(not declared)', 'skip'],
      ['skipped', 'skip'],
      [`${entry.reason}: ${entry.detail}`, 'detail'],
    ]) {
      const td = document.createElement('td');
      td.textContent = text;
      if (className) td.className = className;
      tr.append(td);
    }
    return tr;
  }

  row(result, index) {
    const tr = document.createElement('tr');
    const cells = [
      [String(index), ''],
      [result.permission, ''],
      [result.granted ? 'yes' : 'no', result.granted ? 'yes' : 'no'],
      this.namespaceCell(result),
      [result.exercise.status, { passed: 'yes', failed: 'no', skipped: 'skip' }[result.exercise.status]],
      [result.exercise.detail, 'detail'],
    ];
    for (const [text, className] of cells) {
      const td = document.createElement('td');
      td.textContent = text;
      if (className) td.className = className;
      tr.append(td);
    }
    return tr;
  }

  namespaceCell(result) {
    if (!result.namespace) return ['(capability)', 'skip'];
    if (result.namespace.present) return [`${result.namespace.name} present`, 'yes'];
    if (result.conditional) return [`${result.namespace.name} absent (needs ${result.conditional})`, 'maybe'];
    return [`${result.namespace.name} absent`, 'no'];
  }
}

const page = new ProbePage(new ProbeRunner());
window.__webharvester = page;
page.run();
