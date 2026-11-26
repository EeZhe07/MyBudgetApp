import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { test } from 'node:test';
import { accountClosingBalance, accountHistory, accountMovement, applyLedgerChange, calculateAmount, createBudgetStore, keys, readBackup, transactionDay, widgetTotals } from '../lib/budget-store.js';
import { assetOverview, periodTotals } from '../lib/budget-insights.js';
import { iconCatalog } from '../assets/lucide-icons.js';
import { accountAppearance, categoryAppearance, goalAppearance, goalIconKeys, pastelSwatches, suggestAccountAppearance } from '../lib/budget-icons.js';

function fixture() {
  const sql = new DatabaseSync(':memory:');
  const db = {
    execAsync: statement => sql.exec(statement),
    runAsync: (statement, ...params) => sql.prepare(statement).run(...params),
    getFirstAsync: (statement, ...params) => sql.prepare(statement).get(...params),
    getAllAsync: (statement, ...params) => sql.prepare(statement).all(...params),
    closeAsync: () => {},
    async withExclusiveTransactionAsync(operation) {
      sql.exec('BEGIN');
      try {
        await operation(db);
        sql.exec('COMMIT');
      } catch (error) {
        sql.exec('ROLLBACK');
        throw error;
      }
    },
  };
  return { db, sql };
}

const date = new Date(2026, 10, 23, 0, 30);
const data = {
  transactions: [{
    id: 8, type: 'transfer', subType: 'internal', amount: 50, date: date.toISOString(),
    assetId: 1, toAssetId: 2,
  }],
  assets: [{ id: 1, name: 'HLB', balance: 450 }, { id: 2, name: 'TNG', balance: 50 }],
  goals: [{ id: 5, title: 'Books', targetAmount: 100, savedAmount: 25 }],
  categories: { expense: [{ id: 'food', name: 'Food' }], income: [] },
  monthlyBudgets: { '2026-11': 100 },
  lastAsset: 2,
};

const { monthlyBudgets, ...baseData } = data;
const legacyData = { ...baseData, budget: monthlyBudgets['2026-11'] };

test('migration preserves legacy data, runs once and supports a backup round trip', async () => {
  const { db, sql } = fixture();
  const legacy = Object.entries(legacyData).map(([field, value]) => [keys[field], JSON.stringify(value)]);
  const store = createBudgetStore(async () => db, async () => legacy, () => date);
  assert.deepEqual(await store.read(), data);
  assert.equal(legacy.length, 6);
  const restarted = createBudgetStore(async () => db, async () => assert.fail('legacy read after migration'), () => new Date(2026, 11, 1));
  assert.deepEqual(await restarted.read(), data);

  const fresh = fixture();
  const restored = createBudgetStore(async () => fresh.db, async () => []);
  const backup = JSON.stringify({ format: 'MyBudgetApp', version: 2, data: await store.read() });
  await restored.restore(readBackup(backup));
  assert.deepEqual(await restored.read(), data);
  assert.deepEqual(readBackup(JSON.stringify({ format: 'MyBudgetApp', version: 1, data: legacyData }), date), data);
  assert.throws(() => readBackup(backup.replace('"version":2', '"version":3')));
  fresh.sql.close();
  sql.close();
});

test('a bad legacy record leaves the migration retryable', async () => {
  const { db, sql } = fixture();
  let legacy = [[keys.assets, JSON.stringify(data.assets)], [keys.transactions, 'broken']];
  const store = createBudgetStore(async () => db, async () => legacy);
  await assert.rejects(store.read(), /Could not read the existing budget/);
  assert.equal(db.getAllAsync('SELECT * FROM migrations').length, 0);
  assert.equal(db.getAllAsync('SELECT * FROM budget').length, 0);
  legacy = [[keys.assets, JSON.stringify(data.assets)]];
  assert.deepEqual(await store.read(), { assets: data.assets });
  sql.close();
});

test('version 3 backups preserve repayment links and recurring rules through SQLite', async () => {
  const { db, sql } = fixture();
  const store = createBudgetStore(async () => db, async () => []);
  const meal = { id: 20, type: 'expense', amount: -40, date: '2026-11-20', assetId: 2, reimbursable: true };
  const repayment = { id: 21, type: 'income', amount: 30, date: '2026-11-25', assetId: 2, reimbursementFor: meal.id };
  const rule = { id: 22, type: 'transfer', title: 'TnG', amount: 50, assetId: 1, toAssetId: 2,
    frequency: 'weekly', startDay: '2026-11-20', nextDay: '2026-11-27', time: '09:00', reminderDays: 1 };
  const dataset = { ...data, transactions: [...data.transactions, meal, repayment], recurringRules: [rule] };
  await store.restore(readBackup(JSON.stringify({ format: 'MyBudgetApp', version: 3, data: dataset })));
  assert.deepEqual(await store.read(), dataset);
  await assert.rejects(store.save({ recurringRules: [{ ...rule, nextDay: '2026-11-31' }] }), /Invalid budget data/);
  assert.deepEqual(await store.read(), dataset);
  sql.close();
});

test('the icon catalog and pastel presets cover account names and legacy icons', () => {
  assert.equal(Object.keys(iconCatalog).length, 30);
  assert.equal(Object.keys(pastelSwatches).length, 6);
  assert.ok(goalIconKeys.every(key => Object.hasOwn(iconCatalog, key)));
  assert.deepEqual(goalAppearance({ icon: '✈️', color: '#E1EDF8' }), { iconKey: 'plane', colorKey: 'slate' });
  assert.deepEqual(goalAppearance({ icon: '💻' }), { iconKey: 'laptop', colorKey: 'sage' });
  const presets = [
    ['Maybank Savings', 'bank', 'ochre'], ['cimb', 'bank', 'peach'], ['Public Bank', 'bank', 'peach'],
    ['TnG', 'smartphone', 'slate'], ['Touch ’n Go', 'smartphone', 'slate'], ['GrabPay', 'smartphone', 'sage'],
    ['Cash', 'banknotes', 'sage'], ['现金', 'banknotes', 'sage'], ['Cashback', 'wallet', 'sand'],
  ];
  for (const [name, iconKey, colorKey] of presets) {
    assert.deepEqual(suggestAccountAppearance(name), { iconKey, colorKey });
  }
  assert.deepEqual(accountAppearance({ name: 'Savings', icon: '💳' }), { iconKey: 'credit-card', colorKey: 'lavender' });
  assert.deepEqual(accountAppearance({ name: 'Maybank', iconKey: 'vault', colorKey: 'slate' }), { iconKey: 'vault', colorKey: 'slate' });
  assert.deepEqual(categoryAppearance({ id: 'food', icon: '🍔' }), { iconKey: 'coffee', colorKey: 'peach' });
  assert.deepEqual(categoryAppearance({ id: 'study', icon: '📚' }), { iconKey: 'book-open', colorKey: 'slate' });
});

test('a goal starts with saved money and a target date without creating a deposit', async () => {
  const { db, sql } = fixture();
  const store = createBudgetStore(async () => db, async () => []);
  const goal = { id: 6, title: 'Emergency fund', targetAmount: 1000, savedAmount: 125.25, targetDate: '2027-03-23',
    iconKey: 'shield-check', colorKey: 'sage', backgroundImage: null };
  const dataset = { ...data, goals: [...data.goals, goal], recurringRules: [] };
  await store.restore(readBackup(JSON.stringify({ format: 'MyBudgetApp', version: 3, data: dataset })));
  const stored = await store.read();
  assert.deepEqual(stored, dataset);
  assert.equal(assetOverview(stored.assets, stored.goals, stored.transactions, date).savings, 150.25);
  await assert.rejects(store.save({ goals: [{ ...goal, targetDate: '2027-02-29' }] }), /Invalid budget data/);
  const deposit = { type: 'transfer', subType: 'goal_deposit', assetId: 1, goalId: goal.id, amount: 10 };
  const funded = applyLedgerChange(stored.assets, stored.goals, null, deposit);
  assert.equal(funded.goals.find(item => item.id === goal.id).savedAmount, 135.25);
  assert.equal(applyLedgerChange(funded.assets, funded.goals, deposit, null).goals.find(item => item.id === goal.id).savedAmount, 125.25);
  sql.close();
});

test('legacy SQLite icons and restored backups convert to stable icon and color keys', async () => {
  const { db, sql } = fixture();
  const old = {
    ...data,
    assets: [{ ...data.assets[0], name: 'Maybank', icon: '🏦' }, { ...data.assets[1], icon: '📱', colorKey: 'lavender' }],
    transactions: [{ ...data.transactions[0], icon: '↔️' }],
    categories: { expense: [{ id: 'study', name: 'Study', icon: '📚' }], income: [] },
    recurringRules: [],
  };
  const initial = createBudgetStore(async () => db, async () => []);
  await initial.read();
  sql.prepare('DELETE FROM migrations WHERE name = ?').run('bundled-icons-v1');
  const write = sql.prepare('INSERT OR REPLACE INTO budget VALUES (?, ?)');
  for (const [field, value] of Object.entries(old)) write.run(field, JSON.stringify(value));
  const migrated = createBudgetStore(async () => db, async () => []);
  const stored = await migrated.read();
  assert.deepEqual(stored.assets, [
    { ...data.assets[0], name: 'Maybank', iconKey: 'bank', colorKey: 'ochre' },
    { ...data.assets[1], iconKey: 'smartphone', colorKey: 'lavender' },
  ]);
  assert.deepEqual(stored.categories.expense, [{ id: 'study', name: 'Study', iconKey: 'book-open', colorKey: 'slate' }]);
  assert.deepEqual(stored.transactions, [{ ...data.transactions[0], iconKey: 'repeat', colorKey: 'lavender' }]);
  await migrated.restore(readBackup(JSON.stringify({ format: 'MyBudgetApp', version: 3, data: old })));
  assert.deepEqual(await migrated.read(), stored);
  sql.close();
});

test('restore can recover from unreadable legacy records', async () => {
  const { db, sql } = fixture();
  const store = createBudgetStore(async () => db, async () => [[keys.transactions, 'broken']]);
  await store.restore(data);
  assert.deepEqual(await store.read(), data);
  sql.close();
});

test('a payment updates the ledger and widget only once, and a failed write keeps its draft', async () => {
  const { db, sql } = fixture();
  const store = createBudgetStore(async () => db, async () => []);
  await store.restore(data);
  const draft = { id: 'lunch', amountSen: 800, merchant: 'Demo Cafe', postedAt: date.getTime() };
  const secondDraft = { ...draft, id: 'another-lunch' };
  await store.importDrafts([draft, draft, secondDraft]);
  assert.equal((await store.pendingDrafts()).length, 2);

  await assert.rejects(store.save({ ...data, monthlyBudgets: 'invalid' }, draft.id));
  assert.equal((await store.pendingDrafts()).length, 2);
  assert.deepEqual(await store.read(), data);

  const expense = { id: 9, type: 'expense', amount: -8, assetId: 2, date: date.toISOString() };
  const ledger = applyLedgerChange(data.assets, data.goals, null, expense);
  const changes = { ...ledger, transactions: [expense, ...data.transactions] };
  assert.deepEqual(await Promise.all([store.save(changes, draft.id), store.save(changes, draft.id)]), [true, false]);
  await store.dismissDraft(secondDraft.id);
  await store.importDrafts([draft, secondDraft]);
  assert.deepEqual(await store.pendingDrafts(), []);
  const saved = await store.read();
  assert.equal(saved.assets.find(asset => asset.id === 2).balance, 42);
  assert.deepEqual(widgetTotals(saved, date), { totalExpense: 8, monthExpense: 8, monthlyBudget: 100 });
  assert.deepEqual(applyLedgerChange(saved.assets, saved.goals, expense, null).assets, data.assets);
  assert.deepEqual(applyLedgerChange(data.assets, data.goals, data.transactions[0], null).assets,
    [{ id: 1, name: 'HLB', balance: 500 }, { id: 2, name: 'TNG', balance: 0 }]);
  sql.close();
});

test('a fresh install and an installation with no remaining accounts both stay empty', async () => {
  const { db, sql } = fixture();
  const fresh = createBudgetStore(async () => db, async () => []);
  assert.deepEqual((await fresh.read()).assets ?? [], []);
  await fresh.save({ assets: [{ id: 1, name: 'Wallet', balance: 1, openingAmount: 1, openingDate: '2026-11-23' }] });
  const reopened = createBudgetStore(async () => db, async () => assert.fail('legacy data reloaded'));
  assert.equal((await reopened.read()).assets[0].openingAmount, 1);
  await reopened.save({ assets: [] });
  assert.deepEqual((await createBudgetStore(async () => db, async () => []).read()).assets, []);
  sql.close();
});

test('a liability keeps its account type and a transfer reduces the outstanding balance', async () => {
  const { db, sql } = fixture();
  const store = createBudgetStore(async () => db, async () => []);
  const card = { id: 3, name: 'Credit card', accountType: 'liability', balance: 0, openingAmount: -120, openingDate: '2026-11-23' };
  const opening = { id: 1, type: 'transfer', subType: 'opening', assetId: 3, amount: card.openingAmount, date: card.openingDate };
  const payment = { id: 2, type: 'transfer', subType: 'internal', assetId: 1, toAssetId: 3, amount: 50, date: '2026-11-24' };
  const opened = applyLedgerChange([...data.assets, card], [], null, opening);
  const paid = applyLedgerChange(opened.assets, [], null, payment);
  await store.save({ assets: paid.assets, transactions: [opening, payment] });
  const stored = await store.read();
  assert.equal(stored.assets.find(account => account.id === 3).accountType, 'liability');
  assert.equal(stored.assets.find(account => account.id === 3).balance, -70);
  assert.equal(stored.assets.find(account => account.id === 1).balance, 400);
  assert.equal(assetOverview(stored.assets, [], stored.transactions).liabilities, 70);
  sql.close();
});

test('existing draft schemas migrate and bank-transfer drafts confirm once without increasing spending', async () => {
  const { db, sql } = fixture();
  sql.exec("CREATE TABLE payment_drafts (id TEXT PRIMARY KEY, amount_sen INTEGER NOT NULL, merchant TEXT, posted_at INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'pending')");
  sql.prepare('INSERT INTO payment_drafts (id, amount_sen, posted_at) VALUES (?, ?, ?)').run('old-purchase', 800, date.getTime());
  const store = createBudgetStore(async () => db, async () => []);
  await store.read();
  assert.equal((await store.pendingDrafts())[0].type, 'expense');
  await store.restore(data);
  const draft = { id: 'bank-transfer', amountSen: 100, merchant: 'TEST RECIPIENT', postedAt: date.getTime(), type: 'transfer' };
  await store.importDrafts([draft, draft]);
  assert.equal((await store.pendingDrafts())[0].type, 'transfer');
  const transfer = { id: 10, type: 'transfer', subType: 'internal', amount: 1, assetId: 2, toAssetId: 1, date: date.toISOString() };
  const changes = { ...applyLedgerChange(data.assets, data.goals, null, transfer), transactions: [transfer, ...data.transactions] };
  assert.deepEqual(await Promise.all([store.save(changes, draft.id), store.save(changes, draft.id)]), [true, false]);
  const result = await store.read();
  assert.deepEqual(result.assets.map(asset => asset.balance), [451, 49]);
  assert.equal(widgetTotals(result, date).monthExpense, 0);
  await store.importDrafts([draft]);
  assert.equal((await store.pendingDrafts()).length, 0);
  assert.equal(assetOverview(result.assets, result.goals, result.transactions, date).netWorth,
    assetOverview(data.assets, data.goals, data.transactions, date).netWorth);
  sql.close();
});

test('account movements agree across history, edits, deletion, restart and backup', async () => {
  const { db, sql } = fixture();
  const store = createBudgetStore(async () => db, async () => []);
  const today = new Date(2026, 10, 24, 12);
  const accounts = [
    { id: 1, name: 'Wallet', balance: 100, openingAmount: 100, openingDate: '2026-11-23' },
    { id: 2, name: 'Cash', balance: 200, openingAmount: 200, openingDate: '2026-11-23' },
  ];
  const openings = accounts.map(asset => ({ id: 'opening-' + asset.id, type: 'transfer', subType: 'opening',
    date: asset.openingDate, assetId: asset.id, amount: asset.openingAmount }));
  const expense = { id: 8, type: 'expense', amount: -8, date: today.toISOString(), assetId: 1 };
  const transfer = { id: 9, type: 'transfer', subType: 'internal', amount: 50, date: today.toISOString(), assetId: 2, toAssetId: 1 };
  let ledger = applyLedgerChange(accounts, data.goals, null, expense);
  ledger = applyLedgerChange(ledger.assets, ledger.goals, null, transfer);
  assert.deepEqual(ledger.assets.map(account => account.balance), [142, 150]);
  assert.equal(accountMovement(transfer, 1), 50);
  assert.equal(accountMovement(transfer, 2), -50);
  assert.equal(accountClosingBalance(ledger.assets[0], [expense, transfer, ...openings], '2026-11-23'), 100);
  assert.equal(periodTotals([expense, transfer, ...openings], 'monthly', today).expense, 8);
  const closing = accountHistory(ledger.assets[0], [expense, transfer, ...openings], today);
  assert.deepEqual(closing, [{ day: '2026-11-23', value: 100 }, { day: '2026-11-24', value: 142 }]);

  const edit = { ...expense, amount: -10 };
  ledger = applyLedgerChange(ledger.assets, ledger.goals, expense, edit);
  assert.equal(ledger.assets[0].balance, 140);
  ledger = applyLedgerChange(ledger.assets, ledger.goals, edit, null);
  assert.equal(ledger.assets[0].balance, 150);
  const deposit = { id: 10, type: 'transfer', subType: 'goal_deposit', amount: 20, date: today.toISOString(), assetId: 1, goalId: 5 };
  const previousWorth = assetOverview(ledger.assets, ledger.goals, [], today).netWorth;
  ledger = applyLedgerChange(ledger.assets, ledger.goals, null, deposit);
  assert.equal(ledger.assets[0].balance, 130);
  assert.equal(ledger.goals[0].savedAmount, 45);
  ledger.assets[0].archived = true;
  assert.equal(assetOverview(ledger.assets, ledger.goals, [deposit], today).netWorth, previousWorth);
  assert.equal(periodTotals([deposit], 'monthly', today).expense, 0);
  const adjustment = { id: 11, type: 'transfer', subType: 'adjustment', amount: -5, date: '2026-11-23', assetId: 1 };
  ledger = applyLedgerChange(ledger.assets, ledger.goals, null, adjustment);
  assert.equal(ledger.assets[0].balance, 125);
  const transactions = [adjustment, deposit, transfer, ...openings];
  const state = { ...data, ...ledger, transactions };
  await store.save(state);
  const restarted = createBudgetStore(async () => db, async () => []);
  assert.deepEqual(await restarted.read(), state);
  await restarted.restore(readBackup(JSON.stringify({ format: 'MyBudgetApp', version: 2, data: state })));
  assert.deepEqual(await restarted.read(), state);
  sql.close();
});

test('monthly budgets stay independent and a failed replacement preserves current data and drafts', async () => {
  const { db, sql } = fixture();
  const store = createBudgetStore(async () => db, async () => []);
  await store.restore(data);
  const draft = { id: 'a', amountSen: 800, postedAt: date.getTime() };
  await store.importDrafts([draft]);
  const edited = { '2026-11': 250, '2026-10': 300 };
  await store.save({ monthlyBudgets: edited });
  await assert.rejects(store.restore({ ...data, monthlyBudgets: { '2026-13': 30 } }));
  const current = await store.read();
  assert.deepEqual(current.monthlyBudgets, edited);
  assert.equal((await store.pendingDrafts()).length, 1);
  assert.equal(widgetTotals(current, new Date(2026, 8, 15)).monthlyBudget, 0);
  assert.equal(widgetTotals(current, new Date(2026, 9, 15)).monthlyBudget, 300);
  assert.equal(widgetTotals(current, date).monthlyBudget, 250);
  const v1 = readBackup(JSON.stringify({ format: 'MyBudgetApp', version: 1, data: { ...legacyData, lastAsset: null } }), date);
  await store.restore(v1);
  await store.importDrafts([draft]);
  assert.deepEqual(await store.pendingDrafts(), []);
  assert.equal((await store.read()).lastAsset, undefined);
  assert.deepEqual((await store.read()).monthlyBudgets, data.monthlyBudgets);
  sql.close();
});

test('Malaysia-local midnight belongs to the same day in tabs, history, and widgets', () => {
  const previousTimezone = process.env.TZ;
  process.env.TZ = 'Asia/Kuala_Lumpur';
  try {
    const timestamp = '2026-10-31T16:01:00.000Z';
    const expense = { type: 'expense', amount: -8.50, assetId: 1, date: timestamp };
    const today = new Date(timestamp);
    assert.equal(transactionDay(timestamp), '2026-11-01');
    assert.equal(transactionDay('2026-11-01'), '2026-11-01');
    assert.equal(periodTotals([expense], 'monthly', today).expense, 8.50);
    assert.equal(widgetTotals({ transactions: [expense] }, today).monthExpense, 8.50);
    assert.deepEqual(accountHistory({ id: 1, balance: 91.50 }, [expense], today, 2),
      [{ day: '2026-10-31', value: 100 }, { day: '2026-11-01', value: 91.50 }]);
  } finally {
    if (previousTimezone === undefined) delete process.env.TZ;
    else process.env.TZ = previousTimezone;
  }
});

test('the expense keypad evaluates arithmetic and rejects incomplete entries', () => {
  assert.equal(calculateAmount('1.5+3*2-1/2'), 7);
  assert.equal(calculateAmount('8.50'), 8.50);
  assert.equal(calculateAmount('.1+.2'), 0.3);
  assert.ok(Number.isNaN(calculateAmount('8+')));
  assert.ok(Number.isNaN(calculateAmount('8//2')));
  assert.ok(!Number.isFinite(calculateAmount('8/0')));
});
