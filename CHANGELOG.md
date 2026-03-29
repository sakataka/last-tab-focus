# Changelog

## [1.1.0] - 2026-03-29

### Changed
- Persist tab history in `chrome.storage.session` so MV3 service worker restarts no longer drop the in-session focus history
- Track history per window and restore focus only within the same window as the closed tab
- Remove timing-based focus restoration and use serialized event handling for more predictable behavior
- Keep discarded tabs eligible for focus restoration instead of treating them as invalid
- Raise the minimum supported Chrome version to 102 to match `chrome.storage.session`

### Added
- Pure history helpers in `history.mjs`
- Lightweight regression tests in `history.test.mjs`
- Manual verification checklist in `TESTING.md`

## [1.0.0] - 2024-06-22

### Added
- Initial release of Last Tab Focus extension
- Smart tab switching to previously focused tab when closing current tab
- Multi-window support with independent tab history per window
- Performance optimized tab history management (max 50 tabs)
- Automatic cleanup of invalid/closed tabs
- Robust error handling for edge cases
- Chrome Extension Manifest V3 compatibility
- Support for Chrome 88+ browsers

### Technical Details
- Service worker background script architecture
- Uses `chrome.tabs` API for tab management
- Uses `chrome.windows` API for window information
