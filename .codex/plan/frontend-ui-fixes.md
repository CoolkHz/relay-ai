# frontend-ui-fixes

## Context
- Fix dialog input left border clipping in add/edit dialogs (channels, groups, users, models).
- Fix misaligned inputs in group channel mapping list.

## Plan
1. Update ScrollArea viewport to add default padding and allow viewportClassName.
2. Update FormField to support reserving description space for alignment.
3. Apply new FormField option in group channel mapping list.
4. Verify affected dialogs for clipping and alignment.
