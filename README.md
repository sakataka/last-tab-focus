# Last Tab Focus

Chrome extension that automatically switches focus to the previously focused tab when closing a tab, improving browsing efficiency.

## Features

- 🔄 **Smart Tab Switching**: Automatically focuses the last active tab when closing the current tab
- 🪟 **Multi-Window Support**: Independent tab history management for each window
- ⚡ **Performance Optimized**: Efficient memory usage with automatic cleanup
- 🛡️ **Error Handling**: Robust error handling for edge cases
- 📊 **Debug Logging**: Detailed logging for troubleshooting

## Installation

### From Source (Developer Mode)

1. Download or clone this repository
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
├── test-basic.html        # Basic functionality test
├── test-multiwindow.html  # Multi-window test
├── TESTING.md            # Testing guide
└── README.md             # This file
```

## Development

### Testing

1. Load the extension in developer mode
2. Open `test-basic.html` for basic functionality testing
3. Open `test-multiwindow.html` for multi-window testing
4. Check browser console and service worker logs for debugging

### Debugging

1. Go to `chrome://extensions/`
2. Find "Last Tab Focus" extension
3. Click "service worker" inspection link
4. View logs in the developer console

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

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Support

If you encounter any issues:

1. Check the browser console for errors
2. Review the service worker logs
3. Try disabling and re-enabling the extension
4. Create an issue with detailed reproduction steps