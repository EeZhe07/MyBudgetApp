# MyBudgetApp redesign — coding prompt

## Implementation status

- Implemented TNG Accept, Decline and Edit actions, with the existing atomic draft confirmation and a prefilled editor when account information is ambiguous.
- Implemented the clean budget Home, separate Savings Goals screen, daily Budget calendar, Records calendar and revised entry keypad.
- Implemented expense and income donuts, account cards, asset allocation and liability donuts.
- Verified all 14 automated tests, including allowance rounding, chart totals, backup compatibility and duplicate payment prevention. The phone APK is `dist/MyBudgetApp-Latest-Android-Phone.apk` and the emulator APK is `dist/emulator/MyBudgetApp-Latest-Emulator-x86_64.apk`.
- Verified on the Android API 37 emulator with the standalone test APK. Accept recorded an RM8 synthetic payment, Decline dismissed the second sample, and Edit recorded the Bookshop sample at RM12. Closing the editor retained its pending draft. The budget moved from RM576 to RM556 remaining and persisted across restart.
- Verified the Records calendar shows RM36 spending and RM3 income on the same day, Food chart drill-down, an empty income period, the RM10 over-budget state, category selection, and a RM5 goal deposit. Restored the demo budget to RM600. The goal deposit preserved remaining budget at RM556.
- Reviewed screenshots of Home, Goals, Budget, Records, entry, TNG, Insights and Assets in `.expo/redesign-review/v2-*.png`. At 1.5× text size, category entry uses two columns and retains its keypad and Save control. Restored Android text size to normal after checking.
- Verified live capture of the English successful DuitNow transfer notification on the Poco F5. The real RM1 notification produced one pending transfer and survived restart. Confirmation requires source and destination accounts. Additional payment formats and full TalkBack verification remain pending.

Implement this redesign in the existing MyBudgetApp React Native / Expo Android project. The attached images are numbered 1–9 in upload order. This brief defines the requested interactions. Use the images for the particular layout details named below. Use the current app for its visual identity, language settings, data and behavior. If older redesign notes describe goals on Home or a review-only TNG inbox, follow this brief for those screens.

## 1. Home and navigation — images 2 and 3

- Make Home answer “How much of my budget is left?” before the user scrolls. In a single cream card, show the selected month, the remaining amount in large type, spent out of total, and one slim teal progress bar with a percentage. A quieter line can show the suggested daily amount for the current month. Tapping the card opens Budget on the same month. Use “Set monthly budget” for an unset budget and “Over budget by RM…” when spending exceeds it.
- Below the card, show a compact “Review N TNG payments” row only when drafts exist, then up to three recent transactions with a “See all” link. Keep Add record easy to reach with one thumb. Leave charts and the full calendar to their detail pages.
- Give Savings Goals its own named destination, reachable in one tap from Home through navigation or a header shortcut. Use image 3 for the vertical card layout. Each goal shows its chosen picture or icon, name, saved amount, target and progress. Keep Add goal, Edit, Pin, Deposit and history working. Back from a goal returns to Goals. Use the user's actual goals in place of the reference app’s weekly review and coaching cards.

## 2. TNG inbox — image 1

- Image 1 shows the empty inbox. Design its populated state with one card per pending payment. Show merchant, RM amount, local date/time, and the account and category that Accept will use. Under each card put three visible text buttons in this order: **Accept**, **Decline**, **Edit**. Give Accept a filled teal background, Decline a quiet text treatment and Edit a pencil with a label. Allow wrapping for large text.
- Accept records the captured payment in the local ledger in one tap. Reuse the reviewed-draft commit path, validation and draft ID. If required information is missing or the account is ambiguous, open the prefilled editor with the missing field highlighted. Never silently pick an unrelated account.
- Decline dismisses just that draft and creates no ledger entry. Edit opens the existing prefilled form. Saving records the edited payment once. Back or Cancel keeps it pending. Here “Accept” and “Decline” apply only to recording a payment that TNG already reported.
- Prevent duplicate entries on a double tap, repeated notification or app restart. Remove a row after its action persists. On failure, keep it available to retry. After the last pending item, show “You’re all caught up.”

## 3. Budget and Records — images 4 and 5

- **Budget** answers “How am I doing against my plan?” Show the month switcher, editable monthly limit, remaining amount and category spending. If adding category limits, persist them per month and validate them separately from actual spending. Each category row opens the matching records.
- Add a seven-column daily calendar like image 4. Mark today and the selected day distinctly. Past dates show actual spend. Future dates in the current month show a clearly labeled suggested allowance. Tapping a date reveals its spending and transactions below the calendar. Use actuals on historical months. Include empty days.
- Use a predictable suggestion: divide the positive remaining budget by the number of remaining calendar days including today. For example, RM661.24 across seven days displays about RM94.46 per day. Calculate in sen and allocate any rounding remainder to the last day if displaying each day’s allocation. Handle unset budgets, overspending and the last day of the month explicitly.
- **Records** answers “What happened on this date?” Adapt the existing Activity screen to image 5. At the top, use a month picker, Today shortcut, search and filters, then monthly expense and income totals. Beneath them show a calendar with signed daily amounts, followed immediately by the selected day’s transactions. When a day has income and expenses, show both. A transaction opens its existing receipt. Keep search usable across the selected period. Reuse the calendar component from Budget with different day-cell content.

## 4. Add record — image 6

- Keep browsing Records and adding a record as distinct actions. For entry, use the Expense / Income / Transfer selector across the top and a scrollable grid of illustrated category buttons. Use three columns where labels fit and two on smaller widths or at larger font sizes.
- Anchor the amount, note, numeric keypad and Save within thumb reach. Make date and account quick to change. For Transfer, put From and To accounts in the space used for categories. Preserve transaction editing, receipt detail and the prefilled TNG flow. Ensure the keypad and Android navigation bar never cover Save.

## 5. Insights — image 7

- Show period controls and totals for expenses and income. Give each a category donut with a ranked legend showing name, RM amount and percentage. Tapping a slice or its legend row selects the category and lets the user open the contributing records with that period applied.
- Reuse the app’s reporting rules so transfers and goal deposits stay out of income and expense. Group tiny slices into Other and let the user inspect the breakdown. Use a text empty state for a zero-total period. Prioritize these two charts over reproducing every chart in the long screenshot.

## 6. Assets — images 8 and 9

- Lead with net worth, then total assets and liabilities. Use a two-column grid of softly tinted account cards with small original illustrations, such as a stitched wallet for cash, a bankbook for a bank account and a coin pouch for an e-wallet. Give the balance the strongest contrast. Keep long account names readable and open account history on tap.
- Use an allocation donut for “Where my money is” with amounts and shares per account. Reconcile it to the existing assets calculation, including savings held in goals exactly once. Keep debts in a separate breakdown, with positive magnitudes for its slices and clear debt labels. Keep zero-balance accounts accessible in the account grid. If the existing trend is shown, use a small line chart below the summary for change over time.

## Implementation and preview

1. Inspect App.js, screens/budgetUi.js, BudgetHome, BudgetActivity, TransactionEntry (including PaymentInbox), BudgetStats, BudgetAssets, BudgetDetails, and the existing budget store and insights helpers. Start with TNG actions, Home and Goals. Then implement Budget, Records and entry. Finish with Insights and Assets.
2. Reuse the shared cream, teal, ink, typography and RM formatting. Carry stable category colors through the grid, records and charts. Use original illustrations and the existing icon language. Limit the reference material to the specified layouts. Keep copy short and omit the reference apps’ chat bars, mascots, promotions and unrelated controls.
3. Use real ledger data and local calendar dates. Preserve SQLite data, backup compatibility and widget entry points. If persisting new fields, provide defaults for existing users and verify a backup round trip. Provide text equivalents for charts, readable selected states, 48 dp action targets and layouts that work with larger text.
4. Run the existing tests and add focused coverage for TNG duplicate prevention, daily allowance rounding and chart reconciliation. On the Android emulator, demonstrate Accept, Decline and Edit using clearly synthetic pending drafts in a test build. Check a day with both income and spending, an over-budget month, an empty period, and an account transfer. Report checks performed, provide the test APK path and include screenshots of the populated inbox, Home, daily budget, Records, entry, Goals, Insights and Assets.
