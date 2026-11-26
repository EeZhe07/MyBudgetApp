import React from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import BreakdownDonut from './BreakdownDonut';
import BalanceTrend from './BalanceTrend';
import JournalPaper from './JournalPaper';
import { Text } from './PocketText';
import { assetOverview } from '../lib/budget-insights';
import { accountAppearance } from '../lib/budget-icons';
import { IdentityBadge, MoneyText, PocketIcon, ScreenTitle, SectionHeader, TextAction, money, pocket, pocketLayout } from './budgetUi';

const accountColors = ['#BD684F', '#659176', '#7D6FA4', '#658AA4', '#AC793D'];

export default function BudgetAssets({ accounts, goals, transactions, onAdd, onAddLiability, onOpen }) {
  const overview = assetOverview(accounts, goals, transactions);
  const liveAccounts = accounts.filter(account => !account.archived);
  const archivedAccounts = accounts.filter(account => account.archived);
  const toSlices = rows => rows.map(row => ({
    ...row, color: row.id === 'savings-goals' ? pocket.green : accountColors[row.index % accountColors.length],
  })).sort((a, b) => b.amount - a.amount);

  return (
    <ScrollView style={pocketLayout.screen} contentContainerStyle={[pocketLayout.content, pocketLayout.navClearance]}
      showsVerticalScrollIndicator={false}>
      <ScreenTitle>Assets</ScreenTitle>
      {(accounts.length > 0 || goals.length > 0) && (
        <View style={[pocketLayout.card, styles.panel, styles.balanceCover]}>
          <JournalPaper from="#D1E6D7" to="#F1F3DE" grid />
          <Text style={styles.caption}>Net worth</Text>
          <Text style={[pocketLayout.amount, styles.heroValue]}>{money(overview.netWorth)}</Text>

          <View style={styles.totals}>
            <View style={styles.grow}><Text style={styles.caption}>Total assets</Text><Text style={[pocketLayout.amount, styles.metric, styles.positive]}>{money(overview.assets)}</Text></View>
            <View style={styles.grow}><Text style={styles.caption}>Liabilities</Text><Text style={[pocketLayout.amount, styles.metric]}>{money(overview.liabilities)}</Text></View>
          </View>
        </View>
      )}

      <View style={styles.section}>
        <SectionHeader title="Your accounts" action={<TextAction icon="plus" label="Add account" onPress={onAdd} />} />
        {liveAccounts.length === 0 && <TextAction icon="plus" label="Add your first account" onPress={onAdd} />}
        <View style={styles.accountCards}>
          {liveAccounts.map(account => (
            <TouchableOpacity key={account.id} accessibilityRole="button" onPress={() => onOpen(account)}
              style={[pocketLayout.card, styles.account, styles.accountCard]}>
              <IdentityBadge appearance={accountAppearance(account)} />
              <View style={styles.grow}>
                <Text style={styles.accountName}>{account.name}</Text>
                {account.accountType === 'liability' && <Text style={styles.caption}>Liability</Text>}
              </View>
              <MoneyText value={account.balance} style={[styles.accountBalance, Number(account.balance) < 0 && styles.negative]} />
              <PocketIcon name="chevron" size={15} color={pocket.muted} />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {archivedAccounts.length > 0 && (
        <View style={styles.section}>
          <SectionHeader title="Archived accounts" />
          <View style={[pocketLayout.card, styles.accountList]}>
            {archivedAccounts.map((account, index) => (
              <TouchableOpacity key={account.id} accessibilityRole="button" onPress={() => onOpen(account)}
                style={[styles.account, index > 0 && styles.divider]}>
                <IdentityBadge appearance={accountAppearance(account)} />
                <Text style={[styles.accountName, styles.grow]}>{account.name}</Text>
                <Text style={[pocketLayout.amount, styles.metric]}>{money(account.balance)}</Text>
                <PocketIcon name="chevron" size={15} color={pocket.muted} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {(accounts.length > 0 || goals.length > 0) && (
        <View style={[pocketLayout.card, styles.panel]}>
          <SectionHeader title="Net worth trend" />
          <Text style={styles.caption}>Last 30 days · Estimated from recorded activity</Text>
          <BalanceTrend points={overview.trend} />
        </View>
      )}

      <BreakdownDonut title="Where my money is" total={overview.assets} rows={toSlices(overview.holdings)} empty="No positive balances yet." />
      <BreakdownDonut title="Liabilities" total={overview.liabilities} rows={toSlices(overview.debts)} empty="No outstanding balances."
        action={<TextAction icon="plus" label="Add liability" onPress={onAddLiability} />} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  grow: { flex: 1 },
  heroValue: { fontSize: 33, letterSpacing: -1 },
  totals: { flexDirection: 'row', gap: 12, borderTopColor: '#E9D2B8', borderTopWidth: 1, paddingTop: 12 },
  metric: { fontSize: 14, flexShrink: 1 },
  positive: { color: pocket.green },
  negative: { color: pocket.danger },
  caption: { color: pocket.muted, fontSize: 12, fontWeight: '600' },
  section: { gap: 5 },
  accountList: { paddingHorizontal: 12 },
  account: { minHeight: 65, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 8 },
  divider: { borderTopWidth: 1, borderTopColor: pocket.line },
  accountName: { color: pocket.ink, fontWeight: '700', fontSize: 16 },
  panel: { padding: 14, gap: 6 },
  accountCards: { gap: 8 },
  balanceCover: { padding: 19, overflow: 'hidden', borderBottomRightRadius: 7 },
  accountCard: { backgroundColor: '#FCFBF9', borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 12, gap: 10 },
  accountBalance: { fontSize: 16, maxWidth: '48%', flexShrink: 1, textAlign: 'right' },
});
