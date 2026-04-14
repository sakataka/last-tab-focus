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

chrome.tabs.onAttached.addListener((tabId, attachInfo) => {
  void enqueueHistoryTask('tab attach', async () => {
    await handleTabAttached(tabId, attachInfo);
  });
});

chrome.tabs.onDetached.addListener((tabId, detachInfo) => {
  void enqueueHistoryTask('tab detach', async () => {
    await handleTabDetached(tabId, detachInfo);
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

  // Passing runTask as both the fulfillment and rejection handler ensures the
  // queue keeps moving even when a previous task throws, while still handling
  // all tasks serially (no concurrent event handlers).
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
    pendingRestoreByWindow =
      normalizedState.pendingRestoreByWindow &&
      typeof normalizedState.pendingRestoreByWindow === 'object' &&
      !Array.isArray(normalizedState.pendingRestoreByWindow)
        ? normalizedState.pendingRestoreByWindow
        : {};
    historyLoaded = true;

    await persistState();
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
}

async function persistState() {
  await chrome.storage.session.set({
    [STATE_STORAGE_KEY]: {
      windowHistory,
      tabMetadata,
      lastActivationByWindow,
      pendingRestoreByWindow,
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
  const pendingResolution = resolvePendingRestoreActivation({
    windowHistory,
    lastActivationByWindow,
    windowId: activeInfo.windowId,
    activatedTabId: activeInfo.tabId,
    eventTime,
    pendingRestore: pendingRestore
      ? {
          ...pendingRestore,
          restoreWindowMs: RESTORE_WINDOW_MS,
        }
      : null,
  });

  if (pendingResolution.action === 'expired' || pendingResolution.action === 'override') {
    delete pendingRestoreByWindow[String(activeInfo.windowId)];
  } else if (pendingResolution.action === 'confirmed') {
    delete pendingRestoreByWindow[String(activeInfo.windowId)];
  }

  if (pendingResolution.action !== 'normal') {
    windowHistory = pendingResolution.windowHistory;
    lastActivationByWindow = pendingResolution.lastActivationByWindow;
  }

  const previousHistory = pendingResolution.previousHistory;

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
}

async function handleTabDetached(tabId, detachInfo) {
  await ensureHistoryLoaded();

  if (!isValidTabId(tabId) || !isValidWindowId(detachInfo.oldWindowId)) {
    return;
  }

  windowHistory = removeTabFromAllWindowHistories(windowHistory, tabId);
  lastActivationByWindow = removeTabFromActivationByWindow(lastActivationByWindow, tabId);
  delete pendingRestoreByWindow[String(detachInfo.oldWindowId)];

  const existingMetadata = normalizeTabMetadata(tabMetadata)[String(tabId)];
  if (existingMetadata) {
    tabMetadata = {
      ...normalizeTabMetadata(tabMetadata),
      [String(tabId)]: {
        ...existingMetadata,
        windowId: detachInfo.oldWindowId,
      },
    };
  }

  await persistState();
}

async function handleTabAttached(tabId, attachInfo) {
  await ensureHistoryLoaded();

  const tab = await safeGetTab(tabId);
  if (!tab) {
    removeInvalidTabs([tabId]);
    await persistState();
    return;
  }

  tabMetadata = upsertTabMetadata(tabMetadata, tab);
  lastActivationByWindow = moveTabInActivationByWindow(
    lastActivationByWindow,
    tabId,
    attachInfo.newWindowId,
  );
  delete pendingRestoreByWindow[String(attachInfo.newWindowId)];

  await persistState();
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

  if (!restorePlan.removedWasMostRecent || removeInfo.isWindowClosing) {
    return;
  }

  const nextTab = await resolveRestoreTargetTab(removeInfo.windowId, restorePlan.restoreTargetTabId);
  if (!nextTab) {
    return;
  }

  pendingRestoreByWindow[String(removeInfo.windowId)] = {
    targetTabId: nextTab.id,
    removalTime: eventTime,
    historyAfterClose: getWindowHistory(windowHistory, removeInfo.windowId),
  };

  // Persist the pending restore before any async Chrome API calls so that a
  // service worker restart between here and the confirmation step can still
  // recover the pending state.
  await persistState();

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
    // If a different tab is now active, pendingRestoreByWindow stays set.
    // handleTabActivated will consume it as 'confirmed', 'override', or 'expired'.
  } else {
    delete pendingRestoreByWindow[String(removeInfo.windowId)];
    // Persist the deletion so that a service worker restart after a failed
    // safeUpdateTab() does not reload a stale pending restore from storage.
    await persistState();
  }
}

async function handleWindowRemoved(windowId) {
  await ensureHistoryLoaded();

  windowHistory = removeWindowHistory(windowHistory, windowId);
  tabMetadata = removeWindowTabMetadata(tabMetadata, windowId);
  lastActivationByWindow = removeWindowActivation(lastActivationByWindow, windowId);
  delete pendingRestoreByWindow[String(windowId)];

  await persistState();
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

  let foundTab = null;
  for (const tabId of getWindowHistory(windowHistory, windowId)) {
    if (tabId === restoreTargetTabId) {
      continue;
    }

    const tab = await safeGetTab(tabId);
    if (!tab || tab.windowId !== windowId) {
      invalidTabIds.push(tabId);
      continue;
    }

    foundTab = tab;
    break;
  }

  if (invalidTabIds.length > 0) {
    removeInvalidTabs(invalidTabIds);
    await persistState();
  }

  return foundTab;
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
