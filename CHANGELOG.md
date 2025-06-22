# Changelog

All notable changes to the Last Tab Focus Chrome extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Improved repository structure for open source contributions
- Comprehensive contributing guidelines
- GitHub issue and pull request templates

### Changed
- Reorganized development files into `dev/` directory
- Enhanced `.gitignore` for better security and organization
- Updated documentation for public repository

## [1.0.0] - 2024-06-22

### Added
- Initial release of Last Tab Focus extension
- Smart tab switching to previously focused tab when closing current tab
- Multi-window support with independent tab history per window
- Performance optimized tab history management (max 50 tabs)
- Automatic cleanup of invalid/closed tabs
- Robust error handling for edge cases
- Debug logging for troubleshooting
- Chrome Extension Manifest V3 compatibility
- Support for Chrome 88+ browsers

### Features
- **Tab History Management**: Maintains array of tab IDs with most recent first
- **Event Handling**: Responds to tab activation, removal, and window closure events
- **Error Handling**: Safe operations with proper error catching and logging
- **Performance**: Efficient memory usage with periodic cleanup
- **Multi-Window**: Independent operation across multiple browser windows

### Technical Details
- Service worker background script architecture
- Uses `chrome.tabs` API for tab management
- Uses `chrome.windows` API for window information
- Minimum Chrome version: 88
- Manifest version: 3

### Documentation
- Comprehensive README with installation and usage instructions
- MIT License for open source use
- Privacy Policy compliant with Chrome Web Store requirements
- Technical implementation details and API usage

---

## Version History Format

### [Version] - Date

#### Added
- New features and capabilities

#### Changed
- Changes to existing functionality

#### Deprecated
- Features that will be removed in future versions

#### Removed
- Features that have been removed

#### Fixed
- Bug fixes and corrections

#### Security
- Security-related improvements

---

## Release Notes

### 1.0.0 - Initial Release

This is the first public release of Last Tab Focus, a Chrome extension designed to improve browsing efficiency by automatically switching focus to the previously active tab when closing the current tab.

**Key Highlights:**
- ✅ Works with Chrome 88 and later
- ✅ Multi-window support
- ✅ Performance optimized
- ✅ Robust error handling
- ✅ Privacy-focused (no data collection)
- ✅ Open source (MIT License)

**Installation:**
- Available through Chrome Web Store (pending review)
- Can be installed from GitHub releases
- Can be built from source for developers

**Testing:**
Thoroughly tested with:
- Single and multiple windows
- Various tab counts (1 to 100+ tabs)
- Edge cases (discarded tabs, invalid tabs, window closures)
- Different Chrome versions (88, 100, 120+)

---

## Contributing

This changelog is maintained as part of our open source project. When contributing:

1. **Add entries** to the `[Unreleased]` section for new changes
2. **Follow the format** established above
3. **Be descriptive** about what changed and why
4. **Include technical details** when relevant for developers
5. **Reference issues** when applicable (e.g., "Fixes #123")

When releasing a new version:
1. Move entries from `[Unreleased]` to new version section
2. Add release date
3. Create new empty `[Unreleased]` section
4. Update version links at bottom of file

## Version Links

[Unreleased]: https://github.com/YOUR_USERNAME/last-tab-focus/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/YOUR_USERNAME/last-tab-focus/releases/tag/v1.0.0