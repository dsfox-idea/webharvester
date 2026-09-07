import { ApiSchema, DocText, type ApiMember, type ApiSummary } from './api-schema.ts';
import { PermissionSources, type PermissionSource, type SchemaSource } from './api-schema-map.ts';
import { permissionUses } from './permission-uses.ts';

export interface GuideContext {
  /** Chromium revision the schemas were read at (for the "Interface" heading). */
  chromiumRevision: string;
  chromiumVersion: string;
  /** Reads a Chromium source file at that revision. */
  readFile: (path: string) => Promise<string>;
}

export interface Guide {
  permission: string;
  fileSlug: string;
  markdown: string;
}

/** Builds one Markdown guide per permission: official interface (from Chromium schemas) plus the authored broad-use note. */
export class GuideBuilder {
  private readonly context: GuideContext;
  private readonly cache = new Map<string, Promise<string>>();

  constructor(context: GuideContext) {
    this.context = context;
  }

  static fileSlug(permission: string): string {
    return permission.replace(/\./g, '-');
  }

  async build(permission: string): Promise<Guide> {
    const source = PermissionSources.byPermission(permission);
    const uses = permissionUses[permission];
    if (!uses) throw new Error(`No authored use note for ${permission}`);
    const markdown = PermissionSources.isSchema(source)
      ? await this.schemaGuide(permission, source, uses)
      : GuideBuilder.capabilityGuide(permission, source.capability, uses);
    return { permission, fileSlug: GuideBuilder.fileSlug(permission), markdown };
  }

  private async schemaGuide(permission: string, source: SchemaSource, uses: string): Promise<string> {
    const summary = ApiSchema.parse(source.file, await this.read(source.file), source.namespace);
    const selected = GuideBuilder.select(summary, source.only);
    const description = source.descriptionOverride ?? summary.description;
    const lines = [
      `# ${permission}`,
      '',
      `**Permission string:** \`${permission}\``,
      `**API namespace:** \`chrome.${summary.namespace}\``,
      '',
      `## Interface (Chromium ${this.context.chromiumVersion})`,
      '',
      description,
    ];
    if (selected.functions.length > 0) {
      lines.push('', '**Functions**');
      for (const fn of selected.functions) lines.push(GuideBuilder.memberLine(`${summary.namespace}.${fn.name}()`, fn));
    }
    if (selected.events.length > 0) {
      lines.push('', '**Events**');
      for (const ev of selected.events) lines.push(GuideBuilder.memberLine(`${summary.namespace}.${ev.name}`, ev));
    }
    lines.push('', "## What it's for (broad)", '', uses, '');
    return lines.join('\n');
  }

  private static capabilityGuide(permission: string, capability: string, uses: string): string {
    return [
      `# ${permission}`,
      '',
      `**Permission string:** \`${permission}\``,
      '**API namespace:** capability permission — no dedicated `chrome.*` namespace',
      '',
      '## Interface (official)',
      '',
      capability,
      '',
      "## What it's for (broad)",
      '',
      uses,
      '',
    ].join('\n');
  }

  private static select(summary: ApiSummary, only?: string[]): ApiSummary {
    if (!only) return summary;
    const keep = new Set(only);
    return {
      ...summary,
      functions: summary.functions.filter((m) => keep.has(m.name)),
      events: summary.events.filter((m) => keep.has(m.name)),
    };
  }

  private static memberLine(label: string, member: ApiMember): string {
    return member.description ? `- \`${label}\` — ${DocText.firstSentence(member.description)}` : `- \`${label}\``;
  }

  private read(path: string): Promise<string> {
    let pending = this.cache.get(path);
    if (!pending) {
      pending = this.context.readFile(path);
      this.cache.set(path, pending);
    }
    return pending;
  }
}

/** Ready-made facts for a permission, used by the skill index. */
export class GuideIndex {
  static row(permission: string): { permission: string; namespace: string; fileSlug: string } {
    const source = PermissionSources.byPermission(permission);
    return {
      permission,
      namespace: PermissionSources.isSchema(source) ? `chrome.${source.namespace}` : 'capability',
      fileSlug: GuideBuilder.fileSlug(permission),
    };
  }
}
