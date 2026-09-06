import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import * as history from './history.mjs';

const source = readFileSync(new URL('./background.js', import.meta.url), 'utf8')
  .replace(/import \{([\s\S]*?)\} from '\.\/history\.mjs';/, 'const {$1} = history;');

function browser(stored = {}) {
  const tabs = new Map([1, 2, 3, 4].map(id => [id, { id, windowId: 1, active: id === 1 }]));
  const updates = [];
  const errors = [];
  let now = 1000;
  let context;
  let updateHook;
  const event = () => {
    let listener;
    return { addListener(fn) { listener = fn; }, emit(...args) { listener(...args); } };
  };
  const events = Object.fromEntries(['onCreated', 'onActivated', 'onAttached', 'onDetached', 'onRemoved', 'onReplaced'].map(name => [name, event()]));
  function activate(id) {
    const tab = tabs.get(id);
    for (const value of tabs.values()) if (value.windowId === tab.windowId) value.active = value.id === id;
    events.onActivated.emit({ tabId: id, windowId: tab.windowId });
  }
  const chrome = {
    runtime: { onStartup: event(), onInstalled: event() },
    windows: { onRemoved: event() },
    storage: { session: {
      async get(key) { return { [key]: structuredClone(stored[key]) }; },
      async set(value) { Object.assign(stored, structuredClone(value)); },
    } },
    tabs: {
      ...events,
      async query(query) { return [...tabs.values()].filter(tab => (!query.active || tab.active) && (query.windowId === undefined || tab.windowId === query.windowId)).map(tab => ({ ...tab })); },
      async get(id) { if (!tabs.has(id)) throw new Error('No tab with id'); return { ...tabs.get(id) }; },
      async update(id) {
        if (!tabs.has(id)) throw new Error('No tab with id');
        updates.push(id);
        activate(id);
        if (updateHook) { const hook = updateHook; updateHook = null; hook(); }
        return { ...tabs.get(id) };
      },
    },
  };
  function startWorker() {
    context = vm.createContext({ chrome, history, Date: class extends Date { static now() { return now; } }, console: { error(...args) { errors.push(args); } } });
    vm.runInContext(source, context);
  }
  async function flush() {
    // Event handlers may append activation tasks while an update is pending.
    for (;;) {
      const pending = vm.runInContext('historyTaskQueue', context);
      await pending;
      if (pending === vm.runInContext('historyTaskQueue', context)) break;
    }
    assert.deepEqual(errors, []);
  }
  startWorker();
  return {
    tabs, stored, updates, flush,
    async visit(id) { now += 100; activate(id); await flush(); },
    close(id, fallbackId) {
      tabs.delete(id);
      if (fallbackId) activate(fallbackId);
      events.onRemoved.emit(id, { windowId: 1, isWindowClosing: false });
    },
    onUpdate(fn) { updateHook = fn; },
    select(id) { now += 1; activate(id); },
    async restartWorker() { await flush(); startWorker(); await flush(); },
    async restartBrowser() { chrome.runtime.onStartup.emit(); await flush(); },
    active() { return [...tabs.values()].find(tab => tab.active)?.id; },
  };
}

test('background restores history when Chrome activates a neighbor before removal', async () => {
  const b = browser();
  await b.flush();
  await b.visit(1); await b.visit(3);
  b.close(3, 2);
  await b.flush();
  assert.equal(b.active(), 1);
  assert.deepEqual(b.updates, [1]);
});

test('background handles consecutive removals queued before restore finishes', async () => {
  const b = browser();
  await b.flush();
  for (const id of [1, 2, 3, 4]) await b.visit(id);
  b.close(4, 3); b.close(3, 2);
  await b.flush();
  assert.equal(b.active(), 2);
  b.close(2, 1);
  await b.flush();
  assert.equal(b.active(), 1);
});

test('background respects a user selection during an asynchronous restore', async () => {
  const b = browser();
  await b.flush();
  await b.visit(1); await b.visit(3);
  b.onUpdate(() => b.select(4));
  b.close(3, 2);
  await b.flush();
  assert.equal(b.active(), 4);
  assert.deepEqual(b.updates, [1]);
  assert.equal(b.stored.sessionState.windowHistory['1'][0], 4);
});

test('background restores saved history after worker restart and resets it on browser startup', async () => {
  const b = browser();
  await b.flush();
  await b.visit(1); await b.visit(3);
  await b.restartWorker();
  b.close(3, 2);
  await b.flush();
  assert.equal(b.active(), 1);
  await b.visit(4);
  await b.restartBrowser();
  assert.deepEqual(b.stored.sessionState.windowHistory['1'], [4]);
});
