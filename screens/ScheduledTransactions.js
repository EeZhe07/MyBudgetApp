import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text } from './PocketText';
import { recurringAccounts } from '../lib/budget-recurring';
import { EmptyState, MoneyText, PageHeader, PrimaryButton, TextAction, pocket, pocketLayout } from './budgetUi';

export default function ScheduledTransactions({ rules, assets, reminderIssue, onBack, onAdd, onEdit, onDelete, onReminderSettings }) {
  const allowed = assets.some(asset => !asset.archived);
  return (
    <ScrollView style={pocketLayout.screen} contentContainerStyle={pocketLayout.content}>
      <TextAction icon="back" label="Settings" onPress={onBack} />
      <PageHeader title="Scheduled transactions" icon="calendar" />
      <Text style={styles.meta}>Due entries are recorded when you open the app. Top-up rules track transfers in your ledger.</Text>
      {allowed && <PrimaryButton icon="plus" label="New schedule" onPress={onAdd} />}
      {!!reminderIssue && (
        <View style={[pocketLayout.card, styles.card]}>
          <Text style={styles.meta}>{reminderIssue}</Text>
          {onReminderSettings && <TextAction label="Open device settings" onPress={onReminderSettings} />}
        </View>
      )}
      {!rules.length && <EmptyState title="No scheduled transactions" description={allowed ? undefined : 'Add an account to create a schedule.'} />}
      {[...rules].sort((a, b) => a.nextDay.localeCompare(b.nextDay)).map(rule => {
        const accounts = recurringAccounts(rule, assets);
        const next = new Date(rule.nextDay + 'T12:00:00').toLocaleDateString('en-MY', { dateStyle: 'medium' });
        const reminder = rule.reminderDays == null ? '' : ' · Remind ' + rule.reminderDays + (rule.reminderDays === 1 ? ' day before' : ' days before');
        return (
          <View key={rule.id} style={[pocketLayout.card, styles.card]}>
            <View style={styles.heading}>
              <Text style={styles.title}>{rule.title}</Text>
              <MoneyText value={rule.type === 'expense' ? -rule.amount : rule.amount} style={styles.amount} />
            </View>
            <Text style={styles.meta}>{rule.frequency === 'weekly' ? 'Weekly' : 'Monthly'} · {next} at {rule.time}{reminder}</Text>
            <Text style={styles.meta}>{accounts ? [accounts.from.name, accounts.to?.name].filter(Boolean).join(' → ') : 'Waiting for an active account'}</Text>
            <View style={styles.actions}>
              {allowed && <TextAction icon="edit" label="Edit schedule" onPress={() => onEdit(rule)} />}
              <TextAction icon="trash" label="Delete schedule" onPress={() => onDelete(rule)} />
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: { padding: 14, gap: 5 },
  heading: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 },
  title: { color: pocket.ink, fontSize: 16, fontWeight: '700', flexShrink: 1 },
  amount: { fontSize: 16 },
  meta: { color: pocket.muted, fontSize: 14, lineHeight: 20 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
});
