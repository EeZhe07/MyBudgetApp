import React, { useState } from 'react';
import { Keyboard, ScrollView, StyleSheet, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { Text, TextInput } from './PocketText';
import PocketSheet from './PocketSheet';
import { localDay } from '../lib/budget-store';
import { IdentityBadge, PocketIcon, TextAction, categoryLabel, money, pocket } from './budgetUi';
import { accountAppearance, categoryAppearance, pastelSwatches } from '../lib/budget-icons';

const types = [['expense', 'Expense'], ['income', 'Income'], ['transfer', 'Transfer']];
const keys = [
  ['7', '7'], ['8', '8'], ['9', '9'], ['÷', '/', 'Divide'],
  ['4', '4'], ['5', '5'], ['6', '6'], ['×', '*', 'Multiply'],
  ['1', '1'], ['2', '2'], ['3', '3'], ['−', '-', 'Subtract'],
  ['.', '.', 'Decimal point'], ['0', '0'], ['⌫', 'backspace', 'Delete digit'], ['+', '+', 'Add'],
];

function Accounts({ label, assets, selected, onSelect, onAdd }) {
  return (
    <View style={styles.field}>
      <Text style={[styles.label, selected == null && styles.action]}>{selected == null ? 'Choose ' + label.toLowerCase() : label}</Text>
      {assets.length === 0 && onAdd && <TextAction icon="plus" label="Add your first account" onPress={onAdd} />}
      <ScrollView horizontal keyboardShouldPersistTaps="handled" showsHorizontalScrollIndicator={false} contentContainerStyle={styles.accountList}>
        {assets.map(asset => {
          const active = asset.id === selected;
          return (
            <TouchableOpacity key={asset.id} accessibilityRole="button" accessibilityState={{ selected: active }}
              style={[styles.account, active && styles.accountActive]} onPress={() => onSelect(asset.id)}>
              <IdentityBadge appearance={accountAppearance(asset)} size={26} />
              {active && <PocketIcon name="check" size={15} color={pocket.action} />}
              <Text style={[styles.accountText, active && styles.action]}>{asset.name}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

export default function TransactionEntry({
  amount, setAmount, note, setNote, type, onType, assets, selectedAssetId, onAsset, toAssetId, onDestination,
  categories, category, onCategory, onNewCategory, date, time, onDate, onTime,
  editing, draft, goalDeposit, goalName, split, onSplit, linkedExpense, onLinkExpense,
  schedule, onScheduleChange, onAddAccount, onSave, onClose,
}) {
  const { width, fontScale } = useWindowDimensions();
  const [detailsOpen, setDetailsOpen] = useState(Boolean(draft && (!date || !time)));

  const title = schedule ? (schedule.id == null ? 'New schedule' : 'Edit schedule')
    : draft ? (type === 'transfer' ? 'Review Touch ’n Go transfer' : 'Review Touch ’n Go payment')
    : editing ? 'Edit transaction' : goalDeposit ? 'Add money' : 'Record ' + type;
  const categoryId = categories.find(item => item.id === category?.id)?.id ?? (draft ? undefined : categories[0]?.id);
  const saveable = amount !== '' && assets.some(asset => asset.id === selectedAssetId) &&
    (!draft || ((type === 'transfer' || categoryId != null) && date && time)) &&
    (type !== 'transfer' || goalDeposit || (assets.some(asset => asset.id === toAssetId) && toAssetId !== selectedAssetId));
  const saveText = schedule ? 'Save schedule'
    : draft ? (type === 'transfer' ? 'Confirm transfer' : 'Confirm expense') : goalDeposit && !editing ? 'Add money' : 'Save';
  const dayLabel = date === localDay(new Date()) ? 'Today' : date;
  const footer = keyboardOpen => (
    <View style={styles.footer}>
      <View style={styles.entryValues}>
        <View style={styles.amountCard}>
          <View style={styles.amountContent}>
            <Text style={styles.amount} accessibilityLabel={`Amount, ${amount || '0.00'} ringgit`}>RM {amount || '0.00'}</Text>
          </View>
          {!!amount && <TouchableOpacity accessibilityRole="button" accessibilityLabel="Clear amount" style={styles.clear} onPress={() => setAmount('')}>
            <PocketIcon name="close" size={16} color={pocket.action} />
          </TouchableOpacity>}
        </View>
        <TextInput accessibilityLabel={draft ? 'Merchant or note' : 'Note'} style={[styles.input, styles.note]} value={note}
          onChangeText={setNote} placeholder={draft ? 'Merchant or note' : 'Note'} placeholderTextColor={pocket.muted} returnKeyType="done" />
      </View>
      {!keyboardOpen && (
        <View style={styles.keypad}>
          {keys.map(([symbol, key, label], index) => (
            <TouchableOpacity key={symbol} accessibilityRole="button" accessibilityLabel={label ?? symbol}
              style={[styles.key, (index % 4 === 3 || key === 'backspace') && styles.keyAccent]}
              onPress={() => setAmount(previous => key === 'backspace' ? previous.slice(0, -1) : previous + key)}>
              <Text style={[styles.keyText, (index % 4 === 3 || key === 'backspace') && styles.action]}>{symbol}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      <View style={styles.saveRow}>
        {!editing && !draft && !goalDeposit && !schedule && (
          <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: !saveable }} disabled={!saveable}
            style={styles.saveAnother} onPress={() => onSave(false)}>
            <Text style={[styles.link, !saveable && styles.muted]}>Save & add another</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: !saveable }} disabled={!saveable}
          onPress={() => onSave(true)} style={[styles.save, !saveable && styles.saveDisabled]}>
          <Text style={[styles.saveText, !saveable && styles.muted]}>{saveText}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <PocketSheet title={title} onClose={onClose} footer={footer}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.fields} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {!draft && !goalDeposit && (
          <View style={styles.types}>
            {types.map(([id, text]) => (
              <TouchableOpacity key={id} accessibilityRole="button" accessibilityState={{ selected: id === type }}
                onPress={() => onType(id)} style={[styles.type, id === type && styles.typeActive]}>
                <Text style={[styles.typeText, id === type && styles.action]}>{text}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {goalName && <Text style={styles.dateText}>{goalName}</Text>}
        <Accounts label={type === 'transfer' ? 'From account' : 'Account'} assets={assets} selected={selectedAssetId} onSelect={onAsset} onAdd={onAddAccount} />
        {type === 'transfer' && !goalDeposit && <Accounts label="To account" assets={assets} selected={toAssetId} onSelect={onDestination} />}
        {!schedule && type === 'expense' && (
          <TouchableOpacity accessibilityRole="switch" accessibilityState={{ checked: split }}
            onPress={() => onSplit(!split)} style={[styles.detailsButton, split && styles.accountActive]}>
            <PocketIcon name="receipt" size={18} color={pocket.action} />
            <Text style={[styles.dateText, styles.amountContent]}>Split / Reimbursable</Text>
            <Text style={styles.link}>{split ? 'On' : 'Off'}</Text>
          </TouchableOpacity>
        )}
        {onLinkExpense && type === 'income' && !schedule && (
          <TouchableOpacity accessibilityRole="button" onPress={onLinkExpense}
            style={[styles.detailsButton, linkedExpense && styles.accountActive]}>
            <PocketIcon name="receipt" size={18} color={pocket.action} />
            <View style={styles.amountContent}>
              <Text style={styles.dateText}>Link repayment</Text>
              {linkedExpense && <Text style={styles.detailsPreview}>{linkedExpense}</Text>}
            </View>
            <PocketIcon name="chevron" size={16} color={pocket.action} />
          </TouchableOpacity>
        )}
        {schedule && (
          <View style={styles.field}>
            <ScheduleOptions label="Repeat" value={schedule.frequency} options={['weekly', 'monthly']}
              onSelect={frequency => onScheduleChange({ ...schedule, frequency })} />
            <ScheduleOptions label="Remind me before" value={schedule.reminderDays} options={[null, 1, 3, 7]}
              onSelect={reminderDays => onScheduleChange({ ...schedule, reminderDays })} />
          </View>
        )}

        <TouchableOpacity accessibilityRole="button" accessibilityState={{ expanded: detailsOpen }}
          style={styles.detailsButton} onPress={() => { if (detailsOpen) Keyboard.dismiss(); setDetailsOpen(!detailsOpen); }}>
          <PocketIcon name="receipt" size={18} color={pocket.action} />
          <View style={styles.amountContent}>
            <Text style={styles.dateText}>{schedule ? 'Next due date and time' : 'Date and time'}</Text>
            <Text style={styles.detailsPreview} numberOfLines={1}>{[dayLabel, time].filter(Boolean).join(' · ')}</Text>
          </View>
          <View style={detailsOpen && styles.openChevron}><PocketIcon name="down" size={17} color={pocket.muted} /></View>
        </TouchableOpacity>
        {detailsOpen && (
            <View style={styles.dateTime}>
              <View style={styles.dateField}>
                <Text style={styles.label}>Date</Text>
                <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Choose date, ${date}`} style={styles.date} onPress={onDate}>
                  <PocketIcon name="calendar" size={17} color={pocket.action} /><Text style={styles.dateText}>{date}</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.timeField}>
                <Text style={styles.label}>Time</Text>
                <TextInput accessibilityLabel="Time in hours and minutes" style={styles.input} value={time} onChangeText={onTime}
                  placeholder="HH:MM" placeholderTextColor={pocket.muted} returnKeyType="done" />
              </View>
            </View>
        )}
        {type !== 'transfer' && (
          <View style={styles.field}>
            <View style={styles.fieldHeader}>
                <Text style={[styles.label, draft && categoryId == null && styles.action]}>{draft && categoryId == null ? 'Choose a category' : 'Category'}</Text>
              <TouchableOpacity accessibilityRole="button" style={styles.newCategory} onPress={onNewCategory}>
                <PocketIcon name="plus" size={15} color={pocket.action} />
                <Text style={styles.link}>New category</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.categories}>
              {categories.map(item => {
                const active = item.id === categoryId;
                const appearance = categoryAppearance(item);
                return (
                  <TouchableOpacity key={item.id} accessibilityRole="button" accessibilityState={{ selected: active }}
                    style={[styles.category, { backgroundColor: pastelSwatches[appearance.colorKey].ink + '14' },
                      (fontScale > 1.2 || width < 360) && styles.largeCategory, active && styles.categoryActive]} onPress={() => onCategory(item)}>
                    <IdentityBadge appearance={appearance} size={32} />
                    <Text style={[styles.categoryText, active && styles.action]}>{categoryLabel(item)}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

      </ScrollView>
    </PocketSheet>
  );
}

function ScheduleOptions({ label, value, options, onSelect }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.scheduleChoices}>
        {options.map(option => {
          const active = option === value;
          const text = option == null ? 'Off' : option === 1 ? '1 day' : typeof option === 'number'
            ? option + ' days' : option === 'weekly' ? 'Weekly' : 'Monthly';
          return (
            <TouchableOpacity key={text} accessibilityRole="button" accessibilityState={{ selected: active }}
              style={[styles.scheduleChoice, active && styles.accountActive]} onPress={() => onSelect(option)}>
              <Text style={styles.link}>{text}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export function PaymentInbox({ drafts, busy, account, category, onReview, onDecline, onAccept, onClose }) {
  return (
    <PocketSheet title="Touch ’n Go payments" onClose={onClose}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.fields}>
        {drafts.length === 0 && <Text style={styles.label}>You’re all caught up.</Text>}
        {drafts.map(draft => (
          <View key={draft.id} style={styles.draft}>
            <View style={styles.draftHeader}>
              <PocketIcon name="receipt" color={pocket.action} />
              <View style={styles.amountContent}>
                <Text style={styles.draftTitle}>{draft.merchant || 'Touch ’n Go purchase'}</Text>
                <Text style={styles.muted}>{new Date(draft.postedAt).toLocaleString('en-MY')}</Text>
              </View>
              <Text style={styles.draftAmount}>{money(draft.amountSen / 100)}</Text>
            </View>
            <Text style={styles.draftRoute}>{[account ?? 'Choose an account', draft.type === 'transfer' ? 'Transfer · Choose destination' : category ?? 'Choose a category'].join('  ·  ')}</Text>
            <View style={[styles.saveRow, styles.draftActions]} accessibilityState={{ busy: busy === draft.id }}>
              <TouchableOpacity accessibilityRole="button" disabled={busy != null} style={[styles.save, styles.draftButton, busy != null && styles.saveDisabled]} onPress={() => onAccept(draft)}>
                <Text style={[styles.saveText, busy != null && styles.muted]}>Accept</Text>
              </TouchableOpacity>
              <TouchableOpacity accessibilityRole="button" disabled={busy != null} style={[styles.saveAnother, styles.draftButton]} onPress={() => onDecline(draft)}>
                <Text style={[styles.link, styles.muted]}>Decline</Text>
              </TouchableOpacity>
              <TouchableOpacity accessibilityRole="button" disabled={busy != null} style={[styles.saveAnother, styles.draftButton, styles.draftEdit]} onPress={() => onReview(draft)}>
                <PocketIcon name="edit" size={16} color={pocket.action} /><Text style={styles.link}>Edit</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </PocketSheet>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  fields: { paddingTop: 6, paddingBottom: 12, gap: 11 },
  entryValues: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  amountCard: { flexGrow: 2, flexBasis: 155, minHeight: 48, backgroundColor: pocket.peach, paddingLeft: 10, paddingVertical: 3, borderRadius: 10, flexDirection: 'row', alignItems: 'center' },
  note: { flexGrow: 1, flexBasis: 105, minHeight: 48 },
  amountContent: { flex: 1 },
  amount: { color: pocket.ink, fontSize: 27, fontWeight: '600', fontVariant: ['tabular-nums'] },
  clear: { minHeight: 48, minWidth: 48, alignItems: 'center', justifyContent: 'center' },
  label: { color: pocket.muted, fontSize: 14, fontWeight: '500' },
  link: { color: pocket.action, fontSize: 13, fontWeight: '800', textAlign: 'center' },
  action: { color: pocket.action },
  muted: { color: pocket.muted },
  types: { flexDirection: 'row', padding: 3, borderRadius: 13, backgroundColor: '#F0E7DF', gap: 4 },
  type: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3, borderRadius: 10 },
  typeActive: { backgroundColor: pocket.white },
  typeText: { textAlign: 'center', color: pocket.muted, fontSize: 13, fontWeight: '800' },
  field: { gap: 5 },
  fieldHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 42, gap: 8 },
  newCategory: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 4 },
  accountList: { gap: 7 },
  account: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: pocket.white, borderWidth: 1, borderColor: pocket.line, borderRadius: 13, paddingHorizontal: 10 },
  accountActive: { borderColor: pocket.action, backgroundColor: pocket.blush },
  accountText: { color: pocket.ink, fontWeight: '700', fontSize: 14 },
  scheduleChoices: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  scheduleChoice: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 11, borderRadius: 13, borderWidth: 1, borderColor: pocket.line, backgroundColor: pocket.white },
  categories: { flexDirection: 'row', flexWrap: 'wrap' },
  category: { width: '31.8%', marginRight: '1.5%', marginBottom: 6, minHeight: 60, paddingHorizontal: 5, paddingVertical: 6, alignItems: 'center', justifyContent: 'center', gap: 3, borderRadius: 12, borderColor: 'transparent', borderWidth: 1 },
  largeCategory: { width: '48.5%', minHeight: 68, paddingHorizontal: 4 },
  categoryActive: { borderColor: pocket.action, backgroundColor: pocket.blush },
  categoryText: { textAlign: 'center', color: pocket.ink, fontSize: 12, fontWeight: '700' },
  input: { minHeight: 45, paddingVertical: 8, paddingHorizontal: 11, color: pocket.ink, backgroundColor: pocket.white, borderColor: pocket.line, borderWidth: 1, borderRadius: 12, fontSize: 15 },
  dateTime: { flexDirection: 'row', gap: 8 },
  dateField: { flex: 1, gap: 5 },
  timeField: { flex: 0.65, gap: 5 },
  date: { minHeight: 45, paddingHorizontal: 10, borderWidth: 1, borderColor: pocket.line, backgroundColor: pocket.white, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 5 },
  dateText: { flexShrink: 1, color: pocket.ink, fontSize: 14, fontWeight: '700' },
  detailsButton: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 11, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: pocket.line, backgroundColor: pocket.white },
  detailsPreview: { color: pocket.muted, fontSize: 12, marginTop: 2 },
  openChevron: { transform: [{ rotate: '180deg' }] },
  footer: { borderTopWidth: 1, borderTopColor: pocket.line, paddingTop: 6, gap: 6 },
  keypad: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', rowGap: 4 },
  key: { width: '24%', minHeight: 48, backgroundColor: pocket.white, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  keyAccent: { backgroundColor: pocket.blush },
  keyText: { color: pocket.ink, fontSize: 21, fontWeight: '700' },
  saveRow: { flexDirection: 'row', alignItems: 'stretch', gap: 8 },
  saveAnother: { minHeight: 48, paddingHorizontal: 8, flex: 0.8, justifyContent: 'center', alignItems: 'center', borderRadius: 13 },
  save: { minHeight: 48, flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10, borderRadius: 8, backgroundColor: pocket.action },
  saveDisabled: { backgroundColor: '#EDE1D7' },
  saveText: { color: pocket.white, fontWeight: '800', fontSize: 15, textAlign: 'center' },
  draft: { backgroundColor: pocket.white, borderWidth: 1, borderColor: pocket.line, borderRadius: 15, padding: 12, gap: 8 },
  draftHeader: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  draftTitle: { color: pocket.ink, fontSize: 15, fontWeight: '800', flexShrink: 1 },
  draftAmount: { color: pocket.ink, fontSize: 16, fontWeight: '600', fontVariant: ['tabular-nums'], maxWidth: '45%', textAlign: 'right' },
  draftRoute: { color: pocket.action, backgroundColor: pocket.blush, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, fontSize: 13 },
  draftActions: { flexWrap: 'wrap' },
  draftButton: { flexBasis: 'auto', flexGrow: 1, flexShrink: 0 },
  draftEdit: { flexDirection: 'row', gap: 4, borderWidth: 1, borderColor: pocket.line, borderRadius: 8 },
});
