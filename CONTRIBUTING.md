# Contributing to Last Tab Focus

Thank you for your interest in contributing to Last Tab Focus! This document provides guidelines and information for contributors.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Style Guidelines](#style-guidelines)
- [Reporting Issues](#reporting-issues)

## Code of Conduct

By participating in this project, you agree to abide by our code of conduct:

- Be respectful and considerate in all interactions
- Welcome newcomers and help them get started
- Focus on constructive feedback and suggestions
- Respect different viewpoints and experiences

## Getting Started

### Prerequisites

- Chrome Browser (version 88 or higher)
- Git for version control
- Basic knowledge of JavaScript and Chrome Extension APIs
- Text editor or IDE of your choice

### Development Setup

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/last-tab-focus.git
   cd last-tab-focus
   ```
3. **Load the extension** in Chrome:
   - Open `chrome://extensions/`
   - Enable "Developer mode" toggle
   - Click "Load unpacked" and select the project directory
4. **Verify installation** by checking that the extension appears in the extensions list

## Making Changes

### Creating a Branch

Always create a new branch for your changes:

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/issue-description
```

### Branch Naming Conventions

- `feature/description` - for new features
- `fix/description` - for bug fixes
- `docs/description` - for documentation changes
- `refactor/description` - for code refactoring

## Testing

### Manual Testing

1. **Load your changes** by reloading the extension in Chrome
2. **Use the test files** in the `dev/` directory:
   - `dev/test-basic.html` - Basic functionality tests
   - `dev/test-multiwindow.html` - Multi-window scenarios
3. **Test scenarios**:
   - Single window with multiple tabs
   - Multiple windows with multiple tabs each
   - Closing tabs in different orders
   - Edge cases (last tab in window, discarded tabs, etc.)

### Service Worker Console

Always check the service worker console for errors:
1. Go to `chrome://extensions/`
2. Find "Last Tab Focus" extension
3. Click "service worker" inspection link
4. Look for any errors or warnings

### Test Checklist

Before submitting your changes, ensure:

- [ ] Extension loads without errors
- [ ] Basic tab switching works correctly
- [ ] Multi-window functionality works
- [ ] No console errors in service worker
- [ ] Performance remains good with many tabs
- [ ] Edge cases are handled gracefully

## Submitting Changes

### Pull Request Process

1. **Push your branch** to your fork:
   ```bash
   git push origin your-branch-name
   ```
2. **Create a Pull Request** on GitHub
3. **Fill out the PR template** with:
   - Clear description of changes
   - Why the change is needed
   - How to test the changes
   - Any potential risks or considerations

### PR Guidelines

- Keep PRs focused on a single feature or fix
- Write clear, descriptive commit messages
- Include tests for new functionality when possible
- Update documentation if needed
- Respond to feedback promptly and professionally

## Style Guidelines

### JavaScript Style

- Use modern ES6+ syntax where appropriate
- Follow consistent indentation (2 spaces)
- Use meaningful variable and function names
- Add comments for complex logic
- Handle errors gracefully with try/catch blocks

### Code Structure

- Keep functions focused and small
- Use async/await for asynchronous operations
- Maintain consistent error handling patterns
- Follow the existing code organization

### Example Code Style

```javascript
// Good: Clear function name and error handling
async function safeGetTab(tabId) {
  try {
    if (!tabId || tabId < 0) {
      logWarn('Invalid tab ID provided:', tabId);
      return null;
    }
    
    const tab = await chrome.tabs.get(tabId);
    return tab;
  } catch (error) {
    logError('Error getting tab:', error, 'tabId:', tabId);
    return null;
  }
}
```

### Commit Messages

Write clear, concise commit messages:

```
Add support for tab pinning detection

- Check if tab is pinned before adding to history
- Skip pinned tabs in focus switching logic
- Add tests for pinned tab scenarios

Fixes #123
```

## Reporting Issues

### Before Reporting

1. **Search existing issues** to avoid duplicates
2. **Test with latest version** to ensure issue still exists
3. **Disable other extensions** to rule out conflicts

### Issue Template

When reporting issues, include:

- **Chrome version**: e.g., "Chrome 120.0.6099.71"
- **Extension version**: e.g., "1.0.0"
- **Steps to reproduce**: Clear, numbered steps
- **Expected behavior**: What should happen
- **Actual behavior**: What actually happens
- **Console logs**: Any errors from service worker console
- **Screenshots**: If applicable

### Feature Requests

For feature requests, include:

- **Use case**: Why is this feature needed?
- **Proposed solution**: How should it work?
- **Alternatives considered**: Other approaches you've thought of
- **Implementation notes**: Technical considerations (if any)

## Development Notes

### Chrome Extension APIs

The extension uses these Chrome APIs:
- `chrome.tabs` - Tab management and events
- `chrome.windows` - Window information
- `chrome.runtime` - Extension lifecycle events

### Key Files

- `manifest.json` - Extension configuration and permissions
- `background.js` - Main service worker with tab management logic
- `icons/` - Extension icons in multiple sizes
- `dev/` - Development and testing files (not included in releases)

### Architecture Notes

- Uses Manifest V3 service worker architecture
- Maintains tab history as an array with most recent first
- Implements automatic cleanup of invalid tabs
- Handles multiple windows independently

## Getting Help

- **Check the README**: Basic setup and usage information
- **Review existing issues**: Someone might have faced similar problems
- **Ask questions**: Open an issue with the "question" label
- **Join discussions**: Participate in existing issue discussions

## Recognition

Contributors will be recognized in:
- GitHub contributors list
- Release notes for significant contributions
- Project documentation (for major features)

Thank you for contributing to Last Tab Focus! 🚀