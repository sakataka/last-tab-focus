export const MAX_HISTORY_SIZE = 50;

export function normalizeWindowHistory(rawWindowHistory, maxHistorySize = MAX_HISTORY_SIZE) {
  if (!rawWindowHistory || typeof rawWindowHistory !== 'object' || Array.isArray(rawWindowHistory)) {
    return {};
  }

  const normalizedHistory = {};

  for (const [windowKey, rawTabIds] of Object.entries(rawWindowHistory)) {
    const windowId = Number(windowKey);
    if (!isValidWindowId(windowId) || !Array.isArray(rawTabIds)) {
      continue;
    }

    const tabIds = [];
    const seenTabIds = new Set();

    for (const rawTabId of rawTabIds) {
      const tabId = Number(rawTabId);
      if (!isValidTabId(tabId) || seenTabIds.has(tabId)) {
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

export function setWindowHistory(windowHistory, windowId, tabIds, maxHistorySize = MAX_HISTORY_SIZE) {
  const nextHistory = normalizeWindowHistory(windowHistory, maxHistorySize);
  const sanitizedTabIds = [];
  const seenTabIds = new Set();

  for (const rawTabId of Array.isArray(tabIds) ? tabIds : []) {
    const tabId = Number(rawTabId);
    if (!isValidTabId(tabId) || seenTabIds.has(tabId)) {
      continue;
    }

    seenTabIds.add(tabId);
    sanitizedTabIds.push(tabId);

    if (sanitizedTabIds.length >= maxHistorySize) {
      break;
    }
  }

  if (!isValidWindowId(windowId) || sanitizedTabIds.length === 0) {
    delete nextHistory[String(windowId)];
    return nextHistory;
  }

  nextHistory[String(windowId)] = sanitizedTabIds;
  return nextHistory;
}

export function addToWindowHistory(windowHistory, windowId, tabId, maxHistorySize = MAX_HISTORY_SIZE) {
  if (!isValidWindowId(windowId) || !isValidTabId(tabId)) {
    return normalizeWindowHistory(windowHistory, maxHistorySize);
  }

  const currentWindowHistory = getWindowHistory(windowHistory, windowId).filter((currentTabId) => {
    return currentTabId !== tabId;
  });

  currentWindowHistory.unshift(tabId);
  return setWindowHistory(windowHistory, windowId, currentWindowHistory, maxHistorySize);
}

export function getWindowHistory(windowHistory, windowId) {
  const normalizedHistory = normalizeWindowHistory(windowHistory, MAX_HISTORY_SIZE);
  return normalizedHistory[String(windowId)] || [];
}

export function removeTabFromAllWindowHistories(windowHistory, tabId) {
  if (!isValidTabId(tabId)) {
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

export function normalizeTabMetadata(rawTabMetadata) {
  if (!rawTabMetadata || typeof rawTabMetadata !== 'object' || Array.isArray(rawTabMetadata)) {
    return {};
  }

  const normalizedTabMetadata = {};

  for (const [tabKey, rawMetadata] of Object.entries(rawTabMetadata)) {
    const tabId = Number(tabKey);
    if (!isValidTabId(tabId) || !rawMetadata || typeof rawMetadata !== 'object') {
      continue;
    }

    const windowId = Number(rawMetadata.windowId);
    const openerTabId = rawMetadata.openerTabId === null || rawMetadata.openerTabId === undefined
      ? null
      : Number(rawMetadata.openerTabId);

    if (!isValidWindowId(windowId)) {
      continue;
    }

    normalizedTabMetadata[String(tabId)] = {
      windowId,
      openerTabId: isValidTabId(openerTabId) ? openerTabId : null,
    };
  }

  return normalizedTabMetadata;
}

export function upsertTabMetadata(tabMetadata, tab) {
  const nextTabMetadata = normalizeTabMetadata(tabMetadata);
  if (!tab || !isValidTabId(tab.id) || !isValidWindowId(tab.windowId)) {
    return nextTabMetadata;
  }

  nextTabMetadata[String(tab.id)] = {
    windowId: tab.windowId,
    openerTabId: isValidTabId(tab.openerTabId) ? tab.openerTabId : null,
  };

  return nextTabMetadata;
}

export function removeTabMetadata(tabMetadata, tabId) {
  const nextTabMetadata = normalizeTabMetadata(tabMetadata);
  delete nextTabMetadata[String(tabId)];
  return nextTabMetadata;
}

export function removeWindowTabMetadata(tabMetadata, windowId) {
  const nextTabMetadata = normalizeTabMetadata(tabMetadata);
  const updatedTabMetadata = {};

  for (const [tabKey, metadata] of Object.entries(nextTabMetadata)) {
    if (metadata.windowId !== windowId) {
      updatedTabMetadata[tabKey] = metadata;
    }
  }

  return updatedTabMetadata;
}

export function pruneTabMetadata(tabMetadata, openTabsById) {
  const normalizedTabMetadata = normalizeTabMetadata(tabMetadata);
  const prunedTabMetadata = {};

  for (const [tabKey, metadata] of Object.entries(normalizedTabMetadata)) {
    const tabId = Number(tabKey);
    const tab = openTabsById[tabId];
    if (!tab || tab.windowId !== metadata.windowId) {
      continue;
    }

    prunedTabMetadata[tabKey] = {
      windowId: metadata.windowId,
      openerTabId: isValidTabId(metadata.openerTabId) && openTabsById[metadata.openerTabId]
        ? metadata.openerTabId
        : null,
    };
  }

  return prunedTabMetadata;
}

export function normalizeActivationByWindow(rawActivationByWindow) {
  if (
    !rawActivationByWindow ||
    typeof rawActivationByWindow !== 'object' ||
    Array.isArray(rawActivationByWindow)
  ) {
    return {};
  }

  const normalizedActivationByWindow = {};

  for (const [windowKey, rawRecord] of Object.entries(rawActivationByWindow)) {
    const windowId = Number(windowKey);
    if (!isValidWindowId(windowId) || !rawRecord || typeof rawRecord !== 'object') {
      continue;
    }

    const tabId = Number(rawRecord.tabId);
    const eventTime = Number(rawRecord.eventTime);
    const previousHistory = Array.isArray(rawRecord.previousHistory)
      ? rawRecord.previousHistory
      : [];

    if (!isValidTabId(tabId)) {
      continue;
    }

    normalizedActivationByWindow[String(windowId)] = {
      tabId,
      eventTime: Number.isFinite(eventTime) ? eventTime : 0,
      previousHistory: getWindowHistory({ [windowKey]: previousHistory }, windowId),
    };
  }

  return normalizedActivationByWindow;
}

export function setActivationRecord(lastActivationByWindow, windowId, record) {
  const nextActivationByWindow = normalizeActivationByWindow(lastActivationByWindow);
  if (!isValidWindowId(windowId) || !record || !isValidTabId(record.tabId)) {
    delete nextActivationByWindow[String(windowId)];
    return nextActivationByWindow;
  }

  nextActivationByWindow[String(windowId)] = {
    tabId: record.tabId,
    eventTime: Number.isFinite(record.eventTime) ? record.eventTime : 0,
    previousHistory: getWindowHistory({ [String(windowId)]: record.previousHistory }, windowId),
  };

  return nextActivationByWindow;
}

export function removeTabFromActivationByWindow(lastActivationByWindow, tabId) {
  const nextActivationByWindow = normalizeActivationByWindow(lastActivationByWindow);

  for (const [windowKey, record] of Object.entries(nextActivationByWindow)) {
    if (record.tabId === tabId) {
      delete nextActivationByWindow[windowKey];
    } else {
      nextActivationByWindow[windowKey] = {
        ...record,
        previousHistory: record.previousHistory.filter((currentTabId) => currentTabId !== tabId),
      };
    }
  }

  return nextActivationByWindow;
}

export function removeWindowActivation(lastActivationByWindow, windowId) {
  const nextActivationByWindow = normalizeActivationByWindow(lastActivationByWindow);
  delete nextActivationByWindow[String(windowId)];
  return nextActivationByWindow;
}

export function pruneActivationByWindow(lastActivationByWindow, openTabsById) {
  const normalizedActivationByWindow = normalizeActivationByWindow(lastActivationByWindow);
  const prunedActivationByWindow = {};

  for (const [windowKey, record] of Object.entries(normalizedActivationByWindow)) {
    const tab = openTabsById[record.tabId];
    if (!tab || String(tab.windowId) !== windowKey) {
      continue;
    }

    prunedActivationByWindow[windowKey] = {
      tabId: record.tabId,
      eventTime: record.eventTime,
      previousHistory: record.previousHistory.filter((tabId) => {
        const previousTab = openTabsById[tabId];
        return previousTab && String(previousTab.windowId) === windowKey;
      }),
    };
  }

  return prunedActivationByWindow;
}

export function resolveCloseRestorePlan({
  windowHistory,
  windowId,
  removedTabId,
  lastActivationByWindow,
  tabMetadata,
  removalTime,
  transientActivationWindowMs = 1500,
}) {
  const normalizedWindowHistory = normalizeWindowHistory(windowHistory, MAX_HISTORY_SIZE);
  const normalizedActivationByWindow = normalizeActivationByWindow(lastActivationByWindow);
  const normalizedTabMetadata = normalizeTabMetadata(tabMetadata);

  const currentWindowHistory = getWindowHistory(normalizedWindowHistory, windowId);
  const lastActivation = normalizedActivationByWindow[String(windowId)];
  const usedTransientActivation =
    !!lastActivation &&
    lastActivation.tabId !== removedTabId &&
    currentWindowHistory[0] === lastActivation.tabId &&
    lastActivation.previousHistory[0] === removedTabId &&
    removalTime >= lastActivation.eventTime &&
    removalTime - lastActivation.eventTime <= transientActivationWindowMs;

  const preCloseHistory = usedTransientActivation
    ? lastActivation.previousHistory
    : currentWindowHistory;
  const removedWasMostRecent = preCloseHistory[0] === removedTabId;

  let nextWindowHistory = normalizedWindowHistory;
  if (usedTransientActivation) {
    nextWindowHistory = setWindowHistory(
      nextWindowHistory,
      windowId,
      preCloseHistory,
      MAX_HISTORY_SIZE,
    );
  }

  nextWindowHistory = removeTabFromAllWindowHistories(nextWindowHistory, removedTabId);

  let restoreTargetTabId = null;
  if (removedWasMostRecent) {
    restoreTargetTabId = getWindowHistory(nextWindowHistory, windowId)[0] ?? null;

    if (!isValidTabId(restoreTargetTabId)) {
      const openerTabId = normalizedTabMetadata[String(removedTabId)]?.openerTabId ?? null;
      const openerWindowId = normalizedTabMetadata[String(removedTabId)]?.windowId ?? null;
      if (isValidTabId(openerTabId) && openerWindowId === windowId) {
        restoreTargetTabId = openerTabId;
      }
    }
  }

  return {
    windowHistory: nextWindowHistory,
    restoreTargetTabId: isValidTabId(restoreTargetTabId) ? restoreTargetTabId : null,
    removedWasMostRecent,
    usedTransientActivation,
  };
}

function isValidTabId(tabId) {
  return Number.isInteger(tabId) && tabId >= 0;
}

function isValidWindowId(windowId) {
  return Number.isInteger(windowId) && windowId >= 0;
}
