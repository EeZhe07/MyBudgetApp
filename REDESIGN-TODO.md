# MyBudgetApp redesign checklist for the coding agent

Read [UI-REDESIGN.md](UI-REDESIGN.md) first. It defines the selected cream/deep-teal direction, screen hierarchy and example states. Work in the existing Expo / React Native app with its local SQLite store. Start with Phase 0 and complete phases in order. Mark a box complete only when its outcome has been verified. Record the test or device result beside its phase. Keep a failed or unavailable check open.

## 0 · Establish the baseline

- [x] Inspect the current diff and preserve work already present. Trace the active routes in `App.js` and the modules under `screens/`. The older auth and Supabase files are outside the active offline redesign.
- [x] Run `node --test test/budget-store.test.mjs test/budget-insights.test.mjs`. All six baseline tests passed. Captured Home, account detail, transaction entry and a receipt on the side-by-side Android emulator installation using Demo Cafe records.
- [x] Prepare repeatable fixtures. Run `node test/redesign-fixtures.mjs` for fictional JSON backups and use the Android debug replay for pending drafts. The SQLite tests cover fresh storage and an existing installation whose last account was deleted.

## 1 · Make the balances explainable

- [x] Use one signed per-account movement rule for balances, history and row direction. SQLite tests cover transfers, goal funding, adjustments and Malaysia-local midnight. Opened and captured the populated account on the emulator.
- [ ] Persist zero or user-entered opening balances on first setup. Preserve balances from existing installations, including accounts matching old sample names. Reopen an installation after its last account was deleted and verify the account list stays empty. Keep opening entries and later dated adjustments distinguishable from income and spending. Archive used accounts without losing their historical names, receipts or audit trail.
- [x] Persist budgets by month and migrate the legacy single budget once. Tests cover migration retries, v1 and v2 restore, stale state replacement, independent months and current-month widget totals.
- [x] Bind detail screens to record IDs. The emulator showed the edited receipt, preserved the Activity search on return and opened the selected goal deposit. The ledger test covered deletion and balance rollback.
- [x] **Pass** · Automated regressions verified the RM142 and RM150 transfer example, yesterday’s RM100 closing balance, the edit to RM140, deletion to RM150, restart and backup restore. The local-midnight test places a 12:01 am Malaysia transaction in the correct day and month.

## 2 · Build the daily journey in the new UI

- [x] Apply shared colour and type tokens, headers, buttons, money text, ledger rows and empty states to the daily journey. Reviewed the cream and teal screens, native sheets, category icons and action menu on the emulator.
- [ ] Update `screens/BudgetHome.js` and its callbacks in `App.js`. Put the budget answer first, keep Record expense reachable and make View all activity open the full list. Implement no-budget, overspent, historical, first-run and pending-review states.
- [ ] Update `screens/TransactionEntry.js`. Preserve the calculator, last account, optional fields, editing, copying and Save & add another. Account-specific entry preselects its account. Provide an in-flow way to create the first account and return with typed input intact. Guard repeated saves and leave input available after an error.
- [ ] Replace the legacy account detail and receipt layouts in `App.js`. Match the RM1 example in the UI spec, make Record transaction primary, and move management to the menu. For recorded history, show local dates, both transfer directions and a chart only where movement can be explained.
- [x] **Pass** · On the emulator, saved a campus lunch for RM8.50 with the keyboard open, edited the receipt to RM10.00 and returned to Home. Record transaction from Wallet preselected Wallet. Captured Home, empty and populated account detail, expense entry, keyboard-open entry and receipts.

## 3 · Carry the design through every destination

- [ ] **First launch and account management** · Wire setup, restore and add/edit/archive flows into `App.js` and `screens/BudgetAssets.js`. Deal explicitly with archived accounts that carry a balance so archiving alone cannot change net worth. If a demo is offered, keep it separate from personal data.
- [x] **Activity and Insights** · The emulator found the older fictional groceries entry in Activity and in the selected-month Groceries drill-down. Automated tests match a category report to its contributing entries down to the sen.
- [ ] **Goals** · Update list, detail, edit/create and deposit flows. Retain legacy goal IDs and image references. The emulator recorded an RM20 deposit, opened its receipt and showed RM290 in net worth after archiving Cash. Review older goal photos with real backups.
- [ ] **Capture and Settings** · Reuse one payment inbox from Home and `screens/BudgetSettings.js`. Keep synthetic replay debug-only. Cover access denied, off, ready, unknown merchant, duplicate, dismissed, confirmed and failed-save states. Preview restore scope before the existing replacement confirmation. Keep CSV export and JSON recovery reachable.
- [ ] **Finishing surfaces** · Apply the same labels and styles to `screens/BudgetPickers.js`, old dialogs and alerts in `App.js`, `widgets/ActionWidget.js`, `widgets/InfoWidget.js`, `widget-task-handler.js` and app shortcuts. Check app-owned text for mixed languages. Preserve user content and historical IDs.
- [ ] **Pass** · Every row in the UI spec’s screen table has a working route, a meaningful empty state where applicable and a working return path. Search can retrieve entry 21. A category total matches its drill-down to the sen. The widget opens the correct flow even from a cold start.

## 4 · Verify before handing over the build

- [ ] Re-run baseline and new regression tests. Exercise v1 import and new-version backup round trips, a failed restore, two edits to different monthly budgets, archived accounts and old goal photos. Check that failed writes can be retried without duplicates.
- [ ] Test manual entry, a transfer, goal funding and a reviewed TNG draft offline. Confirm an RM8 draft twice and expect one expense. Dismiss a second draft and expect no balance change. Compare Home, receipt, account history, Insights and updated widgets for the same period.
- [ ] Inspect current Android screenshots at narrow and ordinary phone widths, normal and large system text. Exercise TalkBack, reduced motion, gesture navigation, Android Back and the keyboard. Check long bilingual names, large RM amounts, negative balances, empty screens, visible focus and labelled controls.
- [x] Build and install the Android test variant. The standalone x86_64 build ran with Metro stopped. See the review evidence below for the APK, screenshots and remaining device checks.

## 5 · Validate the reason to pay

- [ ] With five target users, observe three unaided tasks: record lunch, find the receipt and explain the remaining monthly budget. Record completion, time and mistakes. Fix the most common failure.
- [ ] Pilot reviewed TNG capture on consenting users’ actual Android devices. Compare recorded purchases against real payment alerts, counting missing, duplicate and incorrect drafts as well as review time. Synthetic replay covers the pipeline only.
- [ ] Once capture is reliable, trial suggested categories from user-confirmed merchant rules. Keep corrections editable. Over two weeks, measure repeat use and actual paid-pilot acceptance separately. Leave billing, additional banks and AI expansion for a product decision based on the results.

## Review evidence

- The Android 17 API 37 x86_64 emulator ran the side-by-side `com.shingyeeang.mybudgetapp.test` installation. Build the test variant as described in [README.md](README.md). The current emulator APK is `dist/emulator/MyBudgetApp-Latest-Emulator-x86_64.apk`. The current phone APK is `dist/MyBudgetApp-Latest-Android-Phone.apk`.
- All 12 automated tests passed. The synthetic Touch ’n Go replay produced two drafts. Two taps on confirmation posted one RM8 expense, and dismissal left spending unchanged. The new receipt identified the notification as its source.
- On the standalone build, the edited lunch and RM50 transfer left Wallet at RM140 and Cash at RM150. The account histories showed opposite transfer signs. A savings deposit and account archive preserved net worth.
- Restored the legacy v1 fixture in the standalone app and verified the monthly budget, original Chinese account name and savings goal. Quick Add opened expense entry from the launcher, and the same deep link opened entry when the app was started cold. Budget Overview and Home both showed RM348.50 remaining after restoring the populated month.
- At 320 dp and 150% system text, the bilingual account name and negative balance stayed readable. The account menu stayed on the right, the Accounts tab stayed on one line and Android Back returned from entry to the account. Checked the entry sheet with reduced motion enabled.
- The measured contrast ratios were 13.59:1 for body text on cream, 6.47:1 for secondary text on cream, 7.88:1 for white text on teal and 5.84:1 for error text on the budget tint.
- A goal can be deleted when its saved balance is zero. Archiving an account keeps its balance in net worth.
- Before and after PNGs are in `.expo/redesign-review/`. The fixtures were fictional. Full TalkBack coverage, physical-device Touch ’n Go notifications and the paid-user pilot remain open.
