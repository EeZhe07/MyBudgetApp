# MyBudgetApp UI redesign

**Product** · Offline, Android-first personal finance software for people in Malaysia who use cash, bank accounts and Touch ’n Go.

**Chosen direction** · Warm and personal. Cream surfaces, deep teal actions and more colour in categories and savings goals. This updates the forest-green proposal in the earlier brief. Keep the MyBudget name on screen. The [coding checklist](REDESIGN-TODO.md) gives the implementation order.

## Two screens to design first

| Position | Home after a week of use | A fictional wallet with RM1 and no activity |
|---|---|---|
| Header | **November** with a month picker | **‹ Accounts** above the user’s account name (**Wallet** in this fixture). Show a small wallet icon. Put account management in the top-right menu. |
| First number | **RM 348.50** · Left this month. Underneath, “RM 251.50 of RM 600.00 spent” and a narrow progress line. | **RM 1.00** · Current balance. Show “Opening balance RM 1.00” only if the opening entry is known. |
| Main action | **Record expense** opens the amount keypad. | **Record transaction** opens entry with Wallet selected. |
| Below | “Review 2 Touch ’n Go payments” when drafts are waiting. Recent activity follows, with a small terracotta food icon, “Campus café”, “Food · Touch ’n Go” and **−RM 8.50** aligned right. | **Activity** followed by “No transactions yet. Your first entry will appear here.” A quiet empty screen is appropriate. Omit the chart until dated balance changes make it informative. |
| Secondary | **View all activity** opens the full ledger. A pinned savings goal can sit below activity. | When populated, show dated ledger rows, individual receipts and an optional balance trend with a readable text summary. Archive used accounts from the menu. |

These are example states for design review. Seed them only in test fixtures or an explicitly selected demo.

## Visual system for the native app

| Element | Design decision |
|---|---|
| Surfaces | Warm cream canvas `#FBF7EF`, warm white sheet `#FFFDFA`, subtle divider `#DDD6C9`. Put transactions on one continuous surface with dividers. Reserve a tinted block for the budget summary or a pending review. |
| Type and amounts | Use Android system Roboto with a system fallback. Body 16 sp, supporting text 14 sp, section title 20 sp, balance 36 sp. Use medium or semibold for hierarchy. Right-align row amounts, use tabular digits and format MYR to two decimals. Allow wrapping and larger text. |
| Actions and feedback | Deep teal `#005B54` with white text for the main action. Ink `#222B29`, secondary text `#535C57`. Pair expense/income/transfer labels with signs or direction. Use `#A23632` for errors, destructive actions and over-budget states. |
| Personal colour | Give Food a terracotta tint, Transport a blue tint and Groceries a sage tint. Pair each with a recognisable icon and text. Keep category colour stable across entry, Activity and Insights. Let a goal carry its user's chosen icon, colour or existing photo. |
| Layout | Start with 20 dp side margins, a 4/8/12/16/24/32 dp spacing scale, 8 dp control corners, 12 dp grouped surfaces and 48 dp touch targets. Align headers, rows and amounts to shared edges. Use native safe-area insets. |
| Motion and access | Give buttons an immediate pressed state and let a saved entry visibly appear in its list. Announce save failures and leave the entry editable. Respect reduced motion. Verify text contrast, TalkBack order, keyboard reach and larger text on the native screen. |

The **design-taste-frontend** guidance is applied here through equal edges, a single button family, specific copy, one main action per task and visual checks on real content. In this native ledger, the subject is the actual balance, transaction or goal. Use native sheets, press feedback and scrolling lists. Review screenshots of the running app for fit and legibility.

## Navigation and screen contracts

Keep four tabs in familiar positions: **Home**, **Accounts**, **Insights**, **Settings**. Activity sits one tap from Home. Back returns to the previous list, selected period and filters. Entry remains reachable from Home, account detail and Android quick-add.

| Surface | What the user sees and can do |
|---|---|
| First launch and recovery | “Add your first account” with optional opening balance, zero allowed. Offer restore for returning users. Introduce the monthly budget after account creation. An optional demo stays isolated from real data. A storage error offers Retry and Restore. |
| Budget and activity | With a budget, show remaining or “Over budget by”. Without one, show spending and **Set monthly budget**. Keep the selected month visible. Activity opens on that month and offers all dates, account, category and search. Handle empty months and no matches separately. |
| Expense, income, transfer and receipt | Keep the amount, keypad and Save within reach. Remember the last account for ordinary entry. Put notes, dates and time behind one secondary row. A transfer shows From and To together. A receipt shows amount, type, date, accounts and source if known. Keep Edit accessible and Delete in the menu. |
| Account list, detail and editor | List account names and balances first. Net worth is a secondary summary which explains the inclusion of goals and liabilities. Allow a dated balance adjustment. Archive an account with history and retain it on past receipts. Keep archived accounts out of new-entry choices. |
| Insights | Lead with the period, total and largest spending category. Use labelled bars and show exact amounts. Tap a category to see the contributing entries for that period. With no spending, say so. Show comparisons only when the periods and data support them. |
| Goals and deposits | Show saved, target and remaining together. Use the chosen colour or cropped photo for identity. **Add money** selects the funding account, then records one movement. Tapping a deposit opens that deposit’s receipt. Preserve edit, pin, image and completed-goal states. |
| TNG review | One inbox for both Home and Settings. Show merchant if known, amount, time and pending status. **Review payment** opens an editable draft. Confirmation posts once. Dismissal changes no balances. Explain notification access when the user opts in. Keep manual entry available. |
| Settings, backup and restore | Group capture, backup and export by task. State what stays on the device. Before replacement, show the backup’s available date, entry counts and what will be replaced. Distinguish dismissal of a share sheet from a successful confirmed save where the platform permits. |
| Widgets, dialogs and pickers | Quick Add opens expense entry. Budget Overview agrees with Home for the current month. Use the same money format, date labels, colours and action verbs for widget text, app shortcuts, date/month, category, budget, account and goal forms. |

Use one complete English interface for the first review build. Keep user-entered Chinese or other names intact. This is a proposed first-pass language choice. Display “Recorded balance” where provenance is unknown and “Pending review” only for unconfirmed drafts.

## Review and release

First review the two example screens, a populated account, expense entry and its receipt. Then test a complete lunch purchase, a transfer and a goal deposit on Android. Check narrow screens, large text and keyboard-open forms before copying the components across the remaining screens. Use the pass conditions in the [execution checklist](REDESIGN-TODO.md).

The paid hypothesis is time saved reviewing real TNG payments and reusing merchant categories. Validate it with an opt-in pilot after the core experience works. A genuine capture sample and actual purchase intent are separate pieces of evidence.
