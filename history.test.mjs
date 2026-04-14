import test from 'node:test';
import assert from 'node:assert/strict';

import {
  MAX_HISTORY_SIZE,
  addToWindowHistory,
  getWindowHistory,
  normalizeActivationByWindow,
  normalizeTabMetadata,
  normalizeWindowHistory,
  moveTabInActivationByWindow,
  pruneActivationByWindow,
  pruneTabMetadata,
  pruneWindowHistory,
  removeTabFromActivationByWindow,
  removeTabFromAllWindowHistories,
  removeTabMetadata,
  removeWindowActivation,
  removeWindowHistory,
  removeWindowTabMetadata,
  resolveCloseRestorePlan,
  resolvePendingRestoreActivation,
  setActivationRecord,
  setWindowHistory,
  upsertTabMetadata,
} from './history.mjs';

test('normalizeWindowHistory removes invalid values and duplicate tab ids', () => {
  const history = normalizeWindowHistory({
    '1': [5, '5', 2, -1, 2, 9],
    '-1': [8],
    abc: [1],
    '2': 'not-an-array',
  });

  assert.deepEqual(history, {
    '1': [5, 2, 9],
  });
});

test('setWindowHistory replaces one window entry and removes it when empty', () => {
  let history = setWindowHistory(
    {
      '1': [3, 2, 1],
      '2': [8],
    },
    1,
    [9, 7, 7, 5],
  );

  assert.deepEqual(history, {
    '1': [9, 7, 5],
    '2': [8],
  });

  history = setWindowHistory(history, 1, []);

  assert.deepEqual(history, {
    '2': [8],
  });
});

test('addToWindowHistory keeps most recent tab first and enforces max size', () => {
  let history = {};

  for (let index = 0; index < MAX_HISTORY_SIZE + 5; index += 1) {
    history = addToWindowHistory(history, 1, index);
  }

  history = addToWindowHistory(history, 1, MAX_HISTORY_SIZE - 1);

  assert.equal(getWindowHistory(history, 1)[0], MAX_HISTORY_SIZE - 1);
  assert.equal(getWindowHistory(history, 1).length, MAX_HISTORY_SIZE);
});

test('removeTabFromAllWindowHistories removes a tab across windows', () => {
  const history = removeTabFromAllWindowHistories(
    {
      '1': [7, 5, 3],
      '2': [8, 7, 1],
    },
    7,
  );

  assert.deepEqual(history, {
    '1': [5, 3],
    '2': [8, 1],
  });
});

test('removeWindowHistory drops only the requested window entry', () => {
  const history = removeWindowHistory(
    {
      '1': [4, 3],
      '2': [9],
    },
    1,
  );

  assert.deepEqual(history, {
    '2': [9],
  });
});

test('pruneWindowHistory removes tabs that are closed or moved to another window', () => {
  const history = pruneWindowHistory(
    {
      '1': [4, 3, 2],
      '2': [9, 8],
    },
    {
      2: { id: 2, windowId: 1 },
      3: { id: 3, windowId: 5 },
      8: { id: 8, windowId: 2 },
      9: { id: 9, windowId: 2 },
    },
  );

  assert.deepEqual(history, {
    '1': [2],
    '2': [9, 8],
  });
});

test('tab metadata is normalized, updated, and pruned', () => {
  let metadata = normalizeTabMetadata({
    '1': { windowId: 2, openerTabId: 8 },
    'bad': { windowId: 3, openerTabId: 2 },
    '4': { windowId: -1, openerTabId: 1 },
  });

  assert.deepEqual(metadata, {
    '1': { windowId: 2, openerTabId: 8 },
  });

  metadata = upsertTabMetadata(metadata, { id: 5, windowId: 2, openerTabId: 1 });
  metadata = removeTabMetadata(metadata, 1);

  assert.deepEqual(metadata, {
    '5': { windowId: 2, openerTabId: 1 },
  });

  metadata = pruneTabMetadata(metadata, {
    5: { id: 5, windowId: 2 },
  });

  assert.deepEqual(metadata, {
    '5': { windowId: 2, openerTabId: null },
  });

  metadata = removeWindowTabMetadata(metadata, 2);

  assert.deepEqual(metadata, {});
});

test('activation records are normalized and pruned', () => {
  let activationByWindow = normalizeActivationByWindow({
    '1': {
      tabId: 5,
      eventTime: 1000,
      previousHistory: [4, 3, 4],
    },
    x: {
      tabId: 9,
      eventTime: 1,
      previousHistory: [8],
    },
  });

  activationByWindow = setActivationRecord(activationByWindow, 2, {
    tabId: 8,
    eventTime: 1200,
    previousHistory: [8, 7, 7],
  });

  activationByWindow = removeTabFromActivationByWindow(activationByWindow, 3);

  assert.deepEqual(activationByWindow, {
    '1': { tabId: 5, eventTime: 1000, previousHistory: [4] },
    '2': { tabId: 8, eventTime: 1200, previousHistory: [8, 7] },
  });

  activationByWindow = pruneActivationByWindow(activationByWindow, {
    5: { id: 5, windowId: 1 },
    7: { id: 7, windowId: 2 },
    8: { id: 8, windowId: 2 },
  });

  assert.deepEqual(activationByWindow, {
    '1': { tabId: 5, eventTime: 1000, previousHistory: [] },
    '2': { tabId: 8, eventTime: 1200, previousHistory: [8, 7] },
  });

  activationByWindow = removeWindowActivation(activationByWindow, 1);

  assert.deepEqual(activationByWindow, {
    '2': { tabId: 8, eventTime: 1200, previousHistory: [8, 7] },
  });
});

test('moveTabInActivationByWindow removes moved tabs from activation snapshots', () => {
  const activationByWindow = moveTabInActivationByWindow(
    {
      '1': { tabId: 5, eventTime: 1000, previousHistory: [5, 4, 3] },
      '2': { tabId: 8, eventTime: 1200, previousHistory: [8, 5, 7] },
    },
    5,
    2,
  );

  assert.deepEqual(activationByWindow, {
    '2': { tabId: 8, eventTime: 1200, previousHistory: [8, 7] },
  });
});

test('resolveCloseRestorePlan uses updated window metadata after a tab move', () => {
  const restorePlan = resolveCloseRestorePlan({
    windowHistory: {
      '2': [30],
    },
    windowId: 2,
    removedTabId: 30,
    lastActivationByWindow: {},
    tabMetadata: {
      '30': { windowId: 2, openerTabId: 20 },
      '20': { windowId: 2, openerTabId: null },
    },
    removalTime: 3000,
  });

  assert.deepEqual(restorePlan, {
    windowHistory: {},
    restoreTargetTabId: 20,
    removedWasMostRecent: true,
    usedTransientActivation: false,
  });
});

test('resolveCloseRestorePlan ignores close-induced transient activation', () => {
  const restorePlan = resolveCloseRestorePlan({
    windowHistory: {
      '1': [40, 30, 20, 10],
    },
    windowId: 1,
    removedTabId: 30,
    lastActivationByWindow: {
      '1': {
        tabId: 40,
        eventTime: 2000,
        previousHistory: [30, 20, 10],
      },
    },
    tabMetadata: {
      '30': { windowId: 1, openerTabId: 20 },
    },
    removalTime: 2200,
    transientActivationWindowMs: 1000,
  });

  assert.deepEqual(restorePlan, {
    windowHistory: {
      '1': [20, 10],
    },
    restoreTargetTabId: 20,
    removedWasMostRecent: true,
    usedTransientActivation: true,
  });
});

test('resolveCloseRestorePlan falls back to opener when history is empty after close', () => {
  const restorePlan = resolveCloseRestorePlan({
    windowHistory: {
      '1': [30],
    },
    windowId: 1,
    removedTabId: 30,
    lastActivationByWindow: {},
    tabMetadata: {
      '30': { windowId: 1, openerTabId: 20 },
    },
    removalTime: 3000,
  });

  assert.deepEqual(restorePlan, {
    windowHistory: {},
    restoreTargetTabId: 20,
    removedWasMostRecent: true,
    usedTransientActivation: false,
  });
});

test('resolveCloseRestorePlan does not restore when a background tab is closed', () => {
  const restorePlan = resolveCloseRestorePlan({
    windowHistory: {
      '1': [30, 20, 10],
    },
    windowId: 1,
    removedTabId: 10,
    lastActivationByWindow: {},
    tabMetadata: {
      '10': { windowId: 1, openerTabId: 20 },
    },
    removalTime: 3000,
  });

  assert.deepEqual(restorePlan, {
    windowHistory: {
      '1': [30, 20],
    },
    restoreTargetTabId: null,
    removedWasMostRecent: false,
    usedTransientActivation: false,
  });
});

test('resolvePendingRestoreActivation treats unexpected activation as user override', () => {
  const resolution = resolvePendingRestoreActivation({
    windowHistory: {
      '1': [20, 10],
    },
    lastActivationByWindow: {
      '1': { tabId: 20, eventTime: 1000, previousHistory: [30, 20, 10] },
    },
    windowId: 1,
    activatedTabId: 99,
    eventTime: 1100,
    pendingRestore: {
      targetTabId: 20,
      removalTime: 1000,
      historyAfterClose: [20, 10],
      restoreWindowMs: 1500,
    },
  });

  assert.deepEqual(resolution, {
    action: 'override',
    windowHistory: {
      '1': [20, 10],
    },
    lastActivationByWindow: {
      '1': { tabId: 20, eventTime: 1000, previousHistory: [30, 20, 10] },
    },
    previousHistory: [20, 10],
  });
});

test('resolvePendingRestoreActivation confirms expected restore target', () => {
  const resolution = resolvePendingRestoreActivation({
    windowHistory: {
      '1': [99, 20, 10],
    },
    lastActivationByWindow: {},
    windowId: 1,
    activatedTabId: 20,
    eventTime: 1100,
    pendingRestore: {
      targetTabId: 20,
      removalTime: 1000,
      historyAfterClose: [20, 10],
      restoreWindowMs: 1500,
    },
  });

  assert.deepEqual(resolution, {
    action: 'confirmed',
    windowHistory: {
      '1': [20, 10],
    },
    lastActivationByWindow: {},
    previousHistory: [20, 10],
  });
});
