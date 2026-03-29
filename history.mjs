export const MAX_HISTORY_SIZE = 50;

export function normalizeWindowHistory(rawWindowHistory, maxHistorySize = MAX_HISTORY_SIZE) {
  if (!rawWindowHistory || typeof rawWindowHistory !== 'object' || Array.isArray(rawWindowHistory)) {
    return {};
  }

  const normalizedHistory = {};

  for (const [windowKey, rawTabIds] of Object.entries(rawWindowHistory)) {
    const windowId = Number(windowKey);
    if (!Number.isInteger(windowId) || windowId < 0 || !Array.isArray(rawTabIds)) {
      continue;
    }

    const tabIds = [];
    const seenTabIds = new Set();

    for (const rawTabId of rawTabIds) {
      const tabId = Number(rawTabId);
      if (!Number.isInteger(tabId) || tabId < 0 || seenTabIds.has(tabId)) {
        continue;
      }

      seenTabIds.add(tabId);
      tabIds.push(tabId);

      if (tabIds.length >= maxHistorySize) {
        break;
      }
    }

    if (tabIds.length > 0) {
      normalizedHistory[String(windowId)] = tabIds;
    }
  }

  return normalizedHistory;
}

export function addToWindowHistory(windowHistory, windowId, tabId, maxHistorySize = MAX_HISTORY_SIZE) {
  if (!Number.isInteger(windowId) || windowId < 0 || !Number.isInteger(tabId) || tabId < 0) {
    return normalizeWindowHistory(windowHistory, maxHistorySize);
  }

  const nextHistory = normalizeWindowHistory(windowHistory, maxHistorySize);
  const windowKey = String(windowId);
  const currentWindowHistory = getWindowHistory(nextHistory, windowId).filter((currentTabId) => {
    return currentTabId !== tabId;
  });

  currentWindowHistory.unshift(tabId);
  nextHistory[windowKey] = currentWindowHistory.slice(0, maxHistorySize);

  return nextHistory;
}

export function getWindowHistory(windowHistory, windowId) {
  const normalizedHistory = normalizeWindowHistory(windowHistory, MAX_HISTORY_SIZE);
  return normalizedHistory[String(windowId)] || [];
}

export function removeTabFromAllWindowHistories(windowHistory, tabId) {
  if (!Number.isInteger(tabId) || tabId < 0) {
    return normalizeWindowHistory(windowHistory, MAX_HISTORY_SIZE);
  }

  const nextHistory = normalizeWindowHistory(windowHistory, MAX_HISTORY_SIZE);
  const updatedHistory = {};

  for (const [windowKey, tabIds] of Object.entries(nextHistory)) {
    const nextTabIds = tabIds.filter((currentTabId) => currentTabId !== tabId);
    if (nextTabIds.length > 0) {
      updatedHistory[windowKey] = nextTabIds;
    }
  }

  return updatedHistory;
}

export function removeWindowHistory(windowHistory, windowId) {
  const nextHistory = normalizeWindowHistory(windowHistory, MAX_HISTORY_SIZE);
  delete nextHistory[String(windowId)];
  return nextHistory;
}

export function pruneWindowHistory(windowHistory, openTabsById, maxHistorySize = MAX_HISTORY_SIZE) {
  const normalizedHistory = normalizeWindowHistory(windowHistory, maxHistorySize);
  const prunedHistory = {};

  for (const [windowKey, tabIds] of Object.entries(normalizedHistory)) {
    const nextTabIds = [];

    for (const tabId of tabIds) {
      const tab = openTabsById[tabId];
      if (!tab || Number(tab.windowId) !== Number(windowKey)) {
        continue;
      }

      nextTabIds.push(tabId);
      if (nextTabIds.length >= maxHistorySize) {
        break;
      }
    }

    if (nextTabIds.length > 0) {
      prunedHistory[windowKey] = nextTabIds;
    }
  }

  return prunedHistory;
}
