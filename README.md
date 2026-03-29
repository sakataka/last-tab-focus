# Last Tab Focus

Last Tab Focus is a lightweight Chrome extension that switches back to the tab you were actually using before when you close the current tab.

Instead of following Chrome's default tab order, it restores focus based on your recent activity in the same window.

## Features

- 🔄 **Smart Tab Switching**: Restores the most recently used tab instead of the next tab in order
- 🪟 **Window-Aware History**: Only restores focus within the same window as the closed tab
- 🔁 **MV3 Session Recovery**: Keeps in-session history across service worker restarts
- ⚡ **Deterministic Cleanup**: Removes stale tab IDs when tabs or windows disappear
- 🔒 **Privacy-Friendly**: No external communication or analytics

## Installation

### From Chrome Web Store (Recommended)

Install the published extension from the Chrome Web Store listing if you want automatic updates.

Store description text is available in [`STORE_DESCRIPTION.md`](./STORE_DESCRIPTION.md).

### From GitHub Releases

1. Download the latest `.zip` file from the [Releases page](../../releases)
2. Extract the ZIP file to a folder
3. Open Chrome and navigate to `chrome://extensions/`
4. Enable "Developer mode" in the top right
5. Click "Load unpacked" and select the extracted folder
6. The extension will be loaded and ready to use

### From Source (Developer Mode)

1. Clone this repository:
   ```bash
   git clone https://github.com/sakataka/last-tab-focus.git
   cd last-tab-focus
   ```
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the project directory
5. The extension will be loaded and ready to use

## Usage

1. Open multiple tabs in Chrome
2. Switch between tabs to build focus history
3. Close an active tab (Ctrl+W / ⌘+W)
4. The extension will automatically focus the previously active tab in the same window
5. If no valid history entry exists, Chrome keeps its default tab-selection behavior

## Technical Details

- **Manifest Version**: 3 (latest Chrome extension standard)
- **Permissions**: `tabs`, `storage`
- **Architecture**: Service Worker background script
- **Session Storage**: `chrome.storage.session` keeps in-memory history across service worker restarts
- **Minimum Chrome Version**: 102

## File Structure

```
last-tab-focus/
├── manifest.json          # Extension configuration
├── background.js          # Main functionality
├── history.mjs            # Pure history helpers
├── history.test.mjs       # Lightweight regression tests
├── icons/                 # Extension icons
├── LICENSE.md            # MIT License
├── PRIVACY.md            # Privacy Policy
├── README.md             # This file
└── TESTING.md            # Manual regression checklist
```

## Development

### Prerequisites

- Chrome Browser (version 102 or higher)
- Git (for version control)

### Setup for Development

1. Fork this repository on GitHub
2. Clone your fork:
   ```bash
   git clone https://github.com/sakataka/last-tab-focus.git
   cd last-tab-focus
   ```
3. Load the extension in Chrome:
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the project directory

### Testing

Run the lightweight regression test suite:

```bash
node --test history.test.mjs
```

Then follow the manual checklist in [`TESTING.md`](./TESTING.md) to verify browser behavior.

### Debugging

1. Go to `chrome://extensions/`
2. Find "Last Tab Focus" extension
3. Click "service worker" inspection link
4. View logs in the developer console

### Making Changes

1. Make your changes to the source code
2. Test thoroughly using the regression tests and manual checklist
3. Ensure no console errors in service worker
4. Test in different scenarios (single window, multiple windows, many tabs)

## Implementation Details

### Tab History Management

- Maintains a per-window map of tab IDs with most recent first
- Maximum history size: 50 tabs per window
- Stores history in `chrome.storage.session`
- Cleans invalid, closed, or moved tabs during hydration and removal handling

### Event Handling

- `chrome.tabs.onActivated`: Records tab activation
- `chrome.tabs.onRemoved`: Handles tab closure and focus switching
- `chrome.windows.onRemoved`: Cleans up history on window closure

### Error Handling

- Safe tab operations with proper error catching
- Invalid tab and window ID management
- Unhandled promise rejection handling

## License

MIT License - Feel free to use and modify as needed.

## Contributing

We welcome contributions! Please follow these steps:

### Reporting Issues

1. Check existing issues to avoid duplicates
2. Use the issue template (if available)
3. Include:
   - Chrome version
   - Extension version
   - Steps to reproduce
   - Expected vs actual behavior
   - Console logs (if applicable)

### Contributing Code

1. Fork the repository
2. Create a feature branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. Make your changes following the existing code style
4. Test thoroughly:
   - Run `node --test history.test.mjs`
   - Follow [`TESTING.md`](./TESTING.md)
   - Test with multiple tabs and windows
   - Check service worker console for errors
5. Commit your changes with clear messages
6. Push to your fork and submit a pull request

### Code Guidelines

- Follow the existing code style and structure
- Add comments for complex logic
- Include error handling for new features
- Maintain compatibility with Chrome 102+
- Keep the extension lightweight and fast

### Pull Request Process

1. Ensure your code passes all tests
2. Update documentation if needed
3. Keep PRs focused on a single feature/fix
4. Describe what your PR does and why
5. Reference any related issues

## Support

If you encounter any issues:

1. Check the browser console for errors
2. Review the service worker logs
3. Try disabling and re-enabling the extension
4. Create an issue with detailed reproduction steps
