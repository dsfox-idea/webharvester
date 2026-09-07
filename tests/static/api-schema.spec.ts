import { expect, test } from '@playwright/test';
import { ApiSchema, DocText, IdlApiSchema, JsonApiSchema, WebIdlApiSchema } from '../../src/api-schema.ts';
import { ManifestBuilder } from '../../src/manifest-builder.ts';
import { PermissionSources, permissionSources } from '../../src/api-schema-map.ts';

test.describe('DocText', () => {
  test('turns schema markup into plain text', () => {
    expect(DocText.clean('Use the <code>chrome.tabs</code> API.  See $(ref:tabs.Tab) and <a href="x">links</a> <!-- note -->.')).toBe(
      'Use the `chrome.tabs` API. See `tabs.Tab` and links .',
    );
  });

  test('collapses backticks that the schema nests inside code tags', () => {
    expect(DocText.clean('Configures the <code>`USER_SCRIPT`</code> world.')).toBe('Configures the `USER_SCRIPT` world.');
  });

  test('takes the first sentence without splitting on e.g.', () => {
    expect(DocText.firstSentence('Fires often, e.g. on load. Second sentence here.')).toBe('Fires often, e.g. on load.');
    expect(DocText.firstSentence('No terminator')).toBe('No terminator');
  });
});

test.describe('JsonApiSchema', () => {
  test('reads namespace description, functions and events, skipping nodoc members', () => {
    const text = `// Copyright
[
  { "namespace": "other", "description": "x" },
  {
    "namespace": "tabs",
    "description": "Use the <code>chrome.tabs</code> API to interact with tabs.",
    "functions": [
      { "name": "query", "type": "function", "description": "Gets all tabs that match." },
      { "name": "secret", "nodoc": true, "type": "function", "description": "hidden" }
    ],
    "events": [ { "name": "onUpdated", "type": "function", "description": "Fired when a tab is updated." } ]
  }
]`;
    expect(JsonApiSchema.parse(text, 'tabs')).toEqual({
      namespace: 'tabs',
      description: 'Use the `chrome.tabs` API to interact with tabs.',
      functions: [{ name: 'query', description: 'Gets all tabs that match.' }],
      events: [{ name: 'onUpdated', description: 'Fired when a tab is updated.' }],
    });
  });
});

test.describe('IdlApiSchema', () => {
  test('reads the comment above namespace, Functions and Events', () => {
    const text = `// Copyright

// Use the <code>chrome.scripting</code> API to execute script
// in different contexts.
namespace scripting {
  dictionary InjectionTarget { long tabId; };

  interface Functions {
    // Injects a script into a target context. By default it runs late.
    // |injection|: The details of the script which to inject.
    static void executeScript(ScriptInjection injection, optional ScriptInjectionCallback callback);

    [nodoc] static void hiddenThing(long x);

    // Removes CSS.
    static void removeCSS(CSSInjection injection);
  };

  interface Events {
    // Fired when something happens.
    static void onSomething(long id);
  };
};`;
    expect(IdlApiSchema.parse(text, 'scripting')).toEqual({
      namespace: 'scripting',
      description: 'Use the `chrome.scripting` API to execute script in different contexts.',
      functions: [
        { name: 'executeScript', description: 'Injects a script into a target context. By default it runs late.' },
        { name: 'removeCSS', description: 'Removes CSS.' },
      ],
      events: [{ name: 'onSomething', description: 'Fired when something happens.' }],
    });
  });
});

test.describe('WebIdlApiSchema', () => {
  test('finds the namespace interface through the Browser binding and reads members', () => {
    const text = `dictionary Alarm { required DOMString name; };

interface OnAlarmEvent : ExtensionEvent {
  static undefined addListener(OnAlarmListener listener);
};

// Use the <code>chrome.alarms</code> API to schedule code to run
// periodically or at a specified time in the future.
interface Alarms {
  // Creates an alarm.  Near the time specified, the event fires.
  // |name|: Optional name.
  // |Returns|: Promise.
  static Promise<undefined> create(optional DOMString name, AlarmCreateInfo alarmInfo);

  // Gets an array of all the alarms.
  // |PromiseValue|: alarms
  static Promise<sequence<Alarm>> getAll();

  // Fired when an alarm has elapsed. Useful for event pages.
  static attribute OnAlarmEvent onAlarm;
};

partial interface Browser {
  static attribute Alarms alarms;
};`;
    expect(WebIdlApiSchema.parse(text, 'alarms')).toEqual({
      namespace: 'alarms',
      description: 'Use the `chrome.alarms` API to schedule code to run periodically or at a specified time in the future.',
      functions: [
        { name: 'create', description: 'Creates an alarm. Near the time specified, the event fires.' },
        { name: 'getAll', description: 'Gets an array of all the alarms.' },
      ],
      events: [{ name: 'onAlarm', description: 'Fired when an alarm has elapsed. Useful for event pages.' }],
    });
  });

  test('dispatches by extension', () => {
    expect(() => ApiSchema.parse('x.txt', '', 'x')).toThrow(/Unknown schema format/);
  });
});

test.describe('permission sources', () => {
  test('cover every permission in the manifest, with unique entries', () => {
    const declared = ManifestBuilder.readManifest().permissions;
    for (const permission of declared) expect(() => PermissionSources.byPermission(permission), permission).not.toThrow();
    const names = permissionSources.map((s) => s.permission);
    expect(new Set(names).size).toBe(names.length);
  });
});
