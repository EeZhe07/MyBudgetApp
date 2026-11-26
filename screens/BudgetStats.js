import React from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from './PocketText';
import BreakdownDonut from './BreakdownDonut';
import JournalPaper from './JournalPaper';
import { categorySlices, dailySpendingAverage, periodBounds, periodTotals } from '../lib/budget-insights';
import { ScreenTitle, PocketIcon, categoryLabel, money, pocket, pocketLayout } from './budgetUi';

const ranges = [['weekly', 'Week'], ['monthly', 'Month'], ['yearly', 'Year']];
const activityTypes = [['expense', 'Expenses'], ['income', 'Income']];
const chartColors = {
  expense: ['#DD957C', '#E9BE73', '#B79BC0', '#80ADA9', '#A9BA89', '#C78099', '#A8ABBC'],
  income: ['#75AD99', '#8DAFC4', '#C2B381', '#A69EC2', '#D8A08D', '#88BAAF', '#ABB5AF'],
};

function Segments({ options, selected, onSelect }) {
  return (
    <View style={styles.segments}>
      {options.map(([id, label]) => {
        const active = id === selected;
        return (
          <TouchableOpacity key={id} accessibilityRole="button" accessibilityState={{ selected: active }}
            onPress={() => onSelect(id)} style={[styles.segment, active && styles.activeSegment]}>
            <Text style={[styles.segmentText, active && styles.activeText]}>{label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export function periodLabel(period, date) {
  if (period === 'yearly') return String(date.getFullYear());
  if (period === 'monthly') return date.toLocaleDateString('en-MY', { month: 'long', year: 'numeric' });
  const [first, next] = periodBounds(period, date);
  next.setDate(next.getDate() - 1);
  const format = day => day.toLocaleDateString('en-MY', { day: 'numeric', month: 'short' });
  return `${format(first)} – ${format(next)}`;
}

export default function BudgetStats({
  transactions, categories, period, date, onPeriod, onDate, onPickPeriod, onCategory,
}) {
  const totals = periodTotals(transactions, period, date);
  const average = dailySpendingAverage(transactions, period, date);
  function movePeriod(direction) {
    const [next] = periodBounds(period, date);
    if (period === 'weekly') next.setDate(next.getDate() + 7 * direction);
    else if (period === 'monthly') next.setMonth(next.getMonth() + direction);
    else next.setFullYear(next.getFullYear() + direction);
    onDate(next);
  }

  return (
    <ScrollView style={pocketLayout.screen} contentContainerStyle={[pocketLayout.content, pocketLayout.navClearance]}
      showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <ScreenTitle>Insights</ScreenTitle>
      <View style={styles.controls}>
        <Segments options={ranges} selected={period} onSelect={onPeriod} />
        <View style={[pocketLayout.card, styles.period]}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Previous period" style={styles.iconButton} onPress={() => movePeriod(-1)}>
            <View style={styles.backArrow}><PocketIcon name="chevron" size={18} color={pocket.action} /></View>
          </TouchableOpacity>
          {period === 'yearly' ? <Text style={styles.periodLabel}>{periodLabel(period, date)}</Text> : (
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Choose ${period === 'weekly' ? 'week' : 'month'}`} onPress={onPickPeriod} style={styles.periodPicker}>
              <PocketIcon name="calendar" size={17} color={pocket.action} /><Text style={styles.periodLabel}>{periodLabel(period, date)}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Next period" style={styles.iconButton} onPress={() => movePeriod(1)}>
            <PocketIcon name="chevron" size={18} color={pocket.action} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.summary}>
        <JournalPaper from="#E2EEE3" to="#FFF0D9" />
        <View style={styles.metrics}>
          {activityTypes.map(([type, label]) => (
            <View key={type} style={styles.grow}>
              <Text style={styles.caption}>{label}</Text>
              <Text style={[pocketLayout.amount, styles.metric]}>{money(totals[type])}</Text>
            </View>
          ))}
          <View style={styles.grow}>
            <Text style={styles.caption}>Net cash flow</Text>
            <Text style={[pocketLayout.amount, styles.metric]}>{money(totals.cashFlow)}</Text>
          </View>
        </View>
        {average != null && (
          <Text style={[styles.average, pocketLayout.figures]}>Daily spending avg · {money(average)}</Text>
        )}
      </View>
      {activityTypes.map(([type, label]) => {
        const categoryTotals = type === 'expense' ? totals.expenseCategories : totals.incomeCategories;
        const rows = categorySlices([...categoryTotals].map(([id, amount]) => ({
          id, amount,
          label: categoryLabel(categories[type].find(item => item.id === id), id) || 'Uncategorized',
        }))).map((row, index) => ({ ...row, color: chartColors[type][index % chartColors[type].length] }));
        return (
          <BreakdownDonut key={type + period + periodLabel(period, date)} title={label} total={totals[type]} rows={rows}
            empty={`No ${label.toLowerCase()} for this period.`} onOpen={row => onCategory(type, row.id)} />
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  grow: { flex: 1 },
  controls: { gap: 7 },
  segments: { flexDirection: 'row', padding: 4, gap: 4, backgroundColor: '#F1E6DB', borderRadius: 15 },
  segment: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 11, paddingHorizontal: 5 },
  activeSegment: { backgroundColor: pocket.white },
  segmentText: { color: pocket.muted, fontWeight: '700', fontSize: 13, textAlign: 'center' },
  activeText: { color: pocket.action },
  period: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 5, borderRadius: 14 },
  periodPicker: { minHeight: 45, flexDirection: 'row', alignItems: 'center', gap: 7, flexShrink: 1 },
  periodLabel: { color: pocket.ink, fontSize: 14, fontWeight: '800', flexShrink: 1 },
  iconButton: { minHeight: 48, minWidth: 44, alignItems: 'center', justifyContent: 'center' },
  backArrow: { transform: [{ rotate: '180deg' }] },
  summary: { gap: 10, backgroundColor: pocket.lavender, borderRadius: 20, borderBottomRightRadius: 7, padding: 16, overflow: 'hidden' },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  average: { alignSelf: 'flex-start', color: pocket.action, fontSize: 12, fontWeight: '600',
    backgroundColor: pocket.white, borderRadius: 12, overflow: 'hidden', paddingVertical: 5, paddingHorizontal: 9 },
  metric: { fontSize: 15, marginTop: 3 },
  caption: { color: pocket.muted, fontSize: 12, fontWeight: '600' },
});
