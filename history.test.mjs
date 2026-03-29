import test from 'node:test';
import assert from 'node:assert/strict';

import {
  MAX_HISTORY_SIZE,
  addToWindowHistory,
  getWindowHistory,
  normalizeWindowHistory,
  pruneWindowHistory,
  removeTabFromAllWindowHistories,
  removeWindowHistory,
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
