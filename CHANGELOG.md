# Changelog

## [1.1.3] - 2026-04-19

### Fixed
- Retry session-state hydration up to 3 times before falling back to an empty in-memory state
- Document why detached tabs keep their original `windowId` metadata until `onAttached` finishes

### Changed
- Explicitly declare `content_security_policy.extension_pages` in the MV3 manifest
- Packaged the extension as version `1.1.3`

## [1.1.2] - 2026-04-14

### Fixed
- Treated immediate tab clicks after an automatic restore as explicit user actions instead of ignoring them
- Refreshed window-scoped tab metadata when tabs move between windows to keep restore fallback behavior correct

### Changed
- Packaged the extension as version `1.1.2`

## [1.1.1] - 2026-03-29

### Fixed
- Corrected focus restoration when closing tabs opened in sequence, such as `A -> B -> C`, so closing `C` returns to `B` and closing `B` returns to `A`
- Prevent close-induced transient activations from polluting the restore history

### Changed
- Added opener-aware fallback logic for edge cases where the previous tab is not still in focus history
- Rewrote project and store documentation to describe the extension as a single-purpose last-used-tab restore tool
- Updated the release package target to `1.1.1`

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
