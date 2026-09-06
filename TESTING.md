# Testing Guide

## Automated Check

Run the lightweight history regression tests:

```bash
node --test *.test.mjs
```

## Manual Regression Checklist

Load the extension in `chrome://extensions/`. Run the checklist with the service worker inspector and other DevTools windows closed, as in normal use. Inspect logs only after a failure; repeat any reproduction with DevTools closed because debugging can keep the worker alive.

Repeat the basic close test with the tab close button and Ctrl+W / Command+W. Record the browser version and whether DevTools was closed.

1. Single window history
   - Open tabs A, B, and C in one window
   - Activate A → B → C
   - Close C and confirm focus returns to B
   - Close B and confirm focus returns to A

2. Nested tab open flow
   - Open tab A
   - Select text in A, right-click, and open a Google search in a new tab B
   - From B, open another result in a new tab C
   - Close C and confirm focus returns to B
   - Close B and confirm focus returns to A

3. One-step tab open flow
   - Open tab A
   - Select text in A, right-click, and open a Google search in a new tab B
   - Close B and confirm focus returns to A

4. Multiple windows
   - Open Window 1 with tabs A and B
   - Open Window 2 with tabs C and D
   - Activate A → C → B → D across both windows
   - Close D and confirm focus stays in Window 2
   - Close B and confirm focus stays in Window 1

5. MV3 service worker restart
   - Build tab history in one or more windows
   - Stop the service worker from `chrome://extensions/`
   - Activate the extension again by switching tabs or closing a tab
   - Confirm the previous in-session history still restores the expected tab

6. Fallback behavior
   - Close a tab when there is no prior history for that window
   - Confirm Chrome keeps its default tab selection without console errors

7. Discarded tab recovery
   - Open a few tabs and discard one candidate tab from `chrome://discards/`
   - Close the active tab
   - Confirm the discarded tab can still become active and reload normally

8. Window cleanup
   - Build history in two windows
   - Close one entire window
   - Continue using the remaining window and confirm focus restoration still works

9. Fast consecutive closing
   - Activate A → B → C → D, then close D and C in quick succession
   - Confirm the remaining active tab is B; closing B should return to A

10. User selection during restore
    - Close the current tab and immediately select a different remaining tab
    - Confirm the extension does not pull focus away from that selection
    - Repeat while Chrome is busy; record any failure with the exact steps

11. Worker suspension without DevTools
    - Activate A → B → C and leave Chrome idle for at least 60 seconds, with DevTools closed
    - Close C and confirm focus returns to B, then close B and confirm A
    - Separately use Chrome's worker controls to stop the worker and repeat; idle time alone does not prove suspension

12. Browser restart
    - Restart an isolated test browser with restored tabs; do not restart a personal session for this check
    - Confirm that the old focus order is not assumed
    - Build a new A → B → C history and verify closing C returns to B

Automated background tests use a simulated Chrome event/API boundary. They cover queue ordering and persisted state, but do not replace these real-browser checks or prove that Chrome emits events in every simulated order.

## Verification recorded on 2026-09-06

- `node --test *.test.mjs`: 28 tests passed, including four background-event integration tests.
- Chrome for Testing 153.0.8010.12, isolated persistent profile, extension 1.1.11 loaded: actual `chrome.tabs` activation/removal events restored a non-neighbor tab and walked back through consecutive closes.
- English/Japanese website: all eight FAQ entries opened and closed; no horizontal overflow or broken images at 1280, 420, and 390 CSS pixels. Desktop and mobile screenshots inspected.
- The browser check used headless Chrome and API-driven closes. Native close-button/keyboard input, idle worker suspension, and other operating systems remain manual checks; this run does not claim those were verified.
