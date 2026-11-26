import { accountAppearance, categoryAppearance, isColorKey, isIconKey } from './budget-icons.js';

export const keys = {
  transactions: '@my_budget_data',
  assets: '@my_budget_assets',
  goals: '@my_budget_goals',
  categories: '@my_budget_categories',
  budget: '@my_budget_plan',
  lastAsset: '@my_budget_last_asset',
};

const legacyFields = Object.keys(keys);
const fields = legacyFields.filter(field => field !== 'budget').concat('monthlyBudgets');
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const isId = value => Number.isSafeInteger(value) || (typeof value === 'string' && value.length > 0);
const isDate = value => typeof value === 'string' && Number.isFinite(Date.parse(value));
const isDay = value => isDate(value) && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  new Date(value).toISOString().slice(0, 10) === value;
const hasId = value => isRecord(value) && isId(value.id);
const validAppearance = value => (value.iconKey === undefined || isIconKey(value.iconKey)) &&
  (value.colorKey === undefined || isColorKey(value.colorKey));
const isCategory = value => hasId(value) && typeof value.name === 'string' && validAppearance(value);
const validators = {
  transactions: value => Array.isArray(value) && value.every(item =>
    hasId(item) && Number.isFinite(item.amount) && isDate(item.date) &&
    ['expense', 'income', 'transfer'].includes(item.type) && validAppearance(item) &&
    (item.reimbursable === undefined || (item.type === 'expense' && typeof item.reimbursable === 'boolean')) &&
    (item.reimbursementFor === undefined || (item.type === 'income' && isId(item.reimbursementFor)))),
  assets: value => Array.isArray(value) && value.every(item =>
    hasId(item) && typeof item.name === 'string' && Number.isFinite(item.balance) && validAppearance(item) &&
    (item.accountType === undefined || ['asset', 'liability'].includes(item.accountType)) &&
    (item.archived === undefined || typeof item.archived === 'boolean') &&
    (item.openingAmount === undefined || Number.isFinite(item.openingAmount)) &&
    (item.openingDate === undefined || (isDate(item.openingDate) && /^\d{4}-\d{2}-\d{2}$/.test(item.openingDate)))),
  goals: value => Array.isArray(value) && value.every(item =>
    hasId(item) && typeof item.title === 'string' && validAppearance(item) &&
    Number.isFinite(item.targetAmount ?? item.target_amount) &&
    Number.isFinite(item.savedAmount ?? item.saved_amount) &&
    (item.targetDate == null || isDay(item.targetDate)) &&
    (item.backgroundImage == null || typeof item.backgroundImage === 'string')),
  categories: value => isRecord(value) && ['expense', 'income'].every(type =>
    Array.isArray(value[type]) && value[type].every(isCategory)),
  budget: value => Number.isFinite(value),
  monthlyBudgets: value => isRecord(value) && Object.entries(value).every(([month, amount]) =>
    /^\d{4}-(0[1-9]|1[0-2])$/.test(month) && Number.isFinite(amount) && amount > 0),
  recurringRules: value => Array.isArray(value) && new Set(value.map(rule => rule?.id)).size === value.length &&
    value.every(rule => hasId(rule) && ['expense', 'income', 'transfer'].includes(rule.type) &&
      typeof rule.title === 'string' && Number.isFinite(rule.amount) && Number.isSafeInteger(Math.round(rule.amount * 100)) && rule.amount > 0 &&
      isId(rule.assetId) && (rule.type === 'transfer' ? isId(rule.toAssetId) && rule.toAssetId !== rule.assetId : isId(rule.categoryId)) &&
      ['weekly', 'monthly'].includes(rule.frequency) && isDay(rule.startDay) && isDay(rule.nextDay) &&
      rule.nextDay >= rule.startDay && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(rule.time) &&
      (rule.reminderDays === null || [1, 3, 7].includes(rule.reminderDays))),
  lastAsset: value => isId(value),
};

function validate(field, value) {
  if (!validators[field]?.(value)) throw new Error(`Invalid budget data for ${field}.`);
}

class LegacyMigrationError extends Error {}

export function readBackup(file, today = new Date()) {
  const backup = JSON.parse(file);
  if (backup?.format !== 'MyBudgetApp' || ![1, 2, 3].includes(backup.version) || !isRecord(backup.data)) {
    throw new Error('Choose a MyBudgetApp backup (version 1, 2 or 3).');
  }
  const backupFields = backup.version === 3 ? [...fields, 'recurringRules'] : fields;
  for (const field of backup.version === 1 ? legacyFields : backupFields) {
    const value = backup.data[field];
    if (value === null && field === 'lastAsset') continue;
    validate(field, value);
  }
  return Object.fromEntries(backupFields.map(field => [field, field === 'monthlyBudgets' && backup.version === 1
    ? migrateBudget(backup.data.budget, today) : backup.data[field]]));
}

function migrateBudget(budget, today) {
  return budget > 0 ? { [localDay(today).slice(0, 7)]: budget } : {};
}

function upgradeIcons(field, value) {
  const convert = (items, appearance) => items.some(item => Object.hasOwn(item, 'icon'))
    ? items.map(item => {
      if (!Object.hasOwn(item, 'icon')) return item;
      const { icon, ...record } = item;
      return { ...record, ...appearance(item) };
    }) : items;

  if (field === 'assets') return convert(value, accountAppearance);
  if (field === 'transactions') return convert(value, entry => categoryAppearance(undefined, entry));
  if (field === 'categories') {
    const expense = convert(value.expense, category => categoryAppearance(category));
    const income = convert(value.income, category => categoryAppearance(category));
    if (expense !== value.expense || income !== value.income) return { ...value, expense, income };
  }
  return value;
}

async function writeRows(db, changes) {
  for (const [field, value] of Object.entries(changes)) {
    if (field === 'lastAsset' && value === null) {
      await db.runAsync('DELETE FROM budget WHERE field = ?', field);
      continue;
    }
    validate(field, value);
    await db.runAsync('INSERT OR REPLACE INTO budget VALUES (?, ?)', field, JSON.stringify(upgradeIcons(field, value)));
  }
}

export function createBudgetStore(openDatabase, readLegacy, now = () => new Date()) {
  let opening;
  let writes = Promise.resolve();

  function ready(recovery = null) {
    opening ??= (async () => {
      const db = await openDatabase();
      try {
        await db.execAsync(`
          PRAGMA busy_timeout = 5000;
          PRAGMA journal_mode = WAL;
          CREATE TABLE IF NOT EXISTS budget (field TEXT PRIMARY KEY, value TEXT NOT NULL);
          CREATE TABLE IF NOT EXISTS migrations (name TEXT PRIMARY KEY);
          CREATE TABLE IF NOT EXISTS payment_drafts (
            id TEXT PRIMARY KEY, amount_sen INTEGER NOT NULL, merchant TEXT,
            posted_at INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'pending'
          );
        `);
        await db.withExclusiveTransactionAsync(async transaction => {
          const columns = await transaction.getAllAsync('PRAGMA table_info(payment_drafts)');
          if (!columns.some(column => column.name === 'transaction_type')) {
            await transaction.execAsync("ALTER TABLE payment_drafts ADD COLUMN transaction_type TEXT NOT NULL DEFAULT 'expense'");
          }
        });
        const marker = 'async-storage-v1';
        if (!await db.getFirstAsync('SELECT name FROM migrations WHERE name = ?', marker)) {
          const changes = { ...recovery };
          if (!recovery) {
            try {
              const rows = new Map(await readLegacy(Object.values(keys)));
              for (const [field, key] of Object.entries(keys)) {
                const raw = rows.get(key);
                if (raw == null) continue;
                // AsyncStorage saved the last account ID as text.
                changes[field] = field === 'lastAsset'
                  ? (/^-?\d+$/.test(raw) && Number.isSafeInteger(Number(raw)) ? Number(raw) : raw)
                  : JSON.parse(raw);
                validate(field, changes[field]);
              }
            } catch {
              throw new LegacyMigrationError('Could not read the existing budget. You can retry or restore from a backup.');
            }
          }
          await db.withExclusiveTransactionAsync(async transaction => {
            await transaction.execAsync('PRAGMA busy_timeout = 5000');
            const inserted = await transaction.runAsync('INSERT OR IGNORE INTO migrations VALUES (?)', marker);
            if (inserted.changes) await writeRows(transaction, changes);
          });
        }
        if (!await db.getFirstAsync('SELECT name FROM migrations WHERE name = ?', 'monthly-budgets-v2')) {
          await db.withExclusiveTransactionAsync(async transaction => {
            await transaction.execAsync('PRAGMA busy_timeout = 5000');
            const inserted = await transaction.runAsync('INSERT OR IGNORE INTO migrations VALUES (?)', 'monthly-budgets-v2');
            if (!inserted.changes) return;
            const row = await transaction.getFirstAsync("SELECT value FROM budget WHERE field = 'budget'");
            if (row) {
              const budget = JSON.parse(row.value);
              validate('budget', budget);
              await writeRows(transaction, { monthlyBudgets: migrateBudget(budget, now()) });
              await transaction.runAsync("DELETE FROM budget WHERE field = 'budget'");
            }
          });
        }
        const iconMigration = 'bundled-icons-v1';
        if (!await db.getFirstAsync('SELECT name FROM migrations WHERE name = ?', iconMigration)) {
          await db.withExclusiveTransactionAsync(async transaction => {
            await transaction.execAsync('PRAGMA busy_timeout = 5000');
            const inserted = await transaction.runAsync('INSERT OR IGNORE INTO migrations VALUES (?)', iconMigration);
            if (!inserted.changes) return;
            const rows = await transaction.getAllAsync("SELECT field, value FROM budget WHERE field IN ('assets', 'categories', 'transactions')");
            for (const { field, value } of rows) {
              const previous = JSON.parse(value);
              validate(field, previous);
              const updated = upgradeIcons(field, previous);
              if (updated !== previous) await writeRows(transaction, { [field]: updated });
            }
          });
        }
        return db;
      } catch (error) {
        await db.closeAsync();
        throw error;
      }
    })().catch(error => {
      opening = undefined;
      throw error;
    });
    return opening;
  }

  function write(operation) {
    const result = writes.then(async () => {
      const db = await ready();
      let value;
      await db.withExclusiveTransactionAsync(async transaction => {
        await transaction.execAsync('PRAGMA busy_timeout = 5000');
        value = await operation(transaction);
      });
      return value;
    });
    writes = result.catch(() => {});
    return result;
  }

  return {
    async read() {
      const db = await ready();
      const rows = await db.getAllAsync('SELECT field, value FROM budget');
      return Object.fromEntries(rows.map(({ field, value }) => [field, JSON.parse(value)]));
    },
    save(changes, draftId = null) {
      return write(async db => {
        if (draftId) {
          const result = await db.runAsync(
            "UPDATE payment_drafts SET status = 'confirmed' WHERE id = ? AND status = 'pending'", draftId);
          if (!result.changes) return false;
        }
        await writeRows(db, changes);
        return true;
      });
    },
    async restore(data) {
      try {
        await ready();
      } catch (error) {
        if (!(error instanceof LegacyMigrationError)) throw error;
        await ready(data);
      }
      return write(async db => {
        await db.runAsync('DELETE FROM budget');
        await writeRows(db, data);
        await db.runAsync("UPDATE payment_drafts SET status = 'dismissed' WHERE status = 'pending'");
      });
    },
    importDrafts(drafts) {
      return write(async db => {
        for (const draft of drafts) {
          await db.runAsync(
            'INSERT OR IGNORE INTO payment_drafts (id, amount_sen, merchant, posted_at, transaction_type) VALUES (?, ?, ?, ?, ?)',
            draft.id, draft.amountSen, draft.merchant ?? null, draft.postedAt, draft.type === 'transfer' ? 'transfer' : 'expense');
        }
      });
    },
    async pendingDrafts() {
      const db = await ready();
      return db.getAllAsync(`
        SELECT id, amount_sen AS amountSen, merchant, posted_at AS postedAt, transaction_type AS type
        FROM payment_drafts WHERE status = 'pending' ORDER BY posted_at DESC
      `);
    },
    dismissDraft(id) {
      return write(db => db.runAsync(
        "UPDATE payment_drafts SET status = 'dismissed' WHERE id = ? AND status = 'pending'", id));
    },
  };
}

export function localDay(date) {
  const pad = value => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function transactionDay(date) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : localDay(new Date(date));
}

export function accountMovement(transaction, assetId) {
  if (!transaction) return 0;
  if (['opening', 'adjustment'].includes(transaction.subType)) {
    return transaction.assetId === assetId ? transaction.amount : 0;
  }
  const amount = Math.abs(transaction.amount);
  const outgoing = transaction.assetId === assetId ? (transaction.type === 'income' ? amount : -amount) : 0;
  const incoming = transaction.subType === 'internal' && transaction.toAssetId === assetId ? amount : 0;
  return outgoing + incoming;
}

export function accountClosingBalance(asset, transactions, day) {
  return cents(transactions.reduce((balance, entry) =>
    transactionDay(entry.date) > day ? balance - accountMovement(entry, asset.id) : balance, asset.balance));
}

export function accountHistory(asset, transactions, today = new Date(), days = 30) {
  const byDay = new Map();
  const cursor = new Date(today);
  for (const transaction of transactions) {
    const change = accountMovement(transaction, asset.id);
    if (change) {
      const day = transactionDay(transaction.date);
      byDay.set(day, cents((byDay.get(day) ?? 0) + change));
    }
  }
  let balance = asset.balance;
  const todayKey = localDay(cursor);
  for (const [day, change] of byDay) {
    if (day > todayKey) balance = cents(balance - change);
  }
  const result = [];
  for (let index = 0; index < days; index++) {
    const day = localDay(cursor);
    if (asset.openingDate && day < asset.openingDate) break;
    result.push({ day, value: balance });
    balance = cents(balance - (byDay.get(day) ?? 0));
    cursor.setDate(cursor.getDate() - 1);
  }
  return result.reverse();
}

export const cents = amount => Math.round(amount * 100) / 100;

export function reimbursementTotals(transactions) {
  const expenses = new Set(transactions.filter(entry => entry.type === 'expense' && entry.reimbursable).map(entry => entry.id));
  const repaid = new Map();
  const payments = new Set();
  for (const entry of transactions) {
    if (entry.type !== 'income' || !expenses.has(entry.reimbursementFor)) continue;
    payments.add(entry.id);
    repaid.set(entry.reimbursementFor, cents((repaid.get(entry.reimbursementFor) ?? 0) + Math.abs(entry.amount)));
  }
  return { repaid, payments };
}

export function netExpense(entry, repaid) {
  return Math.max(0, cents(Math.abs(entry.amount) - (repaid.get(entry.id) ?? 0)));
}

export function reimbursementIssue(entry, transactions) {
  const repayments = transactions.filter(item => item.type === 'income' && item.reimbursementFor === entry.id);
  if (repayments.length) {
    if (!entry.reimbursable || entry.type !== 'expense') return 'Unlink the repayments before removing Split / Reimbursable.';
    if (repayments.some(item => transactionDay(item.date) < transactionDay(entry.date))) {
      return 'The expense date must be on or before its repayments.';
    }
    const repaid = cents(repayments.reduce((total, item) => total + Math.abs(item.amount), 0));
    if (repaid > Math.abs(entry.amount)) return 'The expense cannot be smaller than its linked repayments.';
  }
  if (entry.reimbursementFor == null) return null;
  if (entry.id === entry.reimbursementFor) return 'A repayment must be linked to a different entry.';
  const original = transactions.find(item => item.id === entry.reimbursementFor && item.reimbursable && item.type === 'expense');
  if (!original) return 'Choose an expense marked Split / Reimbursable.';
  if (transactionDay(entry.date) < transactionDay(original.date)) return 'The repayment date must be on or after the expense.';
  const otherRepayments = transactions.filter(item => item.type === 'income' && item.id !== entry.id);
  const { repaid } = reimbursementTotals([original, ...otherRepayments]);
  const remaining = netExpense(original, repaid);
  return entry.amount > remaining ? 'The unpaid portion is ' + formatMoney(remaining) + '.' : null;
}

export function calculateAmount(text) {
  const tokens = text.match(/\d+(?:\.\d*)?|\.\d+|[+\-*/]/g);
  if (!tokens || tokens.join('') !== text) return NaN;
  let index = 0;
  const number = () => {
    const negative = tokens[index] === '-';
    if (negative) index++;
    const token = tokens[index++];
    return /^(?:\d|\.\d)/.test(token) ? (negative ? -1 : 1) * Number(token) : NaN;
  };
  let sum = 0;
  let term = number();
  while (index < tokens.length) {
    const operator = tokens[index++];
    const value = number();
    if (operator === '*') term *= value;
    else if (operator === '/') term /= value;
    else if (operator === '+' || operator === '-') {
      sum += term;
      term = operator === '+' ? value : -value;
    } else return NaN;
  }
  return cents(sum + term);
}

export function formatMoney(value) {
  const amount = Math.abs(value).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${value < 0 ? '−' : ''}RM ${amount}`;
}

export function applyLedgerChange(assets, goals, before, after) {
  const goalDelta = (transaction, goalId) =>
    transaction?.subType === 'goal_deposit' && transaction.goalId === goalId
      ? Math.abs(transaction.amount) : 0;
  const updatedAssets = assets.map(asset => {
    const change = accountMovement(after, asset.id) - accountMovement(before, asset.id);
    return change ? { ...asset, balance: cents(asset.balance + change) } : asset;
  });
  const updatedGoals = goals.map(goal => {
    const change = goalDelta(after, goal.id) - goalDelta(before, goal.id);
    return change ? { ...goal, savedAmount: cents((goal.savedAmount ?? goal.saved_amount) + change) } : goal;
  });
  return { assets: updatedAssets, goals: updatedGoals };
}

export function widgetTotals({ transactions = [], monthlyBudgets = {} }, today = new Date()) {
  const day = localDay(today);
  const month = day.slice(0, 7);
  let todayExpense = 0;
  let monthExpense = 0;
  const { repaid } = reimbursementTotals(transactions);
  for (const transaction of transactions) {
    if (transaction.type !== 'expense') continue;
    const date = transactionDay(transaction.date);
    const cost = netExpense(transaction, repaid);
    if (date === day) todayExpense += cost;
    if (date.startsWith(month)) monthExpense += cost;
  }
  return { monthlyBudget: monthlyBudgets[month] ?? 0, totalExpense: cents(todayExpense), monthExpense: cents(monthExpense) };
}
