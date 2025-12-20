# ui-loading-and-alignment

## Context
- Fix vertical alignment of the delete button in group channel mapping list.
- Add loading animations to all async action buttons (create/update/save/delete/toggle).

## Plan
1. Add isLoading support in Button to render Spinner and handle disabled/aria-busy states.
2. Add loading states around async handlers in groups/channels/users/models pages and wire to buttons.
3. Align group mapping delete button vertically with inputs.
4. Review async actions to ensure loading and disabled states are consistent.
