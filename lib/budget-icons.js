import { iconCatalog } from '../assets/lucide-icons.js';

export const pastelSwatches = {
  sage: { label: 'Sage Green', fill: '#E1EEE2', ink: '#28533F' },
  peach: { label: 'Terracotta Peach', fill: '#F8E0D6', ink: '#874435' },
  lavender: { label: 'Lavender Mist', fill: '#EEE5F3', ink: '#634676' },
  ochre: { label: 'Warm Ochre', fill: '#F9EBC6', ink: '#725317' },
  slate: { label: 'Slate Blue', fill: '#DDEAF2', ink: '#31566D' },
  sand: { label: 'Soft Sand', fill: '#F0E9DD', ink: '#625549' },
};

export const accountIconKeys = [
  'bank', 'wallet', 'banknotes', 'smartphone', 'credit-card', 'piggy-bank', 'vault', 'trending-up',
];
export const categoryIconKeys = [
  'coffee', 'utensils', 'car', 'train', 'shopping-bag', 'receipt', 'gamepad', 'heart-pulse', 'book-open', 'gift',
];
export const goalIconKeys = [
  'car', 'house', 'plane', 'heart', 'laptop', 'shield-check', 'piggy-bank', 'book-open',
];
export const goalColors = [['Sage', 'sage'], ['Terracotta', 'peach'], ['Blue', 'slate'], ['Lilac', 'lavender']];

export const categoryPresets = {
  food: { name: 'Food', iconKey: 'coffee', colorKey: 'peach' },
  groceries: { name: 'Groceries', iconKey: 'shopping-basket', colorKey: 'sage' },
  transport: { name: 'Transport', iconKey: 'car', colorKey: 'slate' },
  shopping: { name: 'Shopping', iconKey: 'shopping-bag', colorKey: 'lavender' },
  entertainment: { name: 'Leisure', iconKey: 'gamepad', colorKey: 'lavender' },
  housing: { name: 'Housing', iconKey: 'house', colorKey: 'sage' },
  medical: { name: 'Medical', iconKey: 'heart-pulse', colorKey: 'peach' },
  transfer: { name: 'Transfer', iconKey: 'repeat', colorKey: 'lavender' },
  other: { name: 'Other', iconKey: 'circle-ellipsis', colorKey: 'sand' },
  salary: { name: 'Salary', iconKey: 'banknotes', colorKey: 'sage' },
  invest: { name: 'Investment', iconKey: 'trending-up', colorKey: 'ochre' },
  parttime: { name: 'Part-time', iconKey: 'briefcase', colorKey: 'slate' },
};

export const DEFAULT_CATEGORIES = {
  expense: ['food', 'groceries', 'transport', 'shopping', 'entertainment', 'housing', 'medical', 'transfer', 'other']
    .map(id => ({ id, ...categoryPresets[id] })),
  income: ['salary', 'invest', 'parttime', 'transfer', 'other'].map(id => ({ id, ...categoryPresets[id] })),
};

const accountPresets = [
  [/\b(?:maybank|mae)\b/, 'bank', 'ochre'],
  [/\bcimb\b/, 'bank', 'peach'],
  [/\bpublic bank\b/, 'bank', 'peach'],
  [/\b(?:tng|t n g|t g|touch n go|touch and go)\b/, 'smartphone', 'slate'],
  [/\bgrab ?pay\b/, 'smartphone', 'sage'],
  [/(?:^| )(?:cash|现金|現金)(?: |$)/, 'banknotes', 'sage'],
];

const legacyIcons = new Map([
  ['🏦', ['bank', 'ochre']], ['👛', ['wallet', 'sand']], ['💵', ['banknotes', 'sage']],
  ['💴', ['banknotes', 'sage']], ['💰', ['banknotes', 'sage']], ['📱', ['smartphone', 'slate']],
  ['💳', ['credit-card', 'lavender']], ['🐷', ['piggy-bank', 'peach']], ['🔒', ['vault', 'slate']],
  ['📈', ['trending-up', 'ochre']], ['📊', ['trending-up', 'ochre']], ['☕', ['coffee', 'peach']],
  ['🍔', ['utensils', 'peach']], ['🍕', ['utensils', 'peach']], ['🍽', ['utensils', 'peach']],
  ['🚗', ['car', 'slate']], ['🚕', ['car', 'slate']], ['🚆', ['train', 'slate']], ['🛍', ['shopping-bag', 'lavender']],
  ['🛒', ['shopping-basket', 'sage']], ['🧾', ['receipt', 'sand']], ['🎮', ['gamepad', 'lavender']],
  ['❤', ['heart-pulse', 'peach']], ['💊', ['heart-pulse', 'peach']],
  ['📚', ['book-open', 'slate']], ['📖', ['book-open', 'slate']], ['🎁', ['gift', 'lavender']],
  ['🏠', ['house', 'sage']], ['✈', ['plane', 'slate']], ['⛽', ['fuel', 'ochre']],
  ['⚡', ['briefcase', 'slate']], ['💼', ['briefcase', 'slate']], ['↔', ['repeat', 'lavender']],
  ['🎯', ['target', 'sage']], ['💸', ['circle-ellipsis', 'sand']],
]);

function namedAccountPreset(name) {
  const normalized = (name ?? '').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  const preset = accountPresets.find(([pattern]) => pattern.test(normalized));
  return preset && { iconKey: preset[1], colorKey: preset[2] };
}

function legacyAppearance(symbol) {
  const pair = typeof symbol === 'string' && legacyIcons.get(symbol.replace(/\uFE0F/g, ''));
  return pair ? { iconKey: pair[0], colorKey: pair[1] } : undefined;
}

const legacyGoalColors = new Map([
  ['#E1EFE5', 'sage'], ['#F7E1D6', 'peach'], ['#E1EDF8', 'slate'], ['#EDE4F4', 'lavender'],
]);

export function goalAppearance(goal) {
  const legacyIcon = goal.icon === '💍' ? 'heart' : goal.icon === '💻' ? 'laptop' : legacyAppearance(goal.icon)?.iconKey;
  return {
    iconKey: isIconKey(goal.iconKey) ? goal.iconKey : legacyIcon ?? 'piggy-bank',
    colorKey: isColorKey(goal.colorKey) ? goal.colorKey : legacyGoalColors.get(goal.color) ?? 'sage',
  };
}

export function isIconKey(key) {
  return typeof key === 'string' && Object.hasOwn(iconCatalog, key);
}

export function isColorKey(key) {
  return typeof key === 'string' && Object.hasOwn(pastelSwatches, key);
}

export function suggestAccountAppearance(name, accountType = 'asset') {
  return namedAccountPreset(name) ?? (accountType === 'liability'
    ? { iconKey: 'credit-card', colorKey: 'lavender' }
    : { iconKey: 'wallet', colorKey: 'sand' });
}

export function accountAppearance(account) {
  const fallback = namedAccountPreset(account.name) ?? legacyAppearance(account.icon) ?? suggestAccountAppearance('', account.accountType);
  return {
    iconKey: isIconKey(account.iconKey) ? account.iconKey : fallback.iconKey,
    colorKey: isColorKey(account.colorKey) ? account.colorKey : fallback.colorKey,
  };
}

export function categoryAppearance(category, entry) {
  const id = entry?.categoryId ?? category?.id ?? (entry?.type === 'transfer' ? 'transfer' : undefined);
  const preset = entry?.subType === 'goal_deposit' ? { iconKey: 'target', colorKey: 'sage' }
    : Object.hasOwn(categoryPresets, id) ? categoryPresets[id] : undefined;
  const fallback = preset ?? legacyAppearance(entry?.icon ?? category?.icon) ?? categoryPresets.other;
  const iconKey = entry?.iconKey ?? category?.iconKey;
  const colorKey = entry?.colorKey ?? category?.colorKey;
  return {
    iconKey: isIconKey(iconKey) ? iconKey : fallback.iconKey,
    colorKey: isColorKey(colorKey) ? colorKey : fallback.colorKey,
  };
}
