import assert from 'node:assert/strict';
import test from 'node:test';
import { assetAllocation, assetOverview, balanceTrendDomain, categorySlices, dailyAllowances, dailySpendingAverage,
  filterActivity, monthlySavingsPace, periodBounds, periodTotals } from '../lib/budget-insights.js';
import { cents, localDay } from '../lib/budget-store.js';

test('the trend scale gives small movements room while accommodating larger swings and flat balances', () => {
  const small = balanceTrendDomain([{ value: 3150 }, { value: 3126 }]);
  assert.ok(small.high - small.low > 300);
  assert.equal((small.low + small.high) / 2, 3138);
  const { low, high } = balanceTrendDomain([{ value: 3126 }, { value: 3681 }]);
  assert.equal(((3126 - low) / (high - low)).toFixed(2), '0.18');
  assert.equal(((high - 3681) / (high - low)).toFixed(2), '0.18');
  assert.deepEqual(balanceTrendDomain([{ value: 0 }]), { low: -50, high: 50 });
});

test('daily spending average counts elapsed calendar days and omits future-dated entries', () => {
  const today = new Date(2026, 10, 25);
  const expenses = [
    { id: 1, date: '2026-11-20', type: 'expense', amount: -24 },
    { id: 2, date: '2026-11-27', type: 'expense', amount: -6 },
  ];
  assert.equal(dailySpendingAverage(expenses, 'monthly', today, today), 0.96);
  assert.equal(dailySpendingAverage(expenses, 'monthly', today, new Date(2026, 11, 1)), 1);
  assert.equal(dailySpendingAverage(expenses, 'monthly', new Date(2026, 11, 1), today), null);
});

test('monthly savings pace accounts for existing savings and rounds up to the next sen', () => {
  const today = new Date(2026, 10, 25);
  const goal = { targetAmount: 1000, savedAmount: 300, targetDate: '2027-02-25' };
  assert.equal(monthlySavingsPace(goal, today), 233.34);
  assert.equal(monthlySavingsPace({ ...goal, targetDate: '2026-12-01' }, today), 700);
  assert.equal(monthlySavingsPace({ ...goal, targetDate: '2026-11-25' }, today), null);
  assert.equal(monthlySavingsPace({ ...goal, targetDate: null }, today), null);
  assert.equal(monthlySavingsPace({ ...goal, savedAmount: 1000 }, today), null);
});

test('daily allowance reconciles to the remaining budget by assigning spare sen to the last date', () => {
  const month = new Date(2026, 10, 1);
  const today = new Date(2026, 10, 24);
  assert.deepEqual(dailyAllowances(month, 1200, 538.76, today), [94.46, 94.46, 94.46, 94.46, 94.46, 94.46, 94.48]);
  assert.deepEqual(dailyAllowances(month, 2, 1.99, new Date(2026, 10, 30)), [0.01]);
  assert.deepEqual(dailyAllowances(month, 1, 2, new Date(2026, 10, 30)), [0]);
  assert.deepEqual(dailyAllowances(month, 0, 0, today), []);
  assert.deepEqual(dailyAllowances(month, 1200, 538.76, new Date(2026, 11, 1)), []);
});

test('chart slices reconcile with their totals, including goal savings and grouped categories', () => {
  const rows = [97, 1.01, 1.99].map((amount, id) => ({ id, amount }));
  const slices = categorySlices(rows);
  assert.equal(slices.length, 2);
  assert.equal(slices[1].amount, 3);
  assert.deepEqual(slices[1].children.map(row => row.id), [2, 1]);
  assert.equal(cents(slices.reduce((sum, row) => sum + row.amount, 0)), 100);
  const { holdings, debts, assets, liabilities } = assetAllocation([
    { id: 1, balance: 0.1 }, { id: 2, balance: -0.15, archived: true }, { id: 3, balance: 0 },
  ], [{ savedAmount: 0.2 }]);
  assert.deepEqual(holdings.map(row => row.id), [1, 'savings-goals']);
  assert.equal(assets, 0.3);
  assert.equal(debts[0].amount, 0.15);
  assert.equal(liabilities, 0.15);
});

test('weekly totals include Monday through Sunday across a year boundary', () => {
  const anchor = new Date(2027, 0, 1);
  assert.deepEqual(periodBounds('weekly', anchor).map(localDay), ['2026-12-28', '2027-01-04']);
  const totals = periodTotals([
    { date: '2026-12-27', type: 'expense', amount: -50 },
    { date: '2026-12-28', type: 'expense', amount: '-10.50', categoryId: 'food' },
    { date: '2027-01-01', type: 'income', amount: 30, categoryId: 'salary' },
    { date: '2027-01-02', type: 'transfer', amount: 25, subType: 'internal' },
    { date: '2027-01-03', type: 'expense', amount: 3.5, categoryId: 'food' },
    { date: '2027-01-04', type: 'income', amount: 80 },
  ], 'weekly', anchor);
  assert.equal(totals.income, 30);
  assert.equal(totals.expense, 14);
  assert.deepEqual([...totals.expenseCategories], [['food', 14]]);
});

test('net worth history reverses income and expenses but preserves internal moves', () => {
  const now = new Date(2026, 10, 23);
  const overview = assetOverview([{ balance: '120' }, { balance: -20 }], [{ saved_amount: 40 }], [
    { date: '2026-11-23', type: 'expense', amount: -10 },
    { date: '2026-11-23', type: 'transfer', subType: 'internal', amount: 200 },
    { date: '2026-11-23', type: 'transfer', subType: 'goal_deposit', amount: 40 },
    { date: '2026-11-22', type: 'income', amount: 50 },
  ], now);
  assert.equal(overview.assets, 160);
  assert.equal(overview.liabilities, 20);
  assert.equal(overview.netWorth, 140);
  assert.equal(overview.trend.length, 30);
  assert.deepEqual(overview.trend.slice(-3).map(item => item.value), [100, 150, 140]);
});

test('daily net worth preserves cent precision when reversing a future change and a liability payment', () => {
  const account = { id: 1, balance: -0.29, accountType: 'liability' };
  const transactions = [
    { date: '2026-11-24', type: 'expense', amount: -0.01, assetId: 1 },
    { date: '2026-11-23', type: 'transfer', subType: 'adjustment', amount: 0.06, assetId: 1 },
  ];
  assert.deepEqual(assetOverview([account], [], transactions, new Date(2026, 10, 23)).trend.slice(-2).map(point => point.value),
    [-0.34, -0.28]);
});

test('activity search includes older entries and drill-downs add up to the selected report', () => {
  const november = new Date(2026, 10, 1);
  const newest = Array.from({ length: 20 }, (_, id) => ({
    id, date: '2026-11-24', title: 'Lunch', categoryId: 'food', type: 'expense', amount: -8.15, assetId: 1,
  }));
  const oldest = { ...newest[0], id: 20, date: '2026-11-02', title: 'Find activity entry 21', amount: -7.23 };
  const transfer = { id: 21, date: '2026-11-02', type: 'transfer', subType: 'internal', amount: 50, assetId: 1, toAssetId: 2 };
  const transactions = [...newest, oldest, transfer, { ...oldest, id: 22, date: '2026-10-14' }];
  assert.deepEqual(filterActivity(transactions, { query: 'entry 21', period: 'monthly', date: november }), [oldest]);
  assert.deepEqual(filterActivity(transactions, { account: 2 }), [transfer]);
  const drillDown = filterActivity(transactions, { period: 'monthly', type: 'expense', category: 'food', date: november });
  const totals = periodTotals(transactions, 'monthly', november);
  assert.equal(drillDown.length, 21);
  assert.equal(totals.expenseCategories.get('food'), 170.23);
  assert.equal(periodTotals(drillDown, 'monthly', november).expense, totals.expenseCategories.get('food'));
});
