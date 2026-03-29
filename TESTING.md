# Testing Guide

## Automated Check

Run the lightweight history regression tests:

```bash
node --test history.test.mjs
```

## Manual Regression Checklist

Load the extension in `chrome://extensions/` and keep the service worker inspector open while testing.

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
