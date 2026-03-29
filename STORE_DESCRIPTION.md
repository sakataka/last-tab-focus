# Chrome Web Store Description

## Summary

Last Tab Focus is a lightweight Chrome extension that switches back to the tab you were actually using before when you close the current tab.

Chrome often moves focus by tab order. This extension restores focus by your recent activity instead, so tab closing feels more natural and predictable.

## Key Features

### Smart Tab Switching

- Focuses the most recently used tab when you close the current tab
- Uses your real tab activity instead of simple left/right tab order

### Window-Aware Behavior

- Restores focus only within the same browser window
- Keeps tab history separate for each window

### Reliable in Modern Chrome

- Works with Manifest V3
- Preserves in-session tab history even if the extension service worker restarts
- Falls back to normal Chrome behavior when there is no valid tab to restore

### Lightweight and Private

- No external communication
- No analytics or tracking
- All processing stays inside your browser session

## Good Fit For

- People who keep many tabs open
- Developers moving between docs, code, and tools
- Researchers comparing multiple pages
- Anyone who wants tab closing to follow usage history instead of tab order
