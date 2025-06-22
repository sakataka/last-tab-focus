# Changelog

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