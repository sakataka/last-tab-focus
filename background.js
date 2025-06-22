// Last Tab Focus Chrome Extension - Background Service Worker

// Tab history management - most recent tab at the front
let tabHistory = [];

// Initialize extension
chrome.runtime.onStartup.addListener(() => {
  logInfo('Last Tab Focus extension started');
  initializeTabHistory();
});

chrome.runtime.onInstalled.addListener(() => {
  logInfo('Last Tab Focus extension installed');
  initializeTabHistory();
});

// Initialize tab history with current tabs
async function initializeTabHistory() {
  try {
    const tabs = await chrome.tabs.query({});
    tabHistory = [];
    
    // Find active tab and add to history first
    const activeTabs = tabs.filter(tab => tab.active);
    activeTabs.forEach(tab => {
      if (!tabHistory.includes(tab.id)) {
        tabHistory.unshift(tab.id);
      }
    });
    
    logInfo('Tab history initialized:', tabHistory);
  } catch (error) {
    logError('Failed to initialize tab history:', error);
  }
}

// Tab history management functions

// Add tab to history (most recent first)
function addToHistory(tabId) {
  if (!tabId || tabId < 0) return;
  
  // Remove existing entry if present
  const existingIndex = tabHistory.indexOf(tabId);
  if (existingIndex !== -1) {
    tabHistory.splice(existingIndex, 1);
  }
  
  // Add to front
  tabHistory.unshift(tabId);
  
  // Limit history size to prevent memory issues
  const MAX_HISTORY_SIZE = 50;
  if (tabHistory.length > MAX_HISTORY_SIZE) {
    tabHistory = tabHistory.slice(0, MAX_HISTORY_SIZE);
  }
  
  logInfo('Tab added to history:', tabId, 'Current history:', tabHistory);
}

// Remove tab from history
function removeFromHistory(tabId) {
  const index = tabHistory.indexOf(tabId);
  if (index !== -1) {
    tabHistory.splice(index, 1);
    logInfo('Tab removed from history:', tabId, 'Current history:', tabHistory);
  }
}

// Get next tab to focus (skip invalid tabs)
async function getNextTabToFocus(currentWindowId = null) {
  const invalidTabs = [];
  
  for (let i = 0; i < tabHistory.length; i++) {
    const tabId = tabHistory[i];
    const tab = await safeGetTab(tabId);
    
    if (tab && !tab.discarded) {
      // If windowId is specified, only consider tabs in the same window
      if (currentWindowId === null || tab.windowId === currentWindowId) {
        return tab;
      }
    } else if (!tab) {
      // Tab doesn't exist, mark for removal
      invalidTabs.push(tabId);
    }
  }
  
  // Clean up invalid tabs
  invalidTabs.forEach(tabId => removeFromHistory(tabId));
  
  return null;
}

// Clean up history by removing invalid tabs
async function cleanupHistory() {
  const validTabs = [];
  
  for (const tabId of tabHistory) {
    try {
      const tab = await chrome.tabs.get(tabId);
      if (tab && !tab.discarded) {
        validTabs.push(tabId);
      }
    } catch (error) {
      // Tab doesn't exist, skip
    }
  }
  
  tabHistory = validTabs;
  logInfo('History cleaned up:', tabHistory);
}

// Event listeners

// Tab activated event - add to history
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    logInfo('Tab activated:', activeInfo.tabId, 'in window:', activeInfo.windowId);
    
    // Get tab information to verify it's valid
    const tab = await safeGetTab(activeInfo.tabId);
    if (tab && !tab.discarded) {
      addToHistory(activeInfo.tabId);
      
      // Periodically clean up history (every 10th activation)
      if (tabHistory.length > 10 && Math.random() < 0.1) {
        await cleanupHistory();
      }
    } else {
      logWarn('Skipping invalid or discarded tab:', activeInfo.tabId);
    }
  } catch (error) {
    logError('Error handling tab activation:', error);
  }
});

// Tab removed event - handle focus switching
chrome.tabs.onRemoved.addListener(async (tabId, removeInfo) => {
  try {
    logInfo('Tab removed:', tabId, 'Window closing:', removeInfo.isWindowClosing);
    
    // Check if the removed tab was the active tab
    const wasActiveTab = tabHistory.length > 0 && tabHistory[0] === tabId;
    
    // Remove from history
    removeFromHistory(tabId);
    
    // Only switch focus if the removed tab was active and window is not closing
    if (wasActiveTab && !removeInfo.isWindowClosing) {
      // Get window information for better tab selection
      let currentWindowId = null;
      try {
        const windows = await chrome.windows.getAll();
        const currentWindow = windows.find(win => win.focused);
        currentWindowId = currentWindow ? currentWindow.id : null;
      } catch (error) {
        logWarn('Could not determine current window:', error);
      }
      
      const nextTab = await getNextTabToFocus(currentWindowId);
      if (nextTab) {
        // Add small delay to avoid race conditions
        setTimeout(async () => {
          const success = await safeUpdateTab(nextTab.id, { active: true });
          if (success) {
            logInfo('Switched focus to tab:', nextTab.id, 'in window:', nextTab.windowId);
          } else {
            logError('Failed to switch focus to tab:', nextTab.id);
          }
        }, 10);
      } else {
        logInfo('No previous tab found in history for current window');
      }
    }
  } catch (error) {
    logError('Error handling tab removal:', error);
  }
});

// Window removed event - clean up history
chrome.windows.onRemoved.addListener(async (windowId) => {
  try {
    logInfo('Window removed:', windowId);
    
    // Get remaining tabs to clean up history
    const remainingTabs = await chrome.tabs.query({});
    const remainingTabIds = remainingTabs.map(tab => tab.id);
    
    // Filter history to only include existing tabs
    tabHistory = tabHistory.filter(tabId => remainingTabIds.includes(tabId));
    logInfo('History cleaned up after window removal:', tabHistory);
  } catch (error) {
    logError('Error handling window removal:', error);
  }
});

// Error handling utilities

// Enhanced logging with timestamps
function logInfo(message, ...args) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [INFO] ${message}`, ...args);
}

function logError(message, error, ...args) {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] [ERROR] ${message}`, error, ...args);
}

function logWarn(message, ...args) {
  const timestamp = new Date().toISOString();
  console.warn(`[${timestamp}] [WARN] ${message}`, ...args);
}

// Check for permissions and handle permission errors
async function checkPermissions() {
  try {
    const permissions = await chrome.permissions.getAll();
    logInfo('Current permissions:', permissions);
    
    if (!permissions.permissions.includes('tabs')) {
      logError('Missing tabs permission');
      return false;
    }
    return true;
  } catch (error) {
    logError('Failed to check permissions:', error);
    return false;
  }
}

// Safe tab operations with error handling
async function safeGetTab(tabId) {
  try {
    if (!tabId || tabId < 0) {
      logWarn('Invalid tab ID provided:', tabId);
      return null;
    }
    
    const tab = await chrome.tabs.get(tabId);
    if (!tab) {
      logWarn('Tab not found:', tabId);
      return null;
    }
    
    return tab;
  } catch (error) {
    if (error.message && error.message.includes('No tab with id')) {
      logInfo('Tab no longer exists:', tabId);
    } else {
      logError('Error getting tab:', error, 'tabId:', tabId);
    }
    return null;
  }
}

async function safeUpdateTab(tabId, updateProps) {
  try {
    if (!tabId || tabId < 0) {
      logWarn('Invalid tab ID for update:', tabId);
      return false;
    }
    
    await chrome.tabs.update(tabId, updateProps);
    return true;
  } catch (error) {
    if (error.message && error.message.includes('No tab with id')) {
      logInfo('Cannot update tab - tab no longer exists:', tabId);
    } else if (error.message && error.message.includes('Cannot access')) {
      logWarn('Permission denied for tab update:', tabId);
    } else {
      logError('Error updating tab:', error, 'tabId:', tabId);
    }
    return false;
  }
}

// Global error handler for unhandled promise rejections
if (typeof self !== 'undefined') {
  self.addEventListener('unhandledrejection', (event) => {
    logError('Unhandled promise rejection:', event.reason);
    event.preventDefault();
  });
}

// Check if Chrome APIs are available
if (typeof chrome !== 'undefined' && chrome.tabs) {
  logInfo('Chrome tabs API available');
  checkPermissions();
} else {
  logError('Chrome tabs API not available');
}