export const MAX_HISTORY_SIZE = 50;

function normalizeTabIdList(rawTabIds, maxHistorySize = MAX_HISTORY_SIZE) {
  const tabIds = [];
  const seenTabIds = new Set();

  for (const rawTabId of Array.isArray(rawTabIds) ? rawTabIds : []) {
    const tabId = parseTabId(rawTabId);
    if (!isValidTabId(tabId) || seenTabIds.has(tabId)) {
      continue;
    }

    seenTabIds.add(tabId);
    tabIds.push(tabId);

    if (tabIds.length >= maxHistorySize) {
      break;
    }
  }

  return tabIds;
}

export function replaceTabInTabIdList(
  rawTabIds,
  removedTabId,
  addedTabId,
  maxHistorySize = MAX_HISTORY_SIZE,
) {
  if (!isValidTabId(removedTabId) || !isValidTabId(addedTabId)) {
    return normalizeTabIdList(rawTabIds, maxHistorySize);
  }

  const normalizedTabIds = normalizeTabIdList(rawTabIds, maxHistorySize);
  return normalizeTabIdList(
    normalizedTabIds.map((tabId) => {
      return tabId === removedTabId ? addedTabId : tabId;
    }),
    maxHistorySize,
  );
}

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

    const tabIds = normalizeTabIdList(rawTabIds, maxHistorySize);
    if (tabIds.length > 0) {
      normalizedHistory[String(windowId)] = tabIds;
    }
  }

  return normalizedHistory;
}

export function setWindowHistory(windowHistory, windowId, tabIds, maxHistorySize = MAX_HISTORY_SIZE) {
  const nextHistory = normalizeWindowHistory(windowHistory, maxHistorySize);
  const sanitizedTabIds = normalizeTabIdList(tabIds, maxHistorySize);

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

  const nextHistory = normalizeWindowHistory(windowHistory, maxHistorySize);
  const windowKey = String(windowId);
  const currentWindowHistory = (nextHistory[windowKey] || []).filter((currentTabId) => {
    return currentTabId !== tabId;
  });

  currentWindowHistory.unshift(tabId);
  nextHistory[windowKey] = normalizeTabIdList(currentWindowHistory, maxHistorySize);
  return nextHistory;
}

export function getWindowHistory(windowHistory, windowId) {
  if (!windowHistory || typeof windowHistory !== 'object' || Array.isArray(windowHistory)) {
    return [];
  }

  const targetWindowId = Number(windowId);
  if (!isValidWindowId(targetWindowId)) {
    return [];
  }

  let tabIds = [];
  for (const [windowKey, rawTabIds] of Object.entries(windowHistory)) {
    if (Number(windowKey) === targetWindowId && Array.isArray(rawTabIds)) {
      tabIds = normalizeTabIdList(rawTabIds, MAX_HISTORY_SIZE);
    }
  }

  return tabIds;
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

export function replaceTabInAllWindowHistories(windowHistory, removedTabId, addedTabId) {
  if (!isValidTabId(removedTabId) || !isValidTabId(addedTabId)) {
    return normalizeWindowHistory(windowHistory, MAX_HISTORY_SIZE);
  }

  const normalizedHistory = normalizeWindowHistory(windowHistory, MAX_HISTORY_SIZE);
  const updatedHistory = {};

  for (const [windowKey, tabIds] of Object.entries(normalizedHistory)) {
    const nextTabIds = replaceTabInTabIdList(tabIds, removedTabId, addedTabId, MAX_HISTORY_SIZE);

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
      : parseTabId(rawMetadata.openerTabId);

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

export function replaceTabMetadata(tabMetadata, removedTabId, addedTabId, addedTab = null) {
  const nextTabMetadata = normalizeTabMetadata(tabMetadata);
  if (!isValidTabId(removedTabId) || !isValidTabId(addedTabId)) {
    return nextTabMetadata;
  }

  const previousMetadata = nextTabMetadata[String(removedTabId)];
  delete nextTabMetadata[String(removedTabId)];

  if (addedTab && isValidTabId(addedTab.id) && isValidWindowId(addedTab.windowId)) {
    nextTabMetadata[String(addedTab.id)] = {
      windowId: addedTab.windowId,
      openerTabId: isValidTabId(addedTab.openerTabId)
        ? addedTab.openerTabId
        : previousMetadata?.openerTabId ?? null,
    };
  } else if (previousMetadata) {
    nextTabMetadata[String(addedTabId)] = previousMetadata;
  }

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
      previousHistory: normalizeTabIdList(previousHistory, MAX_HISTORY_SIZE),
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
    previousHistory: normalizeTabIdList(record.previousHistory, MAX_HISTORY_SIZE),
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

export function replaceTabInActivationByWindow(lastActivationByWindow, removedTabId, addedTabId) {
  if (!isValidTabId(removedTabId) || !isValidTabId(addedTabId)) {
    return normalizeActivationByWindow(lastActivationByWindow);
  }

  const nextActivationByWindow = normalizeActivationByWindow(lastActivationByWindow);

  for (const [windowKey, record] of Object.entries(nextActivationByWindow)) {
    nextActivationByWindow[windowKey] = {
      ...record,
      tabId: record.tabId === removedTabId ? addedTabId : record.tabId,
      previousHistory: replaceTabInTabIdList(
        record.previousHistory,
        removedTabId,
        addedTabId,
        MAX_HISTORY_SIZE,
      ),
    };
  }

  return nextActivationByWindow;
}

export function removeWindowActivation(lastActivationByWindow, windowId) {
  const nextActivationByWindow = normalizeActivationByWindow(lastActivationByWindow);
  delete nextActivationByWindow[String(windowId)];
  return nextActivationByWindow;
}

export function moveTabInActivationByWindow(lastActivationByWindow, tabId, windowId) {
  // removeTabFromActivationByWindow already removes tabId from all windows'
  // active records and previousHistory, so no further per-window filtering is needed.
  return removeTabFromActivationByWindow(lastActivationByWindow, tabId);
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
  let openerFallbackTabId = null;
  if (removedWasMostRecent) {
    const openerTabId = normalizedTabMetadata[String(removedTabId)]?.openerTabId ?? null;
    const openerWindowId = normalizedTabMetadata[String(removedTabId)]?.windowId ?? null;
    if (isValidTabId(openerTabId) && openerWindowId === windowId) {
      openerFallbackTabId = openerTabId;
    }

    restoreTargetTabId = getWindowHistory(nextWindowHistory, windowId)[0] ?? null;

    if (!isValidTabId(restoreTargetTabId)) {
      restoreTargetTabId = openerFallbackTabId;
    }
  }

  return {
    windowHistory: nextWindowHistory,
    restoreTargetTabId: isValidTabId(restoreTargetTabId) ? restoreTargetTabId : null,
    openerFallbackTabId,
    removedWasMostRecent,
    usedTransientActivation,
  };
}

export function resolvePendingRestoreActivation({
  windowHistory,
  lastActivationByWindow,
  windowId,
  activatedTabId,
  eventTime,
  pendingRestore,
}) {
  const currentWindowHistory = getWindowHistory(windowHistory, windowId);
  const previousHistory = currentWindowHistory;

  if (!pendingRestore) {
    return {
      action: 'normal',
      windowHistory,
      lastActivationByWindow,
      previousHistory,
    };
  }

  const timeDelta = eventTime - pendingRestore.removalTime;
  const isExpired = !Number.isFinite(timeDelta) || timeDelta > pendingRestore.restoreWindowMs;
  if (isExpired) {
    return {
      action: 'expired',
      windowHistory,
      lastActivationByWindow,
      previousHistory,
    };
  }

  if (activatedTabId === pendingRestore.targetTabId) {
    const nextWindowHistory = setWindowHistory(
      windowHistory,
      windowId,
      pendingRestore.historyAfterClose,
      MAX_HISTORY_SIZE,
    );

    return {
      action: 'confirmed',
      windowHistory: nextWindowHistory,
      lastActivationByWindow,
      previousHistory: getWindowHistory(nextWindowHistory, windowId),
    };
  }

  return {
    action: 'override',
    windowHistory,
    lastActivationByWindow,
    previousHistory,
  };
}

function isValidTabId(tabId) {
  return Number.isInteger(tabId) && tabId >= 0;
}

function parseTabId(rawTabId) {
  if (typeof rawTabId === 'number') {
    return rawTabId;
  }

  if (typeof rawTabId === 'string' && /^\d+$/.test(rawTabId)) {
    return Number(rawTabId);
  }

  return null;
}

function isValidWindowId(windowId) {
  return Number.isInteger(windowId) && windowId >= 0;
}
