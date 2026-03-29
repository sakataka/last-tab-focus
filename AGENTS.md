# Last Tab Focus Chrome Extension

A Chrome extension that moves focus to the previously focused tab when the current tab is closed.

## Feature Overview

- Manage tab focus history
- Automatically focus the last focused tab when a tab is closed
- Remember the focus order across multiple tabs and walk back through that history as tabs are closed

## Technical Notes

### Basic Chrome Extension Structure

- `manifest.json` - Extension configuration file (Manifest V3)
- `background.js` - Background service worker
- `icons/` - Extension icons

### APIs Used

- `chrome.tabs` API - Tab operations and monitoring
- `chrome.windows` API - Window information

### Implementation Approach

1. **Manage tab focus history**
   - Record tabs when they become active
   - Manage the order in an array with the most recent item first

2. **Handle tab close events**
   - Detect tab closures with the `chrome.tabs.onRemoved` event
   - If the closed tab was currently active, choose the next tab from history

3. **Data structure**
   ```javascript
   // Manage history with an array of tab IDs
   let tabHistory = [currentTabId, previousTabId, ...]
   ```

### Main Processing Flow

1. A tab becomes active -> add it to the front of the history
2. A tab is closed -> remove it from history and focus the next tab if needed
3. If the history is empty or invalid -> fall back to Chrome's default behavior

## Development Policy

- Keep the implementation as simple as possible
- Target the latest version of Chrome
- Aim for public release
