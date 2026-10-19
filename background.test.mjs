import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import * as history from './history.mjs';

const source = readFileSync(new URL('./background.js', import.meta.url), 'utf8')
  .replace(/import \{([\s\S]*?)\} from '\.\/history\.mjs';/, 'const {$1} = history;');

function browser(stored = {}, { failedSessionReads = 0 } = {}) {
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
      async get(key) {
        if (failedSessionReads > 0) { failedSessionReads -= 1; throw new Error('session storage unavailable'); }
        return { [key]: structuredClone(stored[key]) };
      },
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
    assert.deepEqual(errors.filter(([message]) => !String(message).includes('Failed to hydrate')), []);
  }
  startWorker();
  return {
    tabs, stored, updates, errors, flush,
    failSessionReads(count) { failedSessionReads = count; },
    async visit(id) { now += 100; activate(id); await flush(); },
    close(id, fallbackId) {
      tabs.delete(id);
      events.onRemoved.emit(id, { windowId: 1, isWindowClosing: false });
      if (fallbackId) activate(fallbackId);
    },
    closeActivationFirst(id, fallbackId) {
      tabs.delete(id);
      if (fallbackId) activate(fallbackId);
      events.onRemoved.emit(id, { windowId: 1, isWindowClosing: false });
    },
    // Low-level event helpers for reproducing delayed or interleaved events.
    tick(ms) { now += ms; },
    remove(id) {
      const windowId = tabs.get(id)?.windowId ?? 1;
      tabs.delete(id);
      events.onRemoved.emit(id, { windowId, isWindowClosing: false });
    },
    chromeActivate(id) { activate(id); },
    onUpdate(fn) { updateHook = fn; },
    select(id) { now += 1; activate(id); },
    async restartWorker() { await flush(); startWorker(); await flush(); },
    async restartWorkerOnClose(id, fallbackId) {
      await flush();
      startWorker();
      tabs.delete(id);
      events.onRemoved.emit(id, { windowId: 1, isWindowClosing: false });
      if (fallbackId) activate(fallbackId);
      await flush();
    },
    async restartBrowser() { chrome.runtime.onStartup.emit(); await flush(); },
    active() { return [...tabs.values()].find(tab => tab.active)?.id; },
  };
}

test('background ignores the neighbor Chrome activates after removal', async () => {
  const b = browser();
  await b.flush();
  await b.visit(1); await b.visit(3);
  b.close(3, 2);
  await b.flush();
  assert.equal(b.active(), 1);
  assert.deepEqual(b.updates, [1]);
  assert.deepEqual(b.stored.sessionState.windowHistory['1'], [1]);
});

test('background supports activation-before-removal event ordering', async () => {
  const b = browser();
  await b.flush();
  await b.visit(1); await b.visit(3);
  b.closeActivationFirst(3, 2);
  await b.flush();
  assert.equal(b.active(), 1);
  assert.deepEqual(b.updates, [1]);
});

test('background does not retain a close-selected neighbor across consecutive closes', async () => {
  const b = browser();
  await b.flush();
  for (const id of [1, 2, 4]) await b.visit(id);
  b.close(4, 3);
  await b.flush();
  assert.equal(b.active(), 2);
  assert.deepEqual(b.stored.sessionState.windowHistory['1'], [2, 1]);
  b.close(2, 3);
  await b.flush();
  assert.equal(b.active(), 1);
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

test('background preserves the just-closed tab while hydrating a cold worker', async () => {
  const b = browser();
  await b.flush();
  await b.visit(1); await b.visit(3);
  await b.restartWorkerOnClose(3, 2);
  assert.equal(b.active(), 1);
  assert.deepEqual(b.updates, [1]);
  assert.deepEqual(b.stored.sessionState.windowHistory['1'], [1]);
});

test('background keeps a pending restore when Chrome closes the activated neighbor too', async () => {
  // chrome.tabs.remove([active, neighbor]) reports: remove active, activate
  // neighbor, remove neighbor, activate the next tab.
  const b = browser();
  await b.flush();
  await b.visit(1); await b.visit(2);
  b.close(2, 3); b.close(3, 4);
  await b.flush();
  assert.equal(b.active(), 1);
  assert.deepEqual(b.updates, [1]);
  assert.deepEqual(b.stored.sessionState.windowHistory['1'], [1]);
});

test('background retries hydration before handling an event instead of overwriting saved history', async () => {
  const b = browser();
  await b.flush();
  await b.visit(1); await b.visit(3);
  // The cold worker's first read and the read for the close event both fail.
  b.failSessionReads(2);
  await b.restartWorkerOnClose(3, 2);
  assert.equal(b.errors.length, 2);
  assert.equal(b.active(), 1);
  assert.deepEqual(b.stored.sessionState.windowHistory['1'], [1]);
});

for (const delay of [30, 100, 1000]) {
  test(`background ignores Chrome's neighbor activation that arrives ${delay}ms after removal`, async () => {
    const b = browser();
    await b.flush();
    await b.visit(1); await b.visit(3);
    b.remove(3);
    b.tick(delay);
    b.chromeActivate(2);
    await b.flush();
    assert.equal(b.active(), 1);
    assert.deepEqual(b.updates, [1]);
    assert.deepEqual(b.stored.sessionState.windowHistory['1'], [1]);
  });
}

for (const delay of [30, 100]) {
  test(`background restores when removal arrives ${delay}ms after Chrome's neighbor activation`, async () => {
    const b = browser();
    await b.flush();
    await b.visit(1); await b.visit(3);
    b.tabs.delete(3);
    b.chromeActivate(2);
    b.tick(delay);
    b.remove(3);
    await b.flush();
    assert.equal(b.active(), 1);
    assert.deepEqual(b.updates, [1]);
    assert.deepEqual(b.stored.sessionState.windowHistory['1'], [1]);
  });
}

test('background keeps a manual switch made before closing the previous tab in the background', async () => {
  // The user selects 2 while on 3 and closes background tab 3 200ms later.
  const b = browser();
  await b.flush();
  await b.visit(1); await b.visit(3);
  b.tick(100);
  b.select(2);
  await b.flush();
  b.tick(200);
  b.remove(3);
  await b.flush();
  assert.equal(b.active(), 2);
  assert.deepEqual(b.updates, []);
  assert.deepEqual(b.stored.sessionState.windowHistory['1'], [2, 1]);
});

test('background keeps a pending restore when a batch close activates the last neighbor late', async () => {
  // chrome.tabs.remove([2, 3]) on a busy browser: the final activation is late.
  const b = browser();
  await b.flush();
  await b.visit(1); await b.visit(2);
  b.remove(2); b.chromeActivate(3); b.remove(3);
  b.tick(60);
  b.chromeActivate(4);
  await b.flush();
  assert.equal(b.active(), 1);
  assert.deepEqual(b.updates, [1]);
  assert.deepEqual(b.stored.sessionState.windowHistory['1'], [1]);
});

for (const delay of [0, 100]) {
  test(`background treats a selection ${delay}ms after Chrome's activation as the user's choice`, async () => {
    const b = browser();
    await b.flush();
    await b.visit(1); await b.visit(3);
    b.close(3, 2);
    b.tick(delay);
    b.select(4);
    await b.flush();
    assert.equal(b.active(), 4);
    assert.deepEqual(b.updates, []);
    assert.deepEqual(b.stored.sessionState.windowHistory['1'], [4, 1]);
  });
}

test('background treats a selection after a completed restore as a normal switch', async () => {
  const b = browser();
  await b.flush();
  await b.visit(1); await b.visit(3);
  b.close(3, 2);
  await b.flush();
  assert.equal(b.active(), 1);
  b.select(4);
  await b.flush();
  assert.equal(b.active(), 4);
  assert.deepEqual(b.updates, [1]);
  assert.deepEqual(b.stored.sessionState.windowHistory['1'], [4, 1]);
});

test('background leaves focus alone when an unrelated background tab closes', async () => {
  const b = browser();
  await b.flush();
  await b.visit(1); await b.visit(3);
  b.remove(4);
  b.tick(10);
  b.select(2);
  await b.flush();
  assert.equal(b.active(), 2);
  assert.deepEqual(b.updates, []);
  assert.deepEqual(b.stored.sessionState.windowHistory['1'], [2, 3, 1]);
  assert.deepEqual(b.stored.sessionState.pendingRestoreByWindow, {});
  b.close(2, 3);
  await b.flush();
  assert.equal(b.active(), 3);
  b.close(3, 1);
  await b.flush();
  assert.equal(b.active(), 1);
});

test('background does not hijack a later selection when Chrome never activates a neighbor', async () => {
  // Saved history says 3 is active, but Chrome had already moved to 1.
  const b = browser({ sessionState: { windowHistory: { '1': [3, 1] } } });
  await b.flush();
  b.remove(3);
  await b.flush();
  b.tick(2000);
  b.select(4);
  await b.flush();
  assert.equal(b.active(), 4);
  assert.deepEqual(b.updates, []);
  assert.equal(b.stored.sessionState.windowHistory['1'][0], 4);
});

test('background drops a pending restore whose opener target closes before the Chrome activation', async () => {
  const b = browser({
    sessionState: {
      windowHistory: { '1': [3] },
      tabMetadata: { '3': { windowId: 1, openerTabId: 2 } },
    },
  });
  b.tabs.get(3).openerTabId = 2;
  b.chromeActivate(3);
  await b.flush();
  assert.deepEqual(b.stored.sessionState.windowHistory['1'], [3]);
  // Tab 3 is handled while its opener still exists; the opener then closes
  // before Chrome's delayed neighbor activation arrives.
  b.remove(3);
  await b.flush();
  b.remove(2); b.chromeActivate(4);
  await b.flush();
  assert.equal(b.active(), 4);
  assert.deepEqual(b.updates, []);
  assert.deepEqual(b.stored.sessionState.windowHistory['1'], [4]);
  assert.deepEqual(b.stored.sessionState.pendingRestoreByWindow, {});
});

test('background ignores malformed pending restores in saved state', async () => {
  const b = browser({
    sessionState: {
      windowHistory: { '1': [3, 1] },
      pendingRestoreByWindow: {
        '1': { targetTabId: 1, removalTime: 1000, awaitingChromeActivation: true },
        '2': [1],
      },
    },
  });
  b.tick(5);
  b.select(2);
  await b.flush();
  assert.equal(b.active(), 2);
  assert.deepEqual(b.updates, []);
  assert.deepEqual(b.stored.sessionState.pendingRestoreByWindow, {});
  assert.deepEqual(b.stored.sessionState.windowHistory['1'], [2, 3, 1]);
});
