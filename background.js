import {
  MAX_HISTORY_SIZE,
  addToWindowHistory,
  getWindowHistory,
  normalizeActivationByWindow,
  normalizeTabMetadata,
  normalizeWindowHistory,
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
  setActivationRecord,
  setWindowHistory,
  upsertTabMetadata,
} from './history.mjs';

const STATE_STORAGE_KEY = 'sessionState';
const RESTORE_WINDOW_MS = 1500;

let windowHistory = {};
let tabMetadata = {};
let lastActivationByWindow = {};
let historyLoaded = false;
let historyLoadPromise = null;
let historyTaskQueue = Promise.resolve();
let pendingRestoreByWindow = {};

chrome.runtime.onStartup.addListener(() => {
  void enqueueHistoryTask('startup reset', async () => {
    await resetStateFromCurrentTabs('browser startup');
  });
});

chrome.runtime.onInstalled.addListener(() => {
  void enqueueHistoryTask('install reset', async () => {
    await resetStateFromCurrentTabs('extension install/update');
  });
});

chrome.tabs.onCreated.addListener((tab) => {
  void enqueueHistoryTask('tab creation', async () => {
    await handleTabCreated(tab);
  });
});

chrome.tabs.onActivated.addListener((activeInfo) => {
  const eventTime = Date.now();

  void enqueueHistoryTask('tab activation', async () => {
    await handleTabActivated(activeInfo, eventTime);
  });
});

chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  const eventTime = Date.now();

  void enqueueHistoryTask('tab removal', async () => {
    await handleTabRemoved(tabId, removeInfo, eventTime);
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
    historyLoadPromise = hydrateState();
  }

  await historyLoadPromise;
}

async function hydrateState() {
  try {
    const [{ [STATE_STORAGE_KEY]: storedState }, openTabs] = await Promise.all([
      chrome.storage.session.get(STATE_STORAGE_KEY),
      chrome.tabs.query({}),
    ]);

    const openTabsById = buildOpenTabsById(openTabs);
    const normalizedState = storedState && typeof storedState === 'object' ? storedState : {};

    let nextWindowHistory = normalizeWindowHistory(normalizedState.windowHistory, MAX_HISTORY_SIZE);
    if (Object.keys(nextWindowHistory).length === 0) {
      nextWindowHistory = buildHistoryFromTabs(openTabs);
    }

    windowHistory = pruneWindowHistory(nextWindowHistory, openTabsById, MAX_HISTORY_SIZE);
    tabMetadata = pruneTabMetadata(
      normalizeTabMetadata(normalizedState.tabMetadata),
      openTabsById,
    );
    lastActivationByWindow = pruneActivationByWindow(
      normalizeActivationByWindow(normalizedState.lastActivationByWindow),
      openTabsById,
    );
    pendingRestoreByWindow = {};
    historyLoaded = true;

    await persistState();
    logInfo('Session state hydrated:', {
      windowHistory,
      tabMetadata,
      lastActivationByWindow,
    });
  } catch (error) {
    windowHistory = {};
    tabMetadata = {};
    lastActivationByWindow = {};
    pendingRestoreByWindow = {};
    historyLoaded = true;
    logError('Failed to hydrate session state:', error);
  } finally {
    historyLoadPromise = null;
  }
}

async function resetStateFromCurrentTabs(reason) {
  const openTabs = await chrome.tabs.query({});

  windowHistory = buildHistoryFromTabs(openTabs);
  tabMetadata = buildTabMetadataFromTabs(openTabs);
  lastActivationByWindow = buildActivationStateFromTabs(openTabs, windowHistory);
  pendingRestoreByWindow = {};
  historyLoaded = true;
  historyLoadPromise = null;

  await persistState();
  logInfo(`Session state reset after ${reason}:`, {
    windowHistory,
    tabMetadata,
    lastActivationByWindow,
  });
}

async function persistState() {
  await chrome.storage.session.set({
    [STATE_STORAGE_KEY]: {
      windowHistory,
      tabMetadata,
      lastActivationByWindow,
    },
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

function buildTabMetadataFromTabs(tabs) {
  let nextTabMetadata = {};

  for (const tab of tabs) {
    nextTabMetadata = upsertTabMetadata(nextTabMetadata, tab);
  }

  return nextTabMetadata;
}

function buildActivationStateFromTabs(tabs, currentWindowHistory) {
  const nextActivationByWindow = {};

  for (const tab of tabs) {
    if (!tab.active || !isValidTabId(tab.id) || !isValidWindowId(tab.windowId)) {
      continue;
    }

    nextActivationByWindow[String(tab.windowId)] = {
      tabId: tab.id,
      eventTime: 0,
      previousHistory: getWindowHistory(currentWindowHistory, tab.windowId),
    };
  }

  return nextActivationByWindow;
}

function buildOpenTabsById(tabs) {
  return Object.fromEntries(
    tabs
      .filter((tab) => isValidTabId(tab.id) && isValidWindowId(tab.windowId))
      .map((tab) => [tab.id, tab]),
  );
}

async function handleTabCreated(tab) {
  await ensureHistoryLoaded();

  tabMetadata = upsertTabMetadata(tabMetadata, tab);
  await persistState();
}

async function handleTabActivated(activeInfo, eventTime) {
  await ensureHistoryLoaded();

  const tab = await safeGetTab(activeInfo.tabId);
  if (!tab) {
    windowHistory = removeTabFromAllWindowHistories(windowHistory, activeInfo.tabId);
    tabMetadata = removeTabMetadata(tabMetadata, activeInfo.tabId);
    lastActivationByWindow = removeTabFromActivationByWindow(
      lastActivationByWindow,
      activeInfo.tabId,
    );
    await persistState();
    return;
  }

  tabMetadata = upsertTabMetadata(tabMetadata, tab);

  const pendingRestore = pendingRestoreByWindow[String(activeInfo.windowId)];
  if (pendingRestore) {
    const isExpired = eventTime - pendingRestore.removalTime > RESTORE_WINDOW_MS;
    if (isExpired) {
      delete pendingRestoreByWindow[String(activeInfo.windowId)];
    } else if (activeInfo.tabId !== pendingRestore.targetTabId) {
      logInfo('Ignoring transient activation during close restore:', {
        windowId: activeInfo.windowId,
        tabId: activeInfo.tabId,
        targetTabId: pendingRestore.targetTabId,
      });
      await persistState();
      return;
    } else {
      delete pendingRestoreByWindow[String(activeInfo.windowId)];
      windowHistory = setWindowHistory(
        windowHistory,
        activeInfo.windowId,
        pendingRestore.historyAfterClose,
        MAX_HISTORY_SIZE,
      );
    }
  }

  const previousHistory = getWindowHistory(windowHistory, activeInfo.windowId);

  windowHistory = addToWindowHistory(
    windowHistory,
    activeInfo.windowId,
    activeInfo.tabId,
    MAX_HISTORY_SIZE,
  );
  lastActivationByWindow = setActivationRecord(lastActivationByWindow, activeInfo.windowId, {
    tabId: activeInfo.tabId,
    eventTime,
    previousHistory,
  });

  await persistState();
  logInfo('Tab activated:', activeInfo.tabId, 'window history:', windowHistory);
}

async function handleTabRemoved(tabId, removeInfo, eventTime) {
  await ensureHistoryLoaded();

  const restorePlan = resolveCloseRestorePlan({
    windowHistory,
    windowId: removeInfo.windowId,
    removedTabId: tabId,
    lastActivationByWindow,
    tabMetadata,
    removalTime: eventTime,
    transientActivationWindowMs: RESTORE_WINDOW_MS,
  });

  windowHistory = restorePlan.windowHistory;
  tabMetadata = removeTabMetadata(tabMetadata, tabId);
  lastActivationByWindow = removeTabFromActivationByWindow(lastActivationByWindow, tabId);
  delete pendingRestoreByWindow[String(removeInfo.windowId)];

  await persistState();

  logInfo('Tab removed:', tabId, 'restore plan:', restorePlan);

  if (!restorePlan.removedWasMostRecent || removeInfo.isWindowClosing) {
    return;
  }

  const nextTab = await resolveRestoreTargetTab(removeInfo.windowId, restorePlan.restoreTargetTabId);
  if (!nextTab) {
    logInfo('No valid restore target found in the same window:', removeInfo.windowId);
    return;
  }

  pendingRestoreByWindow[String(removeInfo.windowId)] = {
    targetTabId: nextTab.id,
    removalTime: eventTime,
    historyAfterClose: getWindowHistory(windowHistory, removeInfo.windowId),
  };

  const updatedTab = await safeUpdateTab(nextTab.id, { active: true });
  if (updatedTab) {
    const activeTab = await safeGetActiveTabInWindow(removeInfo.windowId);
    if (activeTab?.id === nextTab.id) {
      delete pendingRestoreByWindow[String(removeInfo.windowId)];
      const previousHistory = getWindowHistory(windowHistory, removeInfo.windowId);

      windowHistory = addToWindowHistory(
        windowHistory,
        removeInfo.windowId,
        nextTab.id,
        MAX_HISTORY_SIZE,
      );
      lastActivationByWindow = setActivationRecord(lastActivationByWindow, removeInfo.windowId, {
        tabId: nextTab.id,
        eventTime,
        previousHistory,
      });
      await persistState();
    }

    logInfo('Requested restore to tab:', updatedTab.id, 'window:', updatedTab.windowId);
  } else {
    delete pendingRestoreByWindow[String(removeInfo.windowId)];
  }
}

async function handleWindowRemoved(windowId) {
  await ensureHistoryLoaded();

  windowHistory = removeWindowHistory(windowHistory, windowId);
  tabMetadata = removeWindowTabMetadata(tabMetadata, windowId);
  lastActivationByWindow = removeWindowActivation(lastActivationByWindow, windowId);
  delete pendingRestoreByWindow[String(windowId)];

  await persistState();

  logInfo('Window removed:', windowId, 'window history:', windowHistory);
}

async function resolveRestoreTargetTab(windowId, restoreTargetTabId) {
  const invalidTabIds = [];

  if (isValidTabId(restoreTargetTabId)) {
    const preferredTab = await safeGetTab(restoreTargetTabId);
    if (preferredTab && preferredTab.windowId === windowId) {
      return preferredTab;
    }

    invalidTabIds.push(restoreTargetTabId);
  }

  for (const tabId of getWindowHistory(windowHistory, windowId)) {
    if (tabId === restoreTargetTabId) {
      continue;
    }

    const tab = await safeGetTab(tabId);
    if (!tab || tab.windowId !== windowId) {
      invalidTabIds.push(tabId);
      continue;
    }

    if (invalidTabIds.length > 0) {
      removeInvalidTabs(invalidTabIds);
      await persistState();
    }

    return tab;
  }

  if (invalidTabIds.length > 0) {
    removeInvalidTabs(invalidTabIds);
    await persistState();
  }

  return null;
}

function removeInvalidTabs(tabIds) {
  for (const tabId of tabIds) {
    windowHistory = removeTabFromAllWindowHistories(windowHistory, tabId);
    tabMetadata = removeTabMetadata(tabMetadata, tabId);
    lastActivationByWindow = removeTabFromActivationByWindow(lastActivationByWindow, tabId);
  }
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

async function safeGetActiveTabInWindow(windowId) {
  try {
    if (!isValidWindowId(windowId)) {
      return null;
    }

    const [activeTab] = await chrome.tabs.query({ active: true, windowId });
    return activeTab || null;
  } catch (error) {
    logError('Error getting active tab in window:', error, 'windowId:', windowId);
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
