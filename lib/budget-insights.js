import { accountMovement, cents, localDay, netExpense, reimbursementTotals, transactionDay } from './budget-store.js';

export function periodBounds(period, date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  if (period === 'yearly') return [new Date(year, 0, 1), new Date(year + 1, 0, 1)];
  if (period === 'monthly') return [new Date(year, month, 1), new Date(year, month + 1, 1)];

  const monday = date.getDate() - (date.getDay() + 6) % 7;
  return [new Date(year, month, monday), new Date(year, month, monday + 7)];
}

export function periodTotals(transactions, period, date, reimbursements = reimbursementTotals(transactions)) {
  const [first, next] = periodBounds(period, date).map(localDay);
  const result = { expense: 0, income: 0, cashFlow: 0, expenseCategories: new Map(), incomeCategories: new Map() };
  for (const transaction of transactions) {
    const { type } = transaction;
    if (type !== 'expense' && type !== 'income') continue;
    const day = transactionDay(transaction.date);
    const gross = Math.abs(Number(transaction.amount));
    if (day < first || day >= next || !Number.isFinite(gross) || gross === 0) continue;

    result.cashFlow = cents(result.cashFlow + (type === 'income' ? gross : -gross));
    const amount = type === 'expense' ? netExpense(transaction, reimbursements.repaid)
      : reimbursements.payments.has(transaction.id) ? 0 : gross;
    if (amount === 0) continue;
    result[type] = cents(result[type] + amount);
    const categories = type === 'expense' ? result.expenseCategories : result.incomeCategories;
    const id = transaction.categoryId ?? 'uncategorized';
    categories.set(id, cents((categories.get(id) ?? 0) + amount));
  }
  return result;
}

export function dailySpendingAverage(transactions, period, date, today = new Date()) {
  const [start, next] = periodBounds(period, date).map(day => Date.parse(localDay(day)));
  const dayMs = 86400000;
  const currentDay = localDay(today);
  const end = Math.min(next, Date.parse(currentDay) + dayMs);
  if (end <= start) return null;
  const recorded = end < next ? transactions.filter(entry => transactionDay(entry.date) <= currentDay) : transactions;
  return cents(periodTotals(recorded, period, date).expense / ((end - start) / dayMs));
}

export function monthlySavingsPace(goal, today = new Date()) {
  const remaining = Math.round(((goal.targetAmount ?? goal.target_amount) - (goal.savedAmount ?? goal.saved_amount)) * 100);
  if (!goal.targetDate || goal.targetDate <= localDay(today) || remaining <= 0) return null;

  const due = new Date(goal.targetDate + 'T12:00:00');
  const months = (due.getFullYear() - today.getFullYear()) * 12 + due.getMonth() - today.getMonth();
  const installments = Math.max(1, months + Number(due.getDate() > today.getDate()));
  return Math.ceil(remaining / installments) / 100;
}

export function balanceTrendDomain(points) {
  const values = points.map(point => point.value);
  const low = Math.min(...values);
  const high = Math.max(...values);
  const center = (low + high) / 2;
  const span = Math.max((high - low) / (1 - 2 * 0.18), Math.abs(center) * 0.10, 100);
  return { low: center - span / 2, high: center + span / 2 };
}

export function filterValues(value) {
  return Array.isArray(value) ? value : value == null ? [] : [value];
}

export function filterActivity(transactions, { period, date, account, category, type, query = '' } = {}, categoryName = () => '') {
  const bounds = period ? periodBounds(period, date).map(localDay) : null;
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const accounts = filterValues(account), categories = filterValues(category), types = filterValues(type);
  return transactions.filter(entry => {
    if (entry.subType === 'opening') return false;
    if (accounts.length && !accounts.includes(entry.assetId) && !accounts.includes(entry.toAssetId)) return false;
    if (categories.length && !categories.includes(entry.categoryId ?? (entry.type === 'transfer' ? 'transfer' : 'uncategorized'))) return false;
    if (types.length && !types.includes(entry.type)) return false;
    const day = transactionDay(entry.date);
    if (bounds && (day < bounds[0] || day >= bounds[1])) return false;
    if (!terms.length) return true;
    const text = [entry.title, entry.note, entry.merchant, entry.assetName, entry.toAssetName, categoryName(entry), day,
      Math.abs(entry.amount), Math.abs(entry.amount).toFixed(2)].join(' ').toLowerCase();
    return terms.every(term => text.includes(term));
  });
}

export function dailyAllowances(month, budget, spending, today = new Date()) {
  if (budget <= 0 || localDay(month).slice(0, 7) !== localDay(today).slice(0, 7)) return [];
  const lastDate = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const days = lastDate - today.getDate() + 1;
  const remaining = Math.max(0, Math.round((budget - spending) * 100));
  const daily = Math.floor(remaining / days);
  return Array.from({ length: days }, (_, index) =>
    (daily + (index === days - 1 ? remaining % days : 0)) / 100);
}

export function assetAllocation(accounts, goals) {
  const balance = value => Number(value) || 0;
  const holdings = [];
  const debts = [];
  accounts.forEach((account, index) => {
    const value = balance(account.balance);
    const row = { id: account.id, label: account.name, amount: Math.abs(value), index };
    if (value > 0) holdings.push(row);
    if (value < 0) debts.push(row);
  });
  const savings = cents(goals.reduce((sum, goal) => sum + balance(goal.savedAmount ?? goal.saved_amount), 0));
  if (savings > 0) holdings.push({ id: 'savings-goals', label: 'Savings goals', amount: savings, index: accounts.length });
  if (savings < 0) debts.push({ id: 'savings-goals', label: 'Savings goal deficit', amount: -savings, index: accounts.length });
  const assets = cents(holdings.reduce((sum, row) => sum + row.amount, 0));
  const liabilities = cents(debts.reduce((sum, row) => sum + row.amount, 0));
  return { holdings, debts, assets, liabilities, savings };
}

export function categorySlices(rows) {
  const ranked = [...rows].sort((a, b) => b.amount - a.amount);
  const total = cents(ranked.reduce((sum, row) => sum + row.amount, 0));
  const tiny = ranked.filter((row, index) => index >= 6 || row.amount < total * 0.03);
  if (tiny.length < 2) return ranked;
  const members = new Set(tiny.map(row => row.id));
  return [...ranked.filter(row => !members.has(row.id)), {
    id: 'grouped-categories', label: 'Other categories', amount: cents(tiny.reduce((sum, row) => sum + row.amount, 0)),
    color: '#77716B', children: tiny,
  }];
}

export function assetOverview(accounts, goals, transactions, now = new Date()) {
  const { holdings, debts, assets, liabilities, savings } = assetAllocation(accounts, goals);
  const netWorth = cents(assets - liabilities);
  const changes = new Map();

  for (const transaction of transactions) {
    if (transaction.type !== 'income' && transaction.type !== 'expense' &&
        (transaction.subType === 'internal' || transaction.subType === 'goal_deposit')) continue;
    const day = transactionDay(transaction.date);
    const change = accountMovement(transaction, transaction.assetId);
    changes.set(day, cents((changes.get(day) ?? 0) + change));
  }

  const cursor = new Date(now);
  let closingBalance = netWorth;
  for (const [day, change] of changes) {
    if (day > localDay(now)) closingBalance = cents(closingBalance - change);
  }
  const trend = [];
  for (let offset = 0; offset < 30; offset++) {
    const day = localDay(cursor);
    trend.push({ day, value: closingBalance });
    closingBalance = cents(closingBalance - (changes.get(day) ?? 0));
    cursor.setDate(cursor.getDate() - 1);
  }
  trend.reverse();

  return { holdings, debts, assets, liabilities, netWorth, savings, trend };
}
