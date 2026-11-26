import React, { useMemo, useState } from 'react';
import { FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text, TextInput } from './PocketText';
import { filterActivity, filterValues, periodTotals } from '../lib/budget-insights';
import { localDay, reimbursementTotals } from '../lib/budget-store';
import { FilterPicker } from './BudgetPickers';
import MonthCalendar from './MonthCalendar';
import { EmptyState, LedgerGroup, MoneyText, PageHeader, PocketIcon, TextAction, categoryLabel, groupTransactions, pocket, pocketLayout } from './budgetUi';
import { periodLabel } from './BudgetStats';

export default function BudgetActivity({ transactions, accounts, categories, filters, onChange, onMonth, onBack, onOpen, recordActions }) {
  const [picker, setPicker] = useState(null);
  const { query, period, date, account, category, type } = filters;
  const selectedAccounts = filterValues(account);
  const selectedCategories = filterValues(category);
  const selectedTypes = filterValues(type);
  const drilldown = filters.from !== 'home' && typeof type === 'string';
  const reimbursements = useMemo(() => reimbursementTotals(transactions), [transactions]);
  const categoryOptions = [
    { id: null, label: 'All categories' },
    ...[...new Map([...categories.expense, ...categories.income].map(item => [item.id, { id: item.id, label: categoryLabel(item) }])).values()],
    { id: 'transfer', label: 'Transfer' },
    { id: 'uncategorized', label: 'Uncategorized' },
  ].filter((item, index, list) => list.findIndex(option => option.id === item.id) === index);
  const accountOptions = [{ id: null, label: 'All accounts' }, ...accounts.map(item => ({ id: item.id, label: item.name }))];
  const groups = useMemo(() => groupTransactions(filterActivity(transactions, filters, entry =>
    categoryLabel(categories[entry.type]?.find(item => item.id === entry.categoryId), entry.categoryId))
    .filter(entry => !drilldown || type !== 'income' || !reimbursements.payments.has(entry.id))),
  [transactions, filters, categories, drilldown, type, reimbursements]);
  const today = localDay(new Date());
  const filtered = Boolean(query.trim() || selectedAccounts.length || selectedCategories.length || selectedTypes.length);
  const selected = period === 'monthly' && !query.trim() && filters.day !== 'all' ? filters.day : null;
  const shownGroups = selected ? groups.filter(([day]) => day === selected) : groups;
  const monthly = periodTotals(transactions, 'monthly', date, reimbursements);
  const dayTotals = new Map(groups.map(([day, entries]) => [day, periodTotals(entries, 'monthly', date, reimbursements)]));
  const title = drilldown ? (categoryOptions.find(item => item.id === category)?.label || 'Records') : 'Records';
  const toggle = (field, id) => {
    const values = filterValues(filters[field]);
    onChange({ [field]: id == null ? [] : values.includes(id) ? values.filter(value => value !== id) : [...values, id], day: 'all' });
  };
  const filterLabel = (options, values) => values.length === 1
    ? options.find(item => item.id === values[0])?.label ?? options[0].label
    : values.length > 1 ? options[0].label.replace('All ', '') + ' (' + values.length + ')' : options[0].label;

  return (
    <View style={pocketLayout.screen}>
      <FlatList data={shownGroups} keyExtractor={([day]) => day}
        contentContainerStyle={pocketLayout.content} keyboardShouldPersistTaps="handled"
        ListHeaderComponent={(
          <View style={styles.controls}>
            <TextAction label={{ stats: 'Insights', budget: 'Budget' }[filters.from] ?? 'Home'} icon="back" onPress={onBack} />
            <PageHeader title={title} icon="receipt" />
            <View style={[pocketLayout.card, styles.search]}>
              <PocketIcon name="search" size={18} color={pocket.muted} />
              <TextInput accessibilityLabel="Search transactions" placeholder="Search merchant or note" placeholderTextColor={pocket.muted}
                style={styles.input} value={query} onChangeText={value => onChange({ query: value })} returnKeyType="search" />
            </View>
            <View style={styles.filters}>
              {drilldown ? <Text style={styles.period}>{periodLabel(period, date)}</Text> : (
                <TextAction icon="calendar" label={period ? periodLabel(period, date) : 'All dates'} onPress={() => setPicker('period')} />
              )}
              {!drilldown && <TextAction label="Today" onPress={() => onChange({ date: new Date(), day: today, period: 'monthly', query: '' })} />}
              {filtered && (!drilldown || selectedAccounts.length > 0 || query.trim()) ? (
                <TextAction label="Clear filters" onPress={() => onChange({ query: '', account: [], category: drilldown ? category : [], type: drilldown ? type : [], day: 'all' })} />
              ) : null}
            </View>
            <View style={styles.chips}>
              <FilterChip label={filterLabel(accountOptions, selectedAccounts)} active={selectedAccounts.length > 0}
                icon="down" onPress={() => setPicker('account')} />
              {!drilldown && (
                <FilterChip label={filterLabel(categoryOptions, selectedCategories)} active={selectedCategories.length > 0}
                  icon="down" onPress={() => setPicker('category')} />
              )}
            </View>
            {!drilldown && (
              <View style={styles.chips}>
                {[['expense', 'Expense'], ['income', 'Income'], ['transfer', 'Transfer']].map(([id, label]) =>
                  <FilterChip key={id} label={label} active={selectedTypes.includes(id)} onPress={() => toggle('type', id)} />)}
              </View>
            )}
            {period === 'monthly' && !(drilldown && filters.from === 'stats') && (
              <>
                <View style={[pocketLayout.card, styles.totals]}>
                  <View style={styles.metric}><Text style={styles.period}>Month expenses</Text><MoneyText value={monthly.expense} style={styles.out} /></View>
                  <View style={styles.metric}><Text style={styles.period}>Month income</Text><MoneyText value={monthly.income} style={styles.in} /></View>
                </View>
                {!query.trim() && (
                  <>
                    <MonthCalendar month={date} selected={selected} onSelect={day => onChange({ day })} valuesForDay={day => {
                      const total = dayTotals.get(day);
                      return [
                        ...(total?.expense > 0 ? [{ label: 'Spent', sign: '−', amount: total.expense }] : []),
                        ...(total?.income > 0 ? [{ label: 'Received', sign: '+', amount: total.income }] : []),
                      ];
                    }} />
                    {selected && <View style={styles.selectedDay}>
                      <Text style={styles.period}>{new Date(selected + 'T12:00:00').toLocaleDateString('en-MY', { weekday: 'short', day: 'numeric', month: 'short' })}</Text>
                      <TextAction label="Show all days" onPress={() => onChange({ day: 'all' })} />
                    </View>}
                  </>
                )}
              </>
            )}
          </View>
        )}
        ListEmptyComponent={<EmptyState title={filtered ? 'No matching transactions' : selected ? 'No transactions on this day' : period ? 'No transactions for this period' : 'No transactions yet'}
          description={filtered ? 'Try changing the search or filters.' : undefined} />}
        renderItem={({ item: [day, entries] }) => (
          <View style={[pocketLayout.card, styles.ledger]}>
            <LedgerGroup entries={entries} day={day} categories={categories} accountId={selectedAccounts.length === 1 ? selectedAccounts[0] : undefined}
              onOpen={onOpen} recordActions={recordActions} showTimes />
          </View>
        )}
      />
      {picker && <FilterPicker title={picker === 'period' ? 'Record dates' : picker === 'account' ? 'Filter by account' : 'Filter by category'}
        options={picker === 'period' ? [{ id: 'all', label: 'All dates' }, { id: 'monthly', label: 'Choose a month' }]
          : picker === 'account' ? accountOptions : categoryOptions}
        multiple={picker !== 'period'}
        selected={picker === 'period' ? period ?? 'all' : filterValues(filters[picker])} onClose={() => setPicker(null)}
        onSelect={id => {
          if (picker !== 'period') { toggle(picker, id); return; }
          setPicker(null);
          if (id === 'monthly') onMonth();
          else onChange({ period: null, day: 'all' });
        }} />}
    </View>
  );
}

function FilterChip({ label, active, icon, onPress }) {
  return (
    <TouchableOpacity accessibilityRole="button" accessibilityState={{ selected: active }}
      style={[styles.chip, active && styles.chipActive]} onPress={onPress}>
      <Text style={styles.chipLabel}>{label}</Text>
      {icon && <PocketIcon name={icon} size={14} color={pocket.action} />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  controls: { gap: 8 },
  search: { minHeight: 48, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: { flex: 1, minHeight: 48, color: pocket.ink, fontSize: 16 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 16 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 44, paddingHorizontal: 13, borderRadius: 22, borderWidth: 1, borderColor: pocket.line, backgroundColor: pocket.white, flexDirection: 'row', alignItems: 'center', gap: 4 },
  chipActive: { backgroundColor: pocket.mint, borderColor: pocket.action },
  chipLabel: { fontSize: 14, fontWeight: '600', color: pocket.action, flexShrink: 1 },
  period: { fontSize: 14, color: pocket.muted },
  ledger: { paddingHorizontal: 12, paddingBottom: 2 },
  totals: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, padding: 12, backgroundColor: pocket.peach },
  metric: { flexGrow: 1, gap: 3 },
  out: { fontSize: 17, color: pocket.danger },
  in: { fontSize: 17, color: pocket.green },
  selectedDay: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
});
