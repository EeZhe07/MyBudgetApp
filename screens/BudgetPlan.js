import React, { useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { localDay } from '../lib/budget-store';
import { periodTotals } from '../lib/budget-insights';
import MonthCalendar from './MonthCalendar';
import { Text } from './PocketText';
import { CategoryBadge, EmptyState, LedgerGroup, MoneyText, PageHeader, PocketIcon, SectionHeader, TextAction,
  categoryLabel, groupTransactions, money, pocket, pocketLayout } from './budgetUi';

export default function BudgetPlan({ month, budget, allowance, transactions, categories, reimbursements, onMonth, onEdit,
  onBack, onCategory, onOpen, recordActions }) {
  const [day, setDay] = useState(null);
  const today = localDay(new Date());
  const monthKey = localDay(month).slice(0, 7);
  const selected = day?.startsWith(monthKey) ? day : today.startsWith(monthKey) ? today : monthKey + '-01';
  const expenses = transactions.filter(item => item.type === 'expense');
  const groups = new Map(groupTransactions(expenses));
  const totals = periodTotals(expenses, 'monthly', month, reimbursements);
  const remaining = budget - totals.expense;
  const over = remaining < 0 && budget > 0;
  const spentByDay = new Map([...groups].map(([key, entries]) => [key, periodTotals(entries, 'monthly', month, reimbursements).expense]));
  const planned = key => key >= today ? allowance[Number(key.slice(-2)) - Number(today.slice(-2))] : undefined;

  return (
    <ScrollView style={pocketLayout.screen} contentContainerStyle={pocketLayout.content}>
      <TextAction icon="back" label="Home" onPress={onBack} />
      <PageHeader title="Budget" icon="calendar" action={<TextAction icon="calendar"
        label={month.toLocaleDateString('en-MY', { month: 'long', year: 'numeric' })} onPress={onMonth} />} />
      <View style={[pocketLayout.card, styles.summary]}>
        <Text style={styles.caption}>{budget <= 0 ? 'Spent this month' : over ? 'Over budget by' : 'Left this month'}</Text>
        <MoneyText value={budget > 0 ? Math.abs(remaining) : totals.expense} style={[styles.amount, over && styles.expense]} />
        {budget > 0 && <Text style={[styles.caption, pocketLayout.figures]}>{money(totals.expense)} of {money(budget)} spent</Text>}
        <TextAction icon="edit" label={budget > 0 ? 'Edit monthly budget' : 'Set monthly budget'} onPress={onEdit} />
      </View>
      <SectionHeader title="Daily budget" />
      <Text style={styles.caption}>{allowance.length ? '− Actual spending   ~ Suggested daily allowance' : '− Actual spending'}</Text>
      <MonthCalendar month={month} selected={selected} onSelect={setDay} valuesForDay={key => {
        const spent = spentByDay.get(key);
        const suggestion = planned(key);
        return [
          ...(spent != null ? [{ label: 'Spent', sign: '−', amount: spent }] : []),
          ...(suggestion != null ? [{ label: 'Suggested allowance', sign: '~', amount: suggestion }] : []),
        ];
      }} />
      <View style={[pocketLayout.card, styles.panel]}>
        {planned(selected) != null && <Text style={[styles.caption, pocketLayout.figures]}>{money(planned(selected))} suggested for this day</Text>}
        <LedgerGroup day={selected} entries={groups.get(selected) ?? []}
          categories={categories} onOpen={onOpen} recordActions={recordActions} />
        {!groups.has(selected) && <Text style={styles.caption}>No expenses on this day.</Text>}
      </View>
      <SectionHeader title="Spending by category" />
      {totals.expenseCategories.size === 0 && <EmptyState title="No spending this month" />}
      {[...totals.expenseCategories].sort((a, b) => b[1] - a[1]).map(([id, value]) => {
        const category = categories.expense.find(item => item.id === id);
        return (
          <TouchableOpacity key={id} accessibilityRole="button" style={[pocketLayout.card, styles.category]} onPress={() => onCategory(id)}>
            <CategoryBadge category={category ?? { id }} size={34} />
            <Text style={styles.name}>{categoryLabel(category, id)}</Text>
            <MoneyText value={value} style={styles.categoryAmount} />
            <PocketIcon name="chevron" size={15} color={pocket.muted} />
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  summary: { padding: 14, backgroundColor: pocket.peach, gap: 3 },
  panel: { paddingHorizontal: 12, paddingVertical: 8 },
  caption: { color: pocket.muted, fontSize: 13 },
  amount: { fontSize: 34 },
  expense: { color: pocket.danger },
  category: { flexDirection: 'row', minHeight: 56, padding: 10, gap: 8, alignItems: 'center' },
  name: { flex: 1, color: pocket.ink, fontWeight: '700' },
  categoryAmount: { fontSize: 15, flexShrink: 1 },
});
