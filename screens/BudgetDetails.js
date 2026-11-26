import React from 'react';
import { Image, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from './PocketText';
import { accountHistory, localDay, transactionDay } from '../lib/budget-store';
import { accountAppearance, goalAppearance } from '../lib/budget-icons';
import { monthlySavingsPace } from '../lib/budget-insights';
import BalanceTrend from './BalanceTrend';
import {
  CategoryBadge, EmptyState, LedgerList, MoneyText, PageHeader, PocketIcon, PrimaryButton,
  SectionHeader, TextAction, categoryLabel, groupTransactions, money, pocket, pocketLayout,
  transactionAmount, transactionLabel,
} from './budgetUi';

function MenuButton({ onPress, label }) {
  return (
    <TouchableOpacity accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.menu}>
      <PocketIcon name="dots" />
    </TouchableOpacity>
  );
}

export function AccountDetail({ account, transactions, categories, onBack, onMenu, onRecord, onAdjust, onReceipt, recordActions }) {
  const entries = transactions.filter(item => item.subType !== 'opening' &&
    (item.assetId === account.id || (item.subType === 'internal' && item.toAssetId === account.id)));
  const trend = accountHistory(account, transactions);
  const hasTrend = trend.some(point => point.value !== trend[0].value);

  return (
    <ScrollView style={pocketLayout.screen} contentContainerStyle={pocketLayout.content}>
      <TextAction label="Accounts" icon="back" onPress={onBack} />
      <PageHeader title={account.name} appearance={accountAppearance(account)} action={<MenuButton label="Manage account" onPress={onMenu} />} />
      <View style={[pocketLayout.card, styles.panel]}>
        <Text style={styles.meta}>{account.openingAmount === undefined ? 'Recorded balance' : 'Current balance'}</Text>
        <MoneyText value={account.balance} style={styles.hero} />
        {account.openingAmount !== undefined && <Text style={[styles.meta, pocketLayout.figures]}>Opening balance {money(account.openingAmount)}</Text>}
        {account.accountType === 'liability' && <Text style={styles.meta}>Liability account</Text>}
        {account.archived && <Text style={styles.meta}>Archived account</Text>}
        {!account.archived && <TextAction icon="edit" label="Reconcile / Adjust Balance" onPress={onAdjust} />}
      </View>
      {!account.archived && <PrimaryButton icon="plus" label="Record transaction" onPress={onRecord} />}
      <View style={styles.section}>
        <SectionHeader title="Activity" />
        {entries.length
          ? <LedgerList groups={groupTransactions(entries)} categories={categories} accountId={account.id} onOpen={onReceipt} recordActions={recordActions} />
          : <EmptyState title="No transactions yet" description="Your first entry will appear here." />}
      </View>
      {entries.length > 0 && hasTrend && (
        <View style={[pocketLayout.card, styles.panel]}>
          <SectionHeader title="Balance trend" />
          <BalanceTrend points={trend} label="Recorded balance" />
        </View>
      )}
    </ScrollView>
  );
}

export function Receipt({ entry, categories, backLabel, goalName, originalExpense, repayments, netCost,
  onAddRepayment, onOpenRelated, onBack, onEdit, onMenu }) {
  const category = categories[entry.type]?.find(item => item.id === entry.categoryId);
  const type = originalExpense ? 'Repayment' : { expense: 'Expense', income: 'Income', transfer: 'Transfer' }[entry.type];
  const entryType = { goal_deposit: 'Goal deposit', adjustment: 'Balance adjustment', opening: 'Opening balance' }[entry.subType] ?? type;
  const date = new Date(entry.date);
  const day = new Date(transactionDay(entry.date) + 'T12:00:00').toLocaleDateString('en-MY', { dateStyle: 'long' });
  const time = entry.date.includes('T') ? date.toLocaleTimeString('en-MY', { hour: 'numeric', minute: '2-digit' }) : '';
  const fields = [
    ['Type', entryType],
    ['Date', [day, time].filter(Boolean).join(' · ')],
    [entry.toAssetName || entry.subType === 'goal_deposit' ? 'From' : 'Account', entry.assetName],
    ['To', entry.toAssetName],
    ['Savings goal', goalName],
    ['Category', categoryLabel(category, entry.categoryId)],
    ['Source', entry.source === 'tng' || entry.paymentDraftId ? 'Touch ’n Go notification'
      : entry.recurringRuleId != null ? 'Scheduled transaction' : entry.source],
  ].filter(([, value]) => Boolean(value));

  return (
    <ScrollView style={pocketLayout.screen} contentContainerStyle={pocketLayout.content}>
      <TextAction icon="back" label={backLabel} onPress={onBack} />
      <PageHeader icon="receipt" title="Receipt" action={onMenu && <MenuButton label="Receipt options" onPress={onMenu} />} />
      <View style={[pocketLayout.card, styles.panel]}>
        <CategoryBadge category={category} entry={entry} />
        <Text style={styles.title}>{transactionLabel(entry, category)}</Text>
        <Text style={[pocketLayout.amount, styles.hero]}>{transactionAmount(entry)}</Text>
      </View>
      <View style={[pocketLayout.card, styles.info]}>
        {fields.map(([label, value], index) => (
          <View key={label} style={[styles.field, index > 0 && styles.divider]}>
            <Text style={styles.meta}>{label}</Text>
            <Text style={styles.value}>{value}</Text>
          </View>
        ))}
      </View>
      {(entry.reimbursable || originalExpense) && (
        <View style={[pocketLayout.card, styles.panel]}>
          <SectionHeader title={entry.reimbursable ? 'Split / Reimbursable' : 'Linked expense'} />
          {entry.reimbursable ? (
            <>
              <Text style={[styles.meta, pocketLayout.figures]}>{money(netCost)} net cost · {money(Math.abs(entry.amount) - netCost)} reimbursed</Text>
              {repayments.map(item => (
                <TextAction key={item.id} icon="chevron" label={(item.title || 'Repayment') + ' · ' + money(item.amount)}
                  labelStyle={pocketLayout.figures} onPress={() => onOpenRelated(item)} />
              ))}
              {onAddRepayment && <TextAction icon="plus" label="Record repayment" onPress={onAddRepayment} />}
            </>
          ) : <TextAction label={originalExpense.title || 'Original expense'} icon="chevron" onPress={() => onOpenRelated(originalExpense)} />}
        </View>
      )}
      {onEdit && <PrimaryButton label="Edit transaction" onPress={onEdit} />}
    </ScrollView>
  );
}

export function GoalDetail({ goal, transactions, categories, onBack, onMenu, onDeposit, onReceipt, recordActions }) {
  const saved = goal.savedAmount ?? goal.saved_amount;
  const target = goal.targetAmount ?? goal.target_amount;
  const reached = saved >= target;
  const progress = Math.min(100, Math.max(0, target > 0 ? saved / target * 100 : 0));
  const deposits = transactions.filter(item => item.subType === 'goal_deposit' && item.goalId === goal.id);
  const today = new Date();
  const pace = monthlySavingsPace(goal, today);
  const due = goal.targetDate && new Date(goal.targetDate + 'T12:00:00').toLocaleDateString('en-MY', { dateStyle: 'medium' });
  const dueDay = localDay(today);

  return (
    <ScrollView style={pocketLayout.screen} contentContainerStyle={pocketLayout.content}>
      <TextAction label="Savings goals" icon="back" onPress={onBack} />
      <PageHeader title={goal.title} appearance={goal.backgroundImage ? undefined : goalAppearance(goal)}
        action={<MenuButton label="Manage savings goal" onPress={onMenu} />} />
      <View style={goal.backgroundImage ? styles.photoCard : null}>
        {goal.backgroundImage && (
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <Image accessible={false} source={{ uri: goal.backgroundImage }} style={styles.goalImage} resizeMode="cover" />
          </View>
        )}
        <View style={[pocketLayout.card, styles.panel, goal.backgroundImage && styles.photoCaption]}>
          <Text style={styles.meta}>{reached ? 'Goal reached' : 'Saved'}</Text>
          <MoneyText value={saved} style={styles.hero} />
          <Text style={[styles.meta, pocketLayout.figures]}>{money(target)} target · {money(Math.max(0, target - saved))} remaining</Text>
          {due && <Text style={styles.meta}>Target date · {due}</Text>}
          {pace != null && <Text style={[styles.pace, pocketLayout.figures]}>{money(pace)} per month to reach goal</Text>}
          {due && !reached && goal.targetDate <= dueDay && (
            <Text style={styles.pace}>{goal.targetDate === dueDay ? 'Due today' : 'Target date passed'}</Text>
          )}
          <View style={styles.track} accessibilityRole="progressbar" accessibilityLabel="Savings goal"
            accessibilityValue={{ min: 0, max: 100, now: Math.round(progress) }}>
            <View style={[styles.fill, { width: progress + '%' }]} />
          </View>
        </View>
      </View>
      <PrimaryButton label="Add money" icon="plus" onPress={onDeposit} />
      <View style={styles.section}>
        <SectionHeader title="Deposits" />
        {deposits.length
          ? <LedgerList groups={groupTransactions(deposits)} categories={categories} goalId={goal.id} onOpen={onReceipt} recordActions={recordActions} />
          : <EmptyState title="No deposits yet" description="Money you add will appear here." />}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  menu: { minWidth: 48, minHeight: 48, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: pocket.white, borderWidth: 1, borderColor: pocket.line },
  panel: { padding: 16, gap: 8 },
  section: { gap: 8 },
  meta: { color: pocket.muted, fontSize: 14 },
  pace: { color: pocket.action, fontSize: 14, fontWeight: '700' },
  title: { color: pocket.ink, fontSize: 20, fontWeight: '600' },
  hero: { fontSize: 36 },
  info: { paddingHorizontal: 16 },
  field: { paddingVertical: 12, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderColor: pocket.line },
  value: { color: pocket.ink, fontSize: 16, flexShrink: 1, textAlign: 'right' },
  photoCard: { width: '100%', aspectRatio: 1, borderRadius: 24, overflow: 'hidden', backgroundColor: pocket.mint, justifyContent: 'flex-end', padding: 10 },
  goalImage: { width: '100%', height: '100%' },
  photoCaption: { backgroundColor: 'rgba(255,253,249,0.92)', borderColor: '#FFFDF9' },
  track: { height: 5, borderRadius: 4, backgroundColor: pocket.line, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: pocket.action },
});
