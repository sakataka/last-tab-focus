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

13. Close while Chrome is busy
    - Open the service worker console from `chrome://extensions/` and register a listener that delays the next event: `chrome.tabs.onRemoved.addListener(() => { const end = Date.now() + 100; while (Date.now() < end) {} })`
    - Activate A → B → C (wait about a second between switches), then close C with the tab close button
    - Confirm focus returns to B, not to the tab next to C; then close B and confirm A
    - Reload the extension afterwards to remove the extra listener

14. Manual switch before closing the previous tab
    - Activate A → B → C, click A, and then close C with its close button as quickly as you can
    - Confirm A stays active; the extension must not pull focus to B
    - A switch followed by the close within 150ms is treated as Chrome's own switch; a person cannot click that fast, so record any failure with the timing

15. Close several tabs at once
    - Activate A → B → C, then Shift-click the tab to the right of C so both are selected
    - Close them with Ctrl+W / Command+W and confirm focus returns to B
    - Repeat with a selection that also includes B and confirm focus returns to A

Automated background tests use a simulated Chrome event/API boundary. They cover queue ordering and persisted state, but do not replace these real-browser checks or prove that Chrome emits events in every simulated order.

## Verification recorded on 2026-09-06

- `node --test *.test.mjs`: 28 tests passed, including four background-event integration tests.
- Chrome for Testing 153.0.8010.12, isolated persistent profile, extension 1.1.11 loaded: actual `chrome.tabs` activation/removal events restored a non-neighbor tab and walked back through consecutive closes.
- English/Japanese website: all eight FAQ entries opened and closed; no horizontal overflow or broken images at 1280, 420, and 390 CSS pixels. Desktop and mobile screenshots inspected.
- The browser check used headless Chrome and API-driven closes. Native close-button/keyboard input, idle worker suspension, and other operating systems remain manual checks; this run does not claim those were verified.

## Verification recorded on 2026-09-13

- `node --test *.test.mjs`: 32 tests passed, including removal-before-activation, activation-before-removal, consecutive-close history, and cold-worker hydration regressions.
- Chrome for Testing 153.0.8010.12, isolated profile, extension 1.1.12 loaded: closing C restored B and then closing B restored A while an unrelated neighboring tab remained open.
- The same sequence passed after explicitly stopping the extension service worker immediately before closing C; the first close after the cold start restored B.
- The browser check used headless Chrome and API-driven closes. Native close-button/keyboard input, a natural 30-second idle termination, and other operating systems remain manual checks.

## Verification recorded on 2026-10-19

- `node --test *.test.mjs`: 33 tests passed, including a regression for closing the active tab together with the neighbor Chrome activates.
- Chrome for Testing (playwright chromium-1243), isolated profile, unpacked working tree loaded: after A → B → C, `chrome.tabs.remove([C, D])` and `chrome.tabs.remove([before C, C, D])` restored B in 5 of 5 runs each; before the fix both ended on the next neighbor in 3 of 3 runs. A single close and `chrome.tabs.remove([D, C])` still restored B.
- The browser check used headless Chrome and API-driven closes. Native multi-selection close (Shift-click + Ctrl+W / Command+W) was not exercised and remains a manual check.

## Verification recorded on 2026-10-19 (close-event timing)

- `node --test *.test.mjs`: 54 tests passed. New regressions cover Chrome's switch arriving 30, 100, and 1000ms after removal; removal arriving 30 and 100ms after the switch; a manual switch 200ms before closing the previous tab; a batch close whose last switch is late; a selection right after Chrome's switch; an unrelated background close; a wait Chrome never answers; a restore target closing before Chrome's switch; and malformed saved pending restores. Before the fix, 10 of them failed.
- Chrome for Testing 153 (playwright chromium-1243), headless, isolated profile, unpacked working tree loaded, driven through the service worker with the DevTools protocol. Chrome reported removal before the switch in every run. A listener that blocked the worker for 30, 100, or 400ms after `onRemoved` delayed the switch by that much.
  - Before the fix (HEAD c45733e): with every delay the neighbor stayed active and became the head of history; `chrome.tabs.remove([C, D])` with a 100ms delay ended on the next neighbor; selecting E right after the close kept E but left the neighbor in history.
  - After the fix, 8 of 8 runs: each delay restored B and history equaled the pre-close history without C; the batch close restored B; the immediate selection of E kept E, followed by the pre-close history. In 3 of 3 runs, a switch to A 200ms before closing background C kept A, and a switch 100ms before the close was rewound to B, as designed for the 150ms window.
- The activation-before-removal ordering did not occur in this Chrome, so it is covered only by the simulated tests. Native close-button, keyboard, and multi-selection input were not exercised; checklist items 13 to 15 remain manual checks.
