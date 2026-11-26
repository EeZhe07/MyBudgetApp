import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { applyLedgerChange, localDay } from '../lib/budget-store.js';

const [directory = '.expo/redesign-review/fixtures', day = localDay(new Date())] = process.argv.slice(2);
const date = new Date(day + 'T12:00:00');
if (localDay(date) !== day) throw new Error('Use a date in YYYY-MM-DD format.');
const month = day.slice(0, 7);
const openingDate = month + '-01';

const categories = {
  expense: [{ id: 'food', name: 'Food' }, { id: 'transport', name: 'Transport' }, { id: 'groceries', name: 'Groceries' }],
  income: [{ id: 'salary', name: 'Salary' }],
};
const empty = { assets: [], transactions: [], goals: [], monthlyBudgets: {}, categories, lastAsset: null };
const makeAccount = (id, name, openingAmount) => ({ id, name, openingAmount, openingDate, balance: openingAmount });
const makeOpening = asset => ({ id: 'opening-' + asset.id, title: 'Opening balance', type: 'transfer', subType: 'opening',
  date: openingDate, assetId: asset.id, assetName: asset.name, amount: asset.openingAmount });
const wallet = makeAccount(1, 'Wallet', 1);
const largeBalance = makeAccount(9, 'Travel wallet 旅行與日常開支備用帳戶', -12345678.90);
const sampleAccounts = [wallet, makeAccount(2, 'Touch ’n Go', 350), makeAccount(3, 'Cash', 200)];
const entries = [
  { id: 22, title: 'Campus café', type: 'expense', categoryId: 'food', assetId: 2, assetName: 'Touch ’n Go', amount: -8.50 },
  ...Array.from({ length: 20 }, (_, index) => ({
    id: index + 1, title: index === 0 ? 'Campus groceries entry 21' : 'Campus groceries',
    type: 'expense', categoryId: 'groceries', assetId: 2, assetName: 'Touch ’n Go', amount: -12.15,
  })),
  { id: 23, title: 'Part-time pay', type: 'income', categoryId: 'salary', assetId: 3, assetName: 'Cash', amount: 100 },
  { id: 24, title: 'Transfer', type: 'transfer', subType: 'internal', assetId: 3, assetName: 'Cash', toAssetId: 2,
    toAssetName: 'Touch ’n Go', categoryId: 'transfer', amount: 50 },
  { id: 25, title: 'Deposit to Books', type: 'transfer', subType: 'goal_deposit', assetId: 3, assetName: 'Cash',
    goalId: 1, goalName: 'Books', categoryId: 'transfer', amount: 20 },
].map((entry, index) => ({ ...entry, date: new Date(date.getTime() - (entry.id === 1 ? 90 : index) * 60000).toISOString() }));
const pixel = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jftcAAAAASUVORK5CYII=';
const bookGoal = { id: 1, title: 'Books', targetAmount: 100, savedAmount: 0, icon: '📚', pinned: true };
const ledger = entries.reduce((state, entry) => applyLedgerChange(state.assets, state.goals, null, entry),
  { assets: sampleAccounts, goals: [bookGoal] });
const previewCategories = {
  ...categories,
  expense: [...categories.expense, { id: 'other', name: 'Other' }],
};
const previewAccounts = [
  { ...wallet, icon: '👛' },
  { ...sampleAccounts[1], icon: '🪙' },
  { ...sampleAccounts[2], icon: '💵' },
  { ...makeAccount(4, 'Rainy day savings', 850), icon: '🌱' },
  { ...makeAccount(5, 'Credit card', -65), icon: '💳' },
  { ...makeAccount(6, 'Travel wallet', 0), icon: '🧳' },
];
const previewEntries = entries.map((entry, index) => {
  if (entry.id >= 22) return entry;
  const dateLabel = month + '-' + String(Math.max(1, date.getDate() - (index % 14) - 1)).padStart(2, '0');
  return { ...entry, date: new Date(dateLabel + 'T12:00:00').toISOString() };
});
const previewLedger = previewEntries.reduce((state, entry) => applyLedgerChange(state.assets, state.goals, null, entry),
  { assets: previewAccounts, goals: [bookGoal, { id: 2, title: 'Penang weekend', targetAmount: 350, savedAmount: 75, icon: '🚆' }] });

await mkdir(directory, { recursive: true });
const write = (name, data, version = 2) => writeFile(join(directory, name + '.json'), JSON.stringify({
  format: 'MyBudgetApp', version, exportedAt: date.toISOString(), data,
}, null, 2));

await Promise.all([
  write('fresh', empty),
  write('last-account-deleted', { ...empty, monthlyBudgets: { [month]: 600 } }),
  write('wallet-rm1', { ...empty, assets: [wallet], transactions: [makeOpening(wallet)], lastAsset: 1 }),
  write('large-text', { ...empty, assets: [largeBalance], transactions: [makeOpening(largeBalance)], lastAsset: 9 }),
  write('populated-month', { ...empty, ...ledger, monthlyBudgets: { [month]: 600 }, lastAsset: 2,
    transactions: [...entries, ...sampleAccounts.map(makeOpening)] }),
  write('redesign-preview', { ...empty, ...previewLedger, categories: previewCategories, monthlyBudgets: { [month]: 600 }, lastAsset: 2,
    transactions: [...previewEntries, ...previewAccounts.map(makeOpening)] }),
  write('legacy-v1', { assets: [{ id: 1, name: '现金', balance: 100, icon: '💵' }], transactions: [], categories,
    goals: [{ id: 'legacy-books', title: 'Books 書', target_amount: 100, saved_amount: 10, backgroundImage: pixel }],
    budget: 600, lastAsset: 1 }, 1),
]);
