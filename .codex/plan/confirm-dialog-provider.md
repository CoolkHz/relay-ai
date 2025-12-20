# confirm-dialog-provider

## Context
- Replace browser confirm dialogs with shadcn-styled confirmation dialogs.
- Support dynamic object names in confirmation copy.

## Plan
1. Implement ConfirmDialogProvider and useConfirm hook using existing Dialog components.
2. Register provider in app-level Providers.
3. Replace confirm() calls with useConfirm() in all delete flows.
4. Review flows for loading and destructive button variants.
