# Chrome Web Store Description

## Summary

Last Tab Focus is a Chrome extension dedicated to a single behavior: when you close the current tab, it restores focus to the tab you were using just before it.

Chrome usually moves focus by tab order. This extension uses recent tab activity instead.

## Key Features

### Focused Scope

- Built specifically for restoring the last used tab on close
- Does not try to replace broader tab-management extensions

### Tab Restore Behavior

- Restores the last used tab instead of the next tab in order
- Keeps the behavior limited to the same browser window

### Modern Chrome Support

- Works with Manifest V3
- Preserves in-session tab history across service worker restarts
- Falls back to normal Chrome behavior when there is no valid tab to restore

### Local and Minimal

- No external communication
- No analytics or tracking
- All processing stays inside your browser session
