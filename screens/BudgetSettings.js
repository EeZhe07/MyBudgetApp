import React from 'react';
import { Alert, ScrollView, StyleSheet, Switch, TouchableOpacity, View } from 'react-native';
import { lucideLicense } from '../assets/lucide-license';
import { Text } from './PocketText';
import JournalPaper from './JournalPaper';
import { ScreenTitle, PocketIcon, SectionHeader, TextAction, pocket, pocketLayout } from './budgetUi';

function ActionRow({ icon, label, description, onPress, divided }) {
  return (
    <TouchableOpacity accessibilityRole="button" onPress={onPress} style={[styles.actionRow, divided && styles.divider]}>
      <View style={styles.actionIcon}><PocketIcon name={icon} size={18} color={pocket.action} /></View>
      <View style={styles.grow}>
        <Text style={styles.rowTitle}>{label}</Text>
        {description && <Text style={styles.body}>{description}</Text>}
      </View>
      <PocketIcon name="chevron" size={15} color={pocket.muted} />
    </TouchableOpacity>
  );
}

export default function BudgetSettings({
  capture, captureError, drafts, onToggle, onSettings, onReplay, onRefresh,
  onInbox, onBackup, onRestore, onExportCsv, onSchedules,
}) {
  const captureActive = capture?.enabled && capture.granted;
  const captureLabel = captureActive ? 'Active' : capture?.enabled ? 'Access required' : 'Off';

  return (
    <ScrollView style={pocketLayout.screen} contentContainerStyle={[pocketLayout.content, pocketLayout.navClearance]}
      showsVerticalScrollIndicator={false}>
      <ScreenTitle>Settings</ScreenTitle>

      <View style={[pocketLayout.card, styles.list]}>
        <ActionRow icon="calendar" label="Scheduled transactions" description="Recurring bills, income and top-ups" onPress={onSchedules} />
      </View>
      <View style={styles.section}>
        <SectionHeader title="Backups and exports" />
        <View style={[pocketLayout.card, styles.list]}>
          <ActionRow icon="download" label="Export backup" description="Save accounts, transactions and goals" onPress={onBackup} />
          <ActionRow icon="upload" label="Restore backup" description="Load a previously saved backup" onPress={onRestore} divided />
          <ActionRow icon="receipt" label="Export transactions as CSV" description="Open in Excel or Sheets" onPress={onExportCsv} divided />
        </View>
      </View>

      {(capture || captureError) && (
        <View style={styles.section}>
          <SectionHeader title="Touch ’n Go" />
          {captureError && (
            <View style={[pocketLayout.card, styles.captureCard]}>
              <Text style={styles.body}>Could not read the capture status.</Text>
              <TextAction label="Retry" icon="refresh" onPress={onRefresh} />
            </View>
          )}
          {capture && (
            <>
              <View style={styles.captureCard}>
                <JournalPaper from="#DDECE0" to="#F1F4E5" grid />
                <View style={styles.captureHeader}>
                  <View style={styles.captureIcon}><PocketIcon name="bell" color={pocket.action} /></View>
                  <View style={styles.grow}>
                    <Text style={styles.rowTitle}>Capture payment alerts</Text>
                    <Text style={[styles.status, captureActive && styles.activeStatus]}>{captureLabel}</Text>
                  </View>
                  <Switch accessibilityLabel="Touch ’n Go capture" value={capture.enabled} onValueChange={onToggle}
                    trackColor={{ false: '#D8CBBD', true: '#8FBAB1' }} thumbColor={capture.enabled ? pocket.action : pocket.white} />
                </View>
                <Text style={styles.body}>Payment alerts are processed on your device. Review detected payments before recording them.</Text>
                <TextAction label="Manage Android notification access" onPress={onSettings} />
                {capture.enabled && capture.lastUnrecognisedAt > 0 && (
                  <Text style={styles.body}>Unrecognized alert · {new Date(capture.lastUnrecognisedAt).toLocaleString('en-MY')}</Text>
                )}
              </View>
              <View style={[pocketLayout.card, styles.inbox]}>
                <ActionRow icon="receipt" label="Payment inbox"
                  description={drafts.length ? drafts.length + ' pending review' : 'No payments waiting for review'} onPress={onInbox} />
                {onReplay && <TextAction label="Replay synthetic TNG samples" onPress={onReplay} />}
              </View>
            </>
          )}
        </View>
      )}
      <Text style={styles.footer}>Budget records stay on this device unless you share an export.</Text>
      <View style={styles.credits}><TextAction label="Icon licenses" onPress={() => Alert.alert('Icon licenses', lucideLicense)} /></View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  section: { gap: 7 },
  list: { paddingHorizontal: 12 },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 9, minHeight: 65, paddingVertical: 10 },
  actionIcon: { width: 37, height: 37, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: pocket.blush },
  divider: { borderTopWidth: 1, borderTopColor: pocket.line },
  grow: { flex: 1, gap: 3 },
  rowTitle: { color: pocket.ink, fontWeight: '800', fontSize: 14 },
  body: { color: pocket.muted, fontWeight: '500', fontSize: 14, lineHeight: 20 },
  captureCard: { overflow: 'hidden', backgroundColor: pocket.mint, borderColor: pocket.line, borderWidth: 1, borderRadius: 21, borderBottomRightRadius: 7, gap: 8, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10 },
  captureHeader: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  captureIcon: { width: 41, height: 41, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: pocket.white },
  status: { alignSelf: 'flex-start', backgroundColor: pocket.white, borderRadius: 10, color: '#724437', overflow: 'hidden', paddingHorizontal: 7, paddingVertical: 2, fontWeight: '700', fontSize: 11 },
  activeStatus: { backgroundColor: pocket.mint, color: pocket.green },
  inbox: { padding: 12, gap: 3 },
  footer: { textAlign: 'center', color: pocket.muted, fontSize: 12, marginTop: 4 },
  credits: { alignItems: 'center' },
});
