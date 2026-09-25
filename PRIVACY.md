# Privacy Policy for Last Tab Focus

**Last Updated: September 25, 2026**

## Overview

Last Tab Focus is a single-purpose Chrome extension. It only changes tab close behavior so focus returns to the previously used tab in the same window. This privacy policy explains how that limited functionality handles data.

## Data Collection and Usage

### What Data We Collect

**We collect NO personal data.** The extension only processes:

- Tab IDs and window IDs provided by Chrome's Tab API
- Tab opener relationships used to return to the previously used tab after closing
- Tab focus history within the current browser session

The extension requests only the `storage` permission. It does not request the `tabs` permission or any host permissions, so it cannot read page URLs, titles, or content.

### How We Use Data

- **Tab IDs**: Used only to track the last used tab in the current window
- **Tab History**: Stored temporarily to determine which tab to focus when another tab is closed
- **No External Transmission**: All data processing happens locally within your browser

### What We Don't Collect

- Personal information
- Browsing history
- Website content
- User credentials
- Any data that could identify you

## Data Storage and Retention

- **Local Only**: Tab IDs, window IDs, opener relationships, and focus history are stored with Chrome's `storage.session` API, which keeps data in memory and does not write it to disk
- **Session-Based**: Tab history is kept only for the current browser session and is reset when Chrome restarts or the extension is reloaded/updated
- **No URLs or Page Data**: The extension never stores page URLs, titles, or content
- **No External Servers**: The extension does not communicate with any external servers

## Third-Party Data Sharing

**We share NO data with third parties.** Since we don't collect personal data and all processing is local, there is nothing to share.

## User Rights

- **Full Control**: You can disable or uninstall the extension at any time
- **No Account Required**: The extension works without any registration or account creation
- **Open Source**: The complete source code is available for inspection

## Contact Information

If you have questions about this privacy policy, please:

- Create an issue on our GitHub repository: [Last Tab Focus](https://github.com/sakataka/last-tab-focus)

## Changes to This Policy

We may update this privacy policy from time to time. Any changes will be posted in this document with an updated "Last Updated" date.

## Compliance

This extension complies with:
- Chrome Web Store policies
- General privacy best practices
- Minimal data collection principles

---

**Note**: This extension is intentionally limited in scope. It operates entirely within your browser and does not send data to external services.
