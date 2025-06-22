# Last Tab Focus

Chrome extension that automatically switches focus to the previously focused tab when closing a tab, improving browsing efficiency.

## Features

- 🔄 **Smart Tab Switching**: Automatically focuses the last active tab when closing the current tab
- 🪟 **Multi-Window Support**: Independent tab history management for each window
- ⚡ **Performance Optimized**: Efficient memory usage with automatic cleanup
- 🛡️ **Error Handling**: Robust error handling for edge cases
- 📊 **Debug Logging**: Detailed logging for troubleshooting

## Installation

### From Chrome Web Store (Recommended)

*Coming soon - extension is currently under review*

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
   git clone https://github.com/YOUR_USERNAME/last-tab-focus.git
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
4. The extension will automatically focus the previously active tab

## Technical Details

- **Manifest Version**: 3 (latest Chrome extension standard)
- **Permissions**: `tabs` (required for tab management)
- **Architecture**: Service Worker background script
- **Minimum Chrome Version**: 88

## File Structure

```
last-tab-focus/
├── manifest.json          # Extension configuration
├── background.js          # Main functionality
├── icons/                 # Extension icons
├── LICENSE.md            # MIT License
├── PRIVACY.md            # Privacy Policy
├── README.md             # This file
└── dev/                  # Development files (not included in releases)
    ├── test-*.html       # Test files
    ├── TESTING.md        # Testing guide
    └── ...               # Other development tools
```

## Development

### Prerequisites

- Chrome Browser (version 88 or higher)
- Git (for version control)

### Setup for Development

1. Fork this repository on GitHub
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/last-tab-focus.git
   cd last-tab-focus
   ```
3. Load the extension in Chrome:
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the project directory

### Testing

The test files are located in the `dev/` directory:

1. Load the extension in developer mode (see setup above)
2. Open `dev/test-basic.html` for basic functionality testing
3. Open `dev/test-multiwindow.html` for multi-window testing
4. Check browser console and service worker logs for debugging

See `dev/TESTING.md` for detailed testing procedures.

### Debugging

1. Go to `chrome://extensions/`
2. Find "Last Tab Focus" extension
3. Click "service worker" inspection link
4. View logs in the developer console

### Making Changes

1. Make your changes to the source code
2. Test thoroughly using the test files
3. Ensure no console errors in service worker
4. Test in different scenarios (single window, multiple windows, many tabs)

## Implementation Details

### Tab History Management

- Maintains an array of tab IDs with most recent first
- Maximum history size: 50 tabs
- Automatic cleanup of invalid/closed tabs
- Window-specific tab selection

### Event Handling

- `chrome.tabs.onActivated`: Records tab activation
- `chrome.tabs.onRemoved`: Handles tab closure and focus switching
- `chrome.windows.onRemoved`: Cleans up history on window closure

### Error Handling

- Safe tab operations with proper error catching
- Permission error handling
- Invalid tab ID management
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
   - Use the test files in `dev/`
   - Test with multiple tabs and windows
   - Check service worker console for errors
5. Commit your changes with clear messages
6. Push to your fork and submit a pull request

### Code Guidelines

- Follow the existing code style and structure
- Add comments for complex logic
- Include error handling for new features
- Maintain compatibility with Chrome 88+
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