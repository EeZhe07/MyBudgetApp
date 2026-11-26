import assert from 'node:assert/strict';
import test from 'node:test';
import { filterActivity, periodTotals } from '../lib/budget-insights.js';
import { nextRecurringDay, postDueRules, upcomingReminders } from '../lib/budget-recurring.js';
import { applyLedgerChange, reimbursementIssue, widgetTotals } from '../lib/budget-store.js';

const meal = {
  id: 1, date: '2026-11-25', title: 'Dinner', merchant: 'Little Cafe', note: 'Group meal',
  type: 'expense', amount: -40, assetId: 'tng', categoryId: 'food', reimbursable: true,
};
const repayment = { id: 2, date: '2026-12-02', type: 'income', amount: 30, assetId: 'tng', reimbursementFor: 1 };
const topup = { id: 3, date: '2026-12-03', type: 'transfer', amount: 50, assetId: 'bank', toAssetId: 'tng', subType: 'internal' };

test('repayments reduce the purchase period spending and recognize cash on the date it moved', () => {
  const november = new Date(2026, 10, 25);
  const december = new Date(2026, 11, 3);
  const entries = [meal, repayment, topup, { id: 4, date: '2026-12-03', type: 'income', amount: 100, categoryId: 'salary' }];
  const originalPeriod = periodTotals(entries, 'monthly', november);
  assert.deepEqual([originalPeriod.expense, originalPeriod.income, originalPeriod.cashFlow], [10, 0, -40]);
  assert.deepEqual([...originalPeriod.expenseCategories], [['food', 10]]);
  const laterPeriod = periodTotals(entries, 'monthly', december);
  assert.deepEqual([laterPeriod.expense, laterPeriod.income, laterPeriod.cashFlow], [0, 100, 130]);
  assert.deepEqual([...laterPeriod.incomeCategories], [['salary', 100]]);
  assert.deepEqual(widgetTotals({ transactions: entries }, november), { totalExpense: 10, monthExpense: 10, monthlyBudget: 0 });
  assert.equal(periodTotals([meal], 'monthly', november).expense, 40);
  const assets = [{ id: 'tng', balance: 100 }];
  const paid = applyLedgerChange(assets, [], null, meal);
  assert.equal(paid.assets[0].balance, 60);
  assert.equal(applyLedgerChange(paid.assets, [], null, repayment).assets[0].balance, 90);
});

test('repayment edits check the other amounts, the purchase date and the original split flag', () => {
  assert.equal(reimbursementIssue(repayment, [meal, repayment]), null);
  assert.equal(reimbursementIssue({ ...repayment, amount: 35 }, [meal, repayment]), null);
  assert.match(reimbursementIssue({ ...repayment, id: 5, amount: 11 }, [meal, repayment]), /RM 10\.00/);
  assert.match(reimbursementIssue({ ...repayment, date: '2026-11-24' }, [meal]), /on or after/);
  assert.match(reimbursementIssue({ ...meal, reimbursable: false }, [meal, repayment]), /Unlink/);
  assert.match(reimbursementIssue({ ...meal, amount: -20 }, [meal, repayment]), /cannot be smaller/);
  assert.match(reimbursementIssue({ ...meal, type: 'income', amount: 30, reimbursementFor: meal.id }, [meal]), /different entry/);
});

test('keyword search checks merchant and note and combines all three filter groups', () => {
  const entries = [meal, repayment, topup, { ...meal, id: 4, assetId: 'cash' }];
  const filters = { account: ['bank', 'tng'], category: ['food', 'transfer'], type: ['expense', 'transfer'] };
  assert.deepEqual(filterActivity(entries, filters).map(entry => entry.id), [1, 3]);
  assert.deepEqual(filterActivity(entries, { ...filters, query: 'CAFE group' }).map(entry => entry.id), [1]);
  assert.deepEqual(filterActivity(entries, { account: ['tng'], type: ['transfer'] }).map(entry => entry.id), [3]);
  assert.equal(filterActivity(entries, { type: [] }).length, entries.length);
});

test('due monthly and weekly rules catch up once and keep transfers balanced', () => {
  const monthly = { id: 9, type: 'expense', title: 'Telco', categoryId: 'other', amount: 10, assetId: 'bank',
    startDay: '2026-01-31', nextDay: '2026-01-31', frequency: 'monthly', time: '08:30', reminderDays: 3 };
  const weekly = { ...monthly, id: 10, type: 'transfer', title: 'TnG top-up', toAssetId: 'tng', amount: 20,
    frequency: 'weekly', startDay: '2026-02-22', nextDay: '2026-02-22', reminderDays: 1 };
  assert.equal(nextRecurringDay('2026-01-31', 'monthly', '2026-01-31'), '2026-02-28');
  assert.equal(nextRecurringDay('2026-02-28', 'monthly', '2026-01-31'), '2026-03-31');
  const old = { recurringRules: [monthly, weekly], transactions: [], categories: { expense: [{ id: 'other' }] },
    assets: [{ id: 'bank', balance: 200, name: 'Maybank' }, { id: 'tng', balance: 0, name: 'TnG' }] };
  const now = new Date(2026, 2, 1, 9);
  const result = postDueRules(old, now);
  assert.deepEqual(result.recurringRules.map(rule => rule.nextDay), ['2026-03-31', '2026-03-08']);
  assert.deepEqual(result.transactions.map(entry => entry.id), [
    'recurring:9:2026-01-31', 'recurring:9:2026-02-28', 'recurring:10:2026-02-22', 'recurring:10:2026-03-01',
  ]);
  assert.deepEqual(result.assets.map(account => account.balance), [140, 40]);
  assert.equal(result.transactions.at(-1).subType, 'internal');
  assert.equal(postDueRules({ ...old, ...result }, now), null);
  const replay = postDueRules({ ...old, assets: result.assets, transactions: result.transactions }, now);
  assert.deepEqual(replay.assets, result.assets);
  assert.equal(replay.transactions.length, 4);
  assert.equal(postDueRules({ ...old, recurringRules: [weekly], assets: [old.assets[0], { ...old.assets[1], archived: true }] }, now), null);
  const [reminder] = upcomingReminders(result.recurringRules, result.assets, now);
  assert.equal(reminder.identifier, 'budget-recurring:10:2026-03-08:1');
  assert.deepEqual(reminder.date, new Date(2026, 2, 7, 9));
});
