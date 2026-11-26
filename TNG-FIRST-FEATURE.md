# MyBudgetApp · First Android feature

The current implementation supports the verified English successful DuitNow transfer notification. It opens a transfer draft and requires the user to choose the receiving account. Additional payment formats need their own verified samples. Current draft actions are Accept, Decline and Edit.

**Build a Touch ’n Go payment review flow.** I want to pay for lunch, open MyBudgetApp later, see a draft for the correct amount, choose a category and confirm it once. My spending should change only when I confirm. Use the Android Studio emulator to develop the flow and my Android phone to verify what TNG actually sends.

## Instructions for the implementing AI

Work in the existing Expo SDK 54 project. Deliver the following in order. Keep manual entry available throughout. Leave HLB, BSN, automatic posting and AI categorisation for later.

### 1. Make the existing budget work offline

- Start in `App.js`. Trace startup, first sync, settings, every AsyncStorage read and write, and the widget reader in `widget-task-handler.js`. Open directly to the budget without a Supabase session or network request.
- Use the SDK-compatible version of `expo-sqlite`. Migrate transactions, accounts/assets, transfers, categories, savings goals, budget and last-used account. Preserve IDs, links, dates and existing balances. Write the migration and its completion marker in one database transaction. Keep legacy keys intact. An interrupted migration must be safe to retry, and unreadable records must surface a recoverable error before defaults can overwrite data.
- Route manual edits and widget reads through the same SQLite-backed data. On an emulator seeded with legacy records, compare counts, balances, transfer links and widget totals before and after migration and after a second launch.
- Before upgrading a phone containing important records, provide a versioned local backup and restore covering all budget data. Verify a round trip on an emulator. A transaction CSV alone cannot restore account and goal relationships.

### 2. Capture one completed TNG purchase

- Add an opt-in Android notification listener using a local native module or Expo config plugin that survives native project regeneration. Provide a capture toggle, access status and a shortcut to Android’s notification-access settings. Use a native Android build for this feature. [Android notification listener](https://developer.android.com/reference/android/service/notification/NotificationListenerService)
- Check the opt-in and verified TNG package identity before reading notification text. Process it on the phone. Keep only the fields needed for review and deduplication. Omit raw alerts, OTPs and payment references from logs, analytics and backups.
- Persist eligible drafts even while the React screen is closed. Capture the MYR amount in integer sen, event time and merchant when present. Allow a missing merchant to be entered during review. Create a draft only when both a completed outgoing purchase and its amount are clear. Ignore approvals, promotions, incoming funds, reloads and ambiguous alerts.
- Start with explicitly synthetic fixtures. Add a real parser rule after checking an actual TNG notification on the owner’s phone. If its format is unknown, show a local diagnostic such as “TNG alert received, format unrecognised”. Ask the owner for redacted wording only if needed.

### 3. Let me review the purchase

- Each draft offers **Edit**, **Confirm** and **Dismiss**. Let me select the paying account and category. Confirm through the existing expense logic and mark the draft consumed atomically. Reopening the app, receiving an update to the same alert or tapping twice must produce at most one expense. Two distinct purchases at the same merchant for the same amount must remain separate.
- For a RM50 reload followed by a RM8 lunch, expected spending is **RM8** after confirmation. A manually recorded reload is an account transfer. Dismissing a draft leaves account balances and the widget unchanged.

## How I will test it

### Android Studio emulator · repeatable checks

1. Install Android Studio with the Android SDK, Platform-Tools and an emulator image. Put the SDK’s `platform-tools` directory on PATH. In Device Manager, create and start a virtual Android phone.
2. From the repository folder in PowerShell, run the following commands. Select the emulator when prompted. The project’s Android script builds and installs the native app. Keep Metro running during debug tests. [Expo local Android builds](https://docs.expo.dev/guides/local-app-development/)

   ```powershell
   npm.cmd ci
   adb devices
   npm.cmd run android -- --device
   ```

3. The implementing AI should supply a debug-only way to replay synthetic events through the same parser and draft logic. Include the exact replay command or button in the handoff. Replay an RM8 purchase twice, confirm it twice and relaunch. Expect one RM8 expense, one RM8 account deduction and the corresponding widget total. Replay a reload, a pending approval and an unrelated app alert. Expect zero new drafts. Replay a second distinct RM8 purchase and dismiss it. The first expense should remain.
4. Reopen with network access disabled and verify saved records and manual entry. For the final standalone offline check, use a build with an embedded JavaScript bundle so Metro can be switched off.

### Android phone over USB · real TNG check

1. If an old installation has records worth keeping, leave it installed. Have the AI supply a side-by-side test build with its own Android application ID before running the install command on that phone. It starts with separate data. Test migration separately on the emulator. An eventual in-place upgrade needs a compatible signing key and package ID.
2. Enable Developer options and USB debugging. Connect with a USB **data** cable, unlock the phone and accept the debugging prompt. Run `adb devices` and look for the phone with status `device`. If it is missing, check the cable and Windows USB driver. [Android USB setup](https://developer.android.com/studio/run/device)
3. With the test build configured, run `npm.cmd run android -- --device` and select the phone. Open MyBudgetApp once, enable TNG capture and grant notification access when Android opens Settings. Check that TNG’s own payment notifications are enabled. Return to the home screen.
4. During your next ordinary TNG purchase, check whether Android displays a payment notification. Open MyBudgetApp afterward and compare the draft with the receipt. Confirm once, reopen the app and compare the expense, account balance and widget. USB is for installation and debugging. Repeat with the standalone build unplugged to verify everyday use.
5. If no draft appears, record which step failed: TNG posted an alert, the listener received it, the parser recognised it, or the inbox displayed it. If TNG sent no alert, enter the expense manually and try capture on a later purchase. Keep permissions and parsing rules narrow.

**Handoff required from the AI.** Report the build command, emulator results, physical-device results and any check still awaiting the owner. Mark real TNG capture verified only after a genuine payment produces a correct draft on the phone.
