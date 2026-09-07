import { ChromiumJson } from './chromium-json.ts';

export interface ApiMember {
  name: string;
  description: string;
}

/** What a guide needs from one Chromium API schema: the official namespace text, its functions and events. */
export interface ApiSummary {
  namespace: string;
  description: string;
  functions: ApiMember[];
  events: ApiMember[];
}

/** Chromium schema docs use a little HTML and `$(ref:...)` links; guides want plain Markdown. */
export class DocText {
  static clean(text: string): string {
    return text
      .replace(/\$\(ref:([^)]+)\)/g, '`$1`')
      .replace(/<code>([\s\S]*?)<\/code>/g, '`$1`')
      .replace(/<var>([\s\S]*?)<\/var>/g, '`$1`')
      .replace(/<a [^>]*>([\s\S]*?)<\/a>/g, '$1')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<[^>]+>/g, '')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/`+/g, '`')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /** First sentence: a terminator followed by whitespace and a capital letter (so "e.g. the" does not split). */
  static firstSentence(text: string): string {
    const match = /^([\s\S]*?[.!?])(?=\s+[A-Z])/.exec(text);
    return match ? match[1] : text;
  }
}

/** Shared helper for the two comment-based formats: the `//` block right above a declaration line. */
class CommentBlock {
  static above(lines: string[], index: number): string {
    const collected: string[] = [];
    let i = index - 1;
    while (i >= 0 && /^\s*\[.*\]\s*$/.test(lines[i])) i -= 1; // extended attributes like [nodoc]
    while (i >= 0 && /^\s*\/\//.test(lines[i])) {
      collected.unshift(lines[i].replace(/^\s*\/\/ ?/, ''));
      i -= 1;
    }
    const firstParamDoc = collected.findIndex((line) => /^\|\w+\|:/.test(line));
    const doc = (firstParamDoc < 0 ? collected : collected.slice(0, firstParamDoc)).filter((line) => !/^TODO/.test(line));
    return DocText.clean(doc.join(' '));
  }

  static attributesAbove(lines: string[], index: number): string {
    let i = index - 1;
    const attributes: string[] = [];
    while (i >= 0 && /^\s*\[.*\]\s*$/.test(lines[i])) {
      attributes.push(lines[i]);
      i -= 1;
    }
    return attributes.join(' ');
  }
}

interface JsonNamespace {
  namespace: string;
  description?: string;
  nodoc?: boolean;
  functions?: Array<{ name: string; description?: string; nodoc?: boolean }>;
  events?: Array<{ name: string; description?: string; nodoc?: boolean }>;
}

/** `*.json` schemas: an array of namespace objects with `functions` and `events`. */
export class JsonApiSchema {
  static parse(text: string, namespace: string): ApiSummary {
    const document = ChromiumJson.parse<JsonNamespace[]>(text);
    const found = document.find((entry) => entry.namespace === namespace);
    if (!found) throw new Error(`Namespace ${namespace} not found in JSON schema`);
    const members = (list: JsonNamespace['functions']) =>
      (list ?? []).filter((m) => !m.nodoc).map((m) => ({ name: m.name, description: DocText.clean(m.description ?? '') }));
    return {
      namespace,
      description: DocText.clean(found.description ?? ''),
      functions: members(found.functions),
      events: members(found.events),
    };
  }
}

/** Legacy `*.idl` schemas: `namespace x { interface Functions {...}; interface Events {...}; }`. */
export class IdlApiSchema {
  static parse(text: string, namespace: string): ApiSummary {
    const lines = text.split('\n');
    const start = lines.findIndex((line) => new RegExp(`^namespace ${namespace.replace('.', '\\.')}\\s*\\{`).test(line));
    if (start < 0) throw new Error(`namespace ${namespace} not found in IDL`);
    return {
      namespace,
      description: CommentBlock.above(lines, start),
      functions: IdlApiSchema.block(lines, 'Functions'),
      events: IdlApiSchema.block(lines, 'Events'),
    };
  }

  private static block(lines: string[], interfaceName: string): ApiMember[] {
    const open = lines.findIndex((line) => new RegExp(`^\\s*interface ${interfaceName}\\s*\\{`).test(line));
    if (open < 0) return [];
    const members: ApiMember[] = [];
    for (let i = open + 1; i < lines.length && !/^\s*\};/.test(lines[i]); i += 1) {
      const match = /^\s*static\s+[\w<>?,\s]+?\s(\w+)\s*\(/.exec(lines[i]);
      if (!match || CommentBlock.attributesAbove(lines, i).includes('nodoc')) continue;
      members.push({ name: match[1], description: CommentBlock.above(lines, i) });
    }
    return members;
  }
}

/** New `*.webidl` schemas: one interface per namespace, events as `static attribute XEvent onX;`, bound via `partial interface Browser`. */
export class WebIdlApiSchema {
  static parse(text: string, namespace: string): ApiSummary {
    const lines = text.split('\n');
    const binding = new RegExp(`static attribute (\\w+) ${namespace.split('.').pop()}\\s*;`).exec(text);
    if (!binding) throw new Error(`No Browser binding for ${namespace} in WebIDL`);
    const interfaceName = binding[1];
    const start = lines.findIndex((line) => new RegExp(`^interface ${interfaceName}\\s*\\{`).test(line));
    if (start < 0) throw new Error(`interface ${interfaceName} not found in WebIDL`);
    const functions: ApiMember[] = [];
    const events: ApiMember[] = [];
    for (let i = start + 1; i < lines.length && !/^\};/.test(lines[i]); i += 1) {
      if (CommentBlock.attributesAbove(lines, i).includes('nodoc')) continue;
      const event = /^\s*static attribute \w+ (\w+)\s*;/.exec(lines[i]);
      if (event) {
        events.push({ name: event[1], description: CommentBlock.above(lines, i) });
        continue;
      }
      const fn = /^\s*static\s+[\w<>?,\s]+?\s(\w+)\s*\(/.exec(lines[i]);
      if (fn) functions.push({ name: fn[1], description: CommentBlock.above(lines, i) });
    }
    return { namespace, description: CommentBlock.above(lines, start), functions, events };
  }
}

/** Picks the parser by file extension. */
export class ApiSchema {
  static parse(fileName: string, text: string, namespace: string): ApiSummary {
    if (fileName.endsWith('.json')) return JsonApiSchema.parse(text, namespace);
    if (fileName.endsWith('.webidl')) return WebIdlApiSchema.parse(text, namespace);
    if (fileName.endsWith('.idl')) return IdlApiSchema.parse(text, namespace);
    throw new Error(`Unknown schema format: ${fileName}`);
  }
}
