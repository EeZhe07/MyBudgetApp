import { applyLedgerChange, localDay } from './budget-store.js';
import { categoryAppearance } from './budget-icons.js';

export function nextRecurringDay(day, frequency, startDay) {
  const date = new Date(day + 'T12:00:00');
  if (frequency === 'weekly') {
    date.setDate(date.getDate() + 7);
  } else {
    date.setDate(1);
    date.setMonth(date.getMonth() + 1);
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    date.setDate(Math.min(Number(startDay.slice(-2)), lastDay));
  }
  return localDay(date);
}

export function recurringAccounts(rule, assets) {
  const from = assets.find(asset => asset.id === rule.assetId && !asset.archived);
  const to = rule.type === 'transfer' ? assets.find(asset => asset.id === rule.toAssetId && !asset.archived) : null;
  return from && (rule.type !== 'transfer' || to) ? { from, to } : null;
}

export function postDueRules({ recurringRules, assets, transactions, categories }, now = new Date()) {
  const existing = new Set(transactions.map(entry => entry.id));
  const posted = [];
  const rules = recurringRules.map(rule => {
    const accounts = recurringAccounts(rule, assets);
    if (!accounts) return rule;
    const { from, to } = accounts;
    let day = rule.nextDay;
    let date = new Date(day + 'T' + rule.time + ':00');
    while (date <= now) {
      const id = 'recurring:' + rule.id + ':' + day;
      if (!existing.has(id)) {
        const category = categories[rule.type]?.find(item => item.id === rule.categoryId);
        const entry = {
          id, type: rule.type, title: rule.title, date: date.toISOString(),
          amount: rule.type === 'expense' ? -rule.amount : rule.amount,
          assetId: from.id, assetName: from.name, toAssetId: to?.id, toAssetName: to?.name,
          categoryId: to ? 'transfer' : rule.categoryId, ...categoryAppearance(category, { type: rule.type }),
          subType: to ? 'internal' : undefined, recurringRuleId: rule.id,
        };
        posted.push(entry);
        assets = applyLedgerChange(assets, [], null, entry).assets;
      }
      day = nextRecurringDay(day, rule.frequency, rule.startDay);
      date = new Date(day + 'T' + rule.time + ':00');
    }
    return day === rule.nextDay ? rule : { ...rule, nextDay: day };
  });
  if (rules.every((rule, index) => rule === recurringRules[index])) return null;
  return { recurringRules: rules, assets, transactions: [...posted, ...transactions] };
}

export function upcomingReminders(rules, assets, now = new Date()) {
  const reminders = [];
  for (const rule of rules) {
    if (rule.reminderDays == null || !recurringAccounts(rule, assets)) continue;
    let day = rule.nextDay;
    for (let index = 0; index < 9; index++) {
      const date = new Date(day + 'T09:00:00');
      date.setDate(date.getDate() - rule.reminderDays);
      if (date > now) reminders.push({
        identifier: 'budget-recurring:' + rule.id + ':' + day + ':' + rule.reminderDays,
        date, body: rule.title + ' is due ' + new Date(day + 'T12:00:00').toLocaleDateString('en-MY', { dateStyle: 'medium' }) + '.',
      });
      day = nextRecurringDay(day, rule.frequency, rule.startDay);
    }
  }
  return reminders.sort((a, b) => a.date - b.date).slice(0, 48);
}
