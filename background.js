import {
  MAX_HISTORY_SIZE,
  addToWindowHistory,
  getWindowHistory,
  normalizeWindowHistory,
  pruneWindowHistory,
  removeTabFromAllWindowHistories,
  removeWindowHistory,
} from './history.mjs';

const HISTORY_STORAGE_KEY = 'windowHistory';

let windowHistory = {};
let historyLoaded = false;
let historyLoadPromise = null;
let historyTaskQueue = Promise.resolve();

chrome.runtime.onStartup.addListener(() => {
  void enqueueHistoryTask('startup reset', async () => {
    await resetHistoryFromCurrentTabs('browser startup');
  });
});

chrome.runtime.onInstalled.addListener(() => {
  void enqueueHistoryTask('install reset', async () => {
    await resetHistoryFromCurrentTabs('extension install/update');
  });
});

chrome.tabs.onActivated.addListener((activeInfo) => {
  void enqueueHistoryTask('tab activation', async () => {
    await handleTabActivated(activeInfo);
  });
});

chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  void enqueueHistoryTask('tab removal', async () => {
    await handleTabRemoved(tabId, removeInfo);
  });
});

chrome.windows.onRemoved.addListener((windowId) => {
  void enqueueHistoryTask('window removal', async () => {
    await handleWindowRemoved(windowId);
  });
});

void enqueueHistoryTask('initial hydration', async () => {
  await ensureHistoryLoaded();
});

function enqueueHistoryTask(label, task) {
  const runTask = async () => {
    try {
      await task();
    } catch (error) {
      logError(`Unhandled error during ${label}:`, error);
    }
  };

  historyTaskQueue = historyTaskQueue.then(runTask, runTask);
  return historyTaskQueue;
}

async function ensureHistoryLoaded() {
  if (historyLoaded) {
    return;
  }

  if (!historyLoadPromise) {
    historyLoadPromise = hydrateHistory();
  }

  await historyLoadPromise;
}

async function hydrateHistory() {
  try {
    const [{ [HISTORY_STORAGE_KEY]: storedHistory }, openTabs] = await Promise.all([
      chrome.storage.session.get(HISTORY_STORAGE_KEY),
      chrome.tabs.query({}),
    ]);

    const openTabsById = buildOpenTabsById(openTabs);
    let nextHistory = normalizeWindowHistory(storedHistory, MAX_HISTORY_SIZE);

    if (Object.keys(nextHistory).length === 0) {
      nextHistory = buildHistoryFromTabs(openTabs);
    }

    windowHistory = pruneWindowHistory(nextHistory, openTabsById, MAX_HISTORY_SIZE);
    historyLoaded = true;

    await persistWindowHistory();
    logInfo('Window history hydrated:', windowHistory);
  } catch (error) {
    windowHistory = {};
    historyLoaded = true;
    logError('Failed to hydrate window history:', error);
  } finally {
    historyLoadPromise = null;
  }
}

async function resetHistoryFromCurrentTabs(reason) {
  const openTabs = await chrome.tabs.query({});
  windowHistory = buildHistoryFromTabs(openTabs);
  historyLoaded = true;
  historyLoadPromise = null;

  await persistWindowHistory();
  logInfo(`Window history reset after ${reason}:`, windowHistory);
}

async function persistWindowHistory() {
  await chrome.storage.session.set({
    [HISTORY_STORAGE_KEY]: windowHistory,
  });
}

function buildHistoryFromTabs(tabs) {
  let nextHistory = {};

  for (const tab of tabs) {
    if (!tab.active || !isValidTabId(tab.id) || !isValidWindowId(tab.windowId)) {
      continue;
    }

    nextHistory = addToWindowHistory(nextHistory, tab.windowId, tab.id, MAX_HISTORY_SIZE);
  }

  return nextHistory;
}

function buildOpenTabsById(tabs) {
  return Object.fromEntries(
    tabs
      .filter((tab) => isValidTabId(tab.id) && isValidWindowId(tab.windowId))
      .map((tab) => [tab.id, tab]),
  );
}

async function handleTabActivated(activeInfo) {
  await ensureHistoryLoaded();

  const tab = await safeGetTab(activeInfo.tabId);
  if (!tab) {
    windowHistory = removeTabFromAllWindowHistories(windowHistory, activeInfo.tabId);
    await persistWindowHistory();
    return;
  }

  windowHistory = addToWindowHistory(
    windowHistory,
    activeInfo.windowId,
    activeInfo.tabId,
    MAX_HISTORY_SIZE,
  );

  await persistWindowHistory();
  logInfo('Tab activated:', activeInfo.tabId, 'window history:', windowHistory);
}

async function handleTabRemoved(tabId, removeInfo) {
  await ensureHistoryLoaded();

  const previousWindowHistory = getWindowHistory(windowHistory, removeInfo.windowId);
  const wasMostRecentInWindow = previousWindowHistory[0] === tabId;

  windowHistory = removeTabFromAllWindowHistories(windowHistory, tabId);
  await persistWindowHistory();

  logInfo('Tab removed:', tabId, 'window:', removeInfo.windowId, 'window history:', windowHistory);

  if (!wasMostRecentInWindow || removeInfo.isWindowClosing) {
    return;
  }

  const nextTab = await findNextTabToFocus(removeInfo.windowId);
  if (!nextTab) {
    logInfo('No previous tab found in the same window:', removeInfo.windowId);
    return;
  }

  const updatedTab = await safeUpdateTab(nextTab.id, { active: true });
  if (updatedTab) {
    logInfo('Restored focus to tab:', updatedTab.id, 'window:', updatedTab.windowId);
  }
}

async function handleWindowRemoved(windowId) {
  await ensureHistoryLoaded();

  windowHistory = removeWindowHistory(windowHistory, windowId);
  await persistWindowHistory();

  logInfo('Window removed:', windowId, 'window history:', windowHistory);
}

async function findNextTabToFocus(windowId) {
  const invalidTabIds = [];

  for (const tabId of getWindowHistory(windowHistory, windowId)) {
    const tab = await safeGetTab(tabId);
    if (!tab || tab.windowId !== windowId) {
      invalidTabIds.push(tabId);
      continue;
    }

    if (invalidTabIds.length > 0) {
      windowHistory = invalidTabIds.reduce(
        (nextHistory, invalidTabId) =>
          removeTabFromAllWindowHistories(nextHistory, invalidTabId),
        windowHistory,
      );
      await persistWindowHistory();
    }

    return tab;
  }

  if (invalidTabIds.length > 0) {
    windowHistory = invalidTabIds.reduce(
      (nextHistory, invalidTabId) =>
        removeTabFromAllWindowHistories(nextHistory, invalidTabId),
      windowHistory,
    );
    await persistWindowHistory();
  }

  return null;
}

async function safeGetTab(tabId) {
  try {
    if (!isValidTabId(tabId)) {
      return null;
    }

    return await chrome.tabs.get(tabId);
  } catch (error) {
    if (!String(error?.message || '').includes('No tab with id')) {
      logError('Error getting tab:', error, 'tabId:', tabId);
    }

    return null;
  }
}

async function safeUpdateTab(tabId, updateProperties) {
  try {
    if (!isValidTabId(tabId)) {
      return null;
    }

    return await chrome.tabs.update(tabId, updateProperties);
  } catch (error) {
    if (!String(error?.message || '').includes('No tab with id')) {
      logError('Error updating tab:', error, 'tabId:', tabId);
    }

    return null;
  }
}

function isValidTabId(tabId) {
  return Number.isInteger(tabId) && tabId >= 0;
}

function isValidWindowId(windowId) {
  return Number.isInteger(windowId) && windowId >= 0;
}

function logInfo(message, ...args) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [INFO] ${message}`, ...args);
}

function logError(message, error, ...args) {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] [ERROR] ${message}`, error, ...args);
}

if (typeof self !== 'undefined') {
  self.addEventListener('unhandledrejection', (event) => {
    logError('Unhandled promise rejection:', event.reason);
    event.preventDefault();
  });
}
