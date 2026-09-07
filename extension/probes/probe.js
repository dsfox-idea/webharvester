/** Outcome of one permission probe; serializable for tests and the UI. */
export class ProbeResult {
  constructor(permission) {
    this.permission = permission;
    this.granted = false;
    this.namespace = null; // { name, present } when the permission owns an API namespace
    this.conditional = null; // why the namespace may legitimately be absent
    this.exercise = { status: 'skipped', detail: '' }; // status: passed | failed | skipped
  }
}

/**
 * One probe per manifest permission: is it granted, does its API namespace
 * exist in this context, and does a harmless call succeed.
 */
export class Probe {
  constructor(permission, { namespace = null, conditional = null, exercise = null } = {}) {
    this.permission = permission;
    this.namespace = namespace;
    this.conditional = conditional;
    this.exercise = exercise;
  }

  namespacePresent() {
    if (!this.namespace) return null;
    return this.namespace.split('.').reduce((node, key) => (node == null ? undefined : node[key]), chrome) !== undefined;
  }

  async run(grantedPermissions) {
    const result = new ProbeResult(this.permission);
    result.granted = grantedPermissions.has(this.permission);
    result.conditional = this.conditional;
    if (this.namespace) result.namespace = { name: `chrome.${this.namespace}`, present: this.namespacePresent() };

    if (!this.exercise) {
      result.exercise = { status: 'skipped', detail: 'no harmless call defined' };
    } else if (!result.granted) {
      result.exercise = { status: 'skipped', detail: 'permission not granted' };
    } else if (this.namespace && !result.namespace.present && this.conditional) {
      result.exercise = { status: 'skipped', detail: `namespace absent: requires ${this.conditional}` };
    } else {
      result.exercise = await this.runExercise();
    }
    return result;
  }

  async runExercise() {
    try {
      const detail = await this.exercise();
      return { status: 'passed', detail: String(detail ?? '') };
    } catch (error) {
      return { status: 'failed', detail: error instanceof Error ? error.message : String(error) };
    }
  }
}
