import React from 'react';
import { Image, ScrollView, StyleSheet, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import JournalPaper from './JournalPaper';
import { Text } from './PocketText';
import { cents, localDay } from '../lib/budget-store';
import { goalAppearance } from '../lib/budget-icons';
import { EmptyState, IdentityBadge, LedgerList, MoneyText, PocketIcon, PrimaryButton, ScreenTitle, SectionHeader, TextAction, money, pocket, pocketLayout } from './budgetUi';

const tabs = [
  ['home', 'Home', 'home'], ['assets', 'Assets', 'wallet'],
  ['stats', 'Insights', 'chart'], ['settings', 'Settings', 'settings'],
];

export function BudgetNavigation({ page, onNavigate, inset = 0 }) {
  const parent = { asset_detail: 'assets', goal_detail: 'home', goals: 'home', budget: 'home', activity: 'home', recurring: 'settings' }[page] ?? page;
  return (
    <View style={[styles.navShell, { marginBottom: inset + 10 }]}>
    <View style={styles.nav}>
      <JournalPaper from="#E9E1D8" to="#FFFEFB" />
      {tabs.map(([id, label, icon]) => {
        const active = id === parent;
        return (
          <TouchableOpacity key={id} accessibilityRole="tab" accessibilityState={{ selected: active }}
            onPress={() => onNavigate(id)} style={styles.tab}>
            <View style={[styles.tabIcon, active && styles.activeTab]}>
              <PocketIcon name={icon} size={20} color={active ? pocket.action : pocket.muted} />
            </View>
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}
              style={[styles.tabLabel, active && styles.activeLabel]}>{label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
    </View>
  );
}

export default function BudgetHome({
  month, spending, income, cashFlow, budget, allowance, drafts, groups, categories, hasAccounts,
  onMonth, onBudget, onActivity, onInbox, onRecord, onTransaction, recordActions,
  onGoals, onAddAccount, onRestore,
}) {
  const current = localDay(month).slice(0, 7) === localDay(new Date()).slice(0, 7);
  const monthLabel = month.toLocaleDateString('en-MY', { month: 'long', ...(current ? {} : { year: 'numeric' }) });
  const hasBudget = budget > 0;
  const { width, fontScale } = useWindowDimensions();
  const compact = width < 365 || fontScale > 1.2;
  const remaining = cents(budget - spending);
  const over = hasBudget && remaining < 0;
  const used = hasBudget ? spending / budget : 0;
  const progress = Math.min(used * 100, 100);
  const usedLabel = used.toLocaleString('en-MY', { style: 'percent', maximumFractionDigits: 1 }) + ' used';

  return (
    <View style={pocketLayout.screen}>
      <ScrollView contentContainerStyle={pocketLayout.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.grow}>
            <Text style={styles.dateline}>{new Date().toLocaleDateString('en-MY', { weekday: 'long', day: 'numeric', month: 'short' })}</Text>
            <ScreenTitle>My ledger</ScreenTitle>
          </View>
          <View style={styles.goalShortcut}><TextAction label="Savings goals" icon="goal" onPress={onGoals} /></View>
        </View>
        <View style={styles.summary}>
          <JournalPaper from="#F4CCAB" to="#FFE9BE" grid />
          <View style={styles.coverTop}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={'Choose month, ' + monthLabel} onPress={onMonth} style={styles.month}>
            <PocketIcon name="calendar" size={17} color={pocket.action} />
            <Text style={styles.rowTitle}>{monthLabel}</Text>
            <PocketIcon name="down" size={14} color={pocket.muted} />
          </TouchableOpacity>
          <Image accessible={false} source={require('../assets/ledger-cat.png')} resizeMode="contain"
            style={[styles.cat, compact && styles.smallCat]} />
          </View>
          <TouchableOpacity accessibilityRole="button" style={styles.summaryLink} onPress={onBudget}>
            <Text style={styles.meta}>{current ? 'Spent this month' : 'Spent in ' + monthLabel}</Text>
            <MoneyText value={spending} style={styles.hero} />
            <View style={styles.monthMetrics}>
              <View style={styles.metric}>
                <Text style={styles.metricLabel}>Monthly income</Text>
                <MoneyText value={income} style={styles.income} />
              </View>
              <View style={styles.metric}>
                <Text style={styles.metricLabel}>Net cash flow</Text>
                <MoneyText value={cashFlow} style={cashFlow < 0 ? styles.over : styles.income} />
                {cashFlow !== cents(income - spending) && <Text style={styles.metricLabel}>By payment date</Text>}
              </View>
            </View>
            {hasBudget ? (
              <View style={styles.budgetProgress}>
                <View style={styles.header}>
                  <Text style={[styles.link, pocketLayout.figures, over && styles.over]}>
                    {money(Math.abs(remaining))} {over ? 'over budget' : 'left'}
                  </Text>
                  <View style={styles.budgetStatus}>
                    <Text style={[styles.meta, pocketLayout.figures]}>{usedLabel}</Text>
                    <PocketIcon name="chevron" size={15} color={pocket.action} />
                  </View>
                </View>
                <View style={styles.track} accessibilityRole="progressbar" accessibilityLabel="Monthly budget used"
                  accessibilityValue={{ min: 0, max: 100, now: Math.round(progress), text: usedLabel }}>
                  <View style={[styles.fill, { width: progress + '%' }, over && styles.overFill]} />
                </View>
                {allowance != null && <Text style={[styles.meta, pocketLayout.figures]}>{money(allowance)} / day safe to spend</Text>}
              </View>
            ) : (
              <View style={styles.budgetLink}>
                <Text style={styles.link}>Set monthly budget</Text>
                <PocketIcon name="chevron" size={15} color={pocket.action} />
              </View>
            )}
          </TouchableOpacity>
        </View>
        {!hasAccounts && (
          <View style={styles.section}>
            <PrimaryButton icon="plus" label="Add your first account" onPress={onAddAccount} />
            <TextAction label="Restore from backup" onPress={onRestore} />
          </View>
        )}

        {drafts > 0 && (
          <TouchableOpacity accessibilityRole="button" onPress={onInbox} style={styles.inbox}>
            <PocketIcon name="receipt" color={pocket.action} />
            <Text style={[styles.rowTitle, styles.grow]}>Review {drafts} Touch ’n Go {drafts === 1 ? 'payment' : 'payments'}</Text>
            <PocketIcon name="chevron" size={17} color={pocket.action} />
          </TouchableOpacity>
        )}

        <View style={styles.section}>
          <SectionHeader title="Recent records" action={<TextAction label="See all" onPress={onActivity} />} />
          {groups.length > 0
            ? <LedgerList groups={groups} categories={categories} onOpen={onTransaction} recordActions={recordActions} />
            : <EmptyState title="No transactions this month" />}
        </View>
      </ScrollView>
      {hasAccounts && <View style={styles.addRecord}><PrimaryButton icon="plus" label="Add record" onPress={onRecord} /></View>}
    </View>
  );
}

export function SavingsGoals({ goals, onBack, onGoal, onNewGoal, onPinGoal }) {
  return (
    <ScrollView style={pocketLayout.screen} contentContainerStyle={pocketLayout.content}>
      <TextAction icon="back" label="Home" onPress={onBack} />
      <SectionHeader title="Savings goals" action={<TextAction icon="plus" label="New goal" onPress={onNewGoal} />} />
      {goals.length === 0 && <EmptyState title="No savings goals yet" />}
      {[...goals].sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned))).map(goal => {
        const target = goal.targetAmount ?? goal.target_amount;
        const saved = goal.savedAmount ?? goal.saved_amount;
        const progress = target > 0 ? Math.max(0, Math.min(saved / target * 100, 100)) : 0;
        return (
          <TouchableOpacity key={goal.id} accessibilityRole="button" accessibilityHint="Long press to toggle pin"
            onPress={() => onGoal(goal)} onLongPress={() => onPinGoal(goal)} style={[pocketLayout.card, styles.goal]}>
            <View style={styles.goalHeader}>
              {goal.backgroundImage
                ? <Image accessible={false} source={{ uri: goal.backgroundImage }} style={styles.goalImage} resizeMode="cover" />
                : <IdentityBadge appearance={goalAppearance(goal)} />}
              <View style={styles.grow}>
                <Text style={styles.rowTitle}>{goal.title}</Text>
                <Text style={[styles.meta, pocketLayout.figures]}>{money(saved)} of {money(target)}</Text>
              </View>
              <PocketIcon name="chevron" size={16} color={pocket.action} />
            </View>
            {goal.pinned && <Text style={styles.meta}>Pinned</Text>}
            <Text style={[styles.meta, pocketLayout.figures]}>{saved >= target ? 'Goal reached' : money(target - saved) + ' remaining'}</Text>
            <View accessibilityRole="progressbar" accessibilityLabel="Saved" accessibilityValue={{ min: 0, max: 100, now: Math.round(progress) }} style={styles.track}>
              <View style={[styles.fill, { width: progress + '%' }]} />
            </View>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
  dateline: { color: pocket.muted, fontSize: 12, fontWeight: '600', marginBottom: 2 },
  goalShortcut: { backgroundColor: pocket.mint, borderRadius: 24, paddingHorizontal: 12 },
  coverTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingHorizontal: 8 },
  cat: { width: 111, height: 97, marginTop: 1, marginBottom: -5, transform: [{ rotate: '4deg' }] },
  smallCat: { width: 78, height: 76 },
  month: { flexShrink: 1, flexDirection: 'row', alignItems: 'center', minHeight: 48, gap: 7, paddingRight: 5 },
  summary: { padding: 8, backgroundColor: '#F7D8AF', borderColor: '#E9C5A6', borderWidth: 1, borderRadius: 27, overflow: 'hidden' },
  summaryLink: {
    gap: 8, paddingTop: 12, paddingHorizontal: 16, borderRadius: 20, borderColor: '#FFFAEB', borderWidth: 1,
    backgroundColor: '#FFF9ED', elevation: 2, shadowColor: '#6D4931', shadowOpacity: 0.15,
    shadowRadius: 7, shadowOffset: { width: 0, height: 2 },
  },
  monthMetrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 3 },
  metric: { flexGrow: 1, flexBasis: 120, backgroundColor: pocket.paper, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, gap: 2 },
  metricLabel: { color: pocket.muted, fontSize: 12, fontWeight: '600' },
  income: { color: pocket.income },
  budgetLink: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: StyleSheet.hairlineWidth, borderColor: pocket.line },
  budgetProgress: { gap: 8, paddingTop: 10, paddingBottom: 12, borderTopWidth: StyleSheet.hairlineWidth, borderColor: pocket.line },
  budgetStatus: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  link: { color: pocket.action, fontWeight: '800', fontSize: 14 },
  addRecord: { alignSelf: 'flex-end', maxWidth: '95%', paddingHorizontal: 16, paddingBottom: 8, paddingTop: 4 },
  hero: { fontSize: 41, letterSpacing: -1.5 },
  over: { color: pocket.danger },
  track: { height: 5, backgroundColor: pocket.line, borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: pocket.action },
  overFill: { backgroundColor: pocket.danger },
  inbox: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, padding: 12, backgroundColor: pocket.blush, borderRadius: 12 },
  section: { gap: 8 },
  grow: { flex: 1 },
  rowTitle: { fontSize: 16, color: pocket.ink, fontWeight: '600', flexShrink: 1 },
  meta: { fontSize: 14, color: pocket.muted },
  goal: { padding: 14, gap: 10 },
  goalHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  goalImage: { width: 52, height: 52, borderRadius: 8 },
  navShell: { marginHorizontal: 12, marginTop: 2, backgroundColor: pocket.white, borderRadius: 30, elevation: 4, shadowColor: '#685344', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  nav: { flexDirection: 'row', overflow: 'hidden', borderRadius: 30, borderWidth: 1, borderColor: '#FFFEFC', paddingVertical: 3, paddingHorizontal: 6 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 52, gap: 2 },
  tabIcon: { width: 48, height: 26, borderRadius: 999, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  activeTab: { backgroundColor: pocket.mint },
  tabLabel: { fontSize: 12, fontWeight: '600', color: pocket.muted, textAlign: 'center' },
  activeLabel: { color: pocket.action, fontWeight: '700' },
});
