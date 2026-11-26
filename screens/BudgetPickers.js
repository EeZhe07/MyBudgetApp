import React, { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text, TextInput } from './PocketText';
import IconPicker from './IconPicker';
import { categoryIconKeys } from '../lib/budget-icons';
import { PocketIcon, pocket, pocketLayout, useReducedMotion } from './budgetUi';

function Dialog({ title, onClose, children }) {
  const reduced = useReducedMotion();
  return (
    <Modal transparent animationType={reduced ? 'none' : 'fade'} onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.dialog}>
          <View style={styles.header}>
            <Text accessibilityRole="header" style={styles.title}>{title}</Text>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close" style={styles.close} onPress={onClose}>
              <PocketIcon name="close" size={19} />
            </TouchableOpacity>
          </View>
          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Period({ children, onPrevious, onNext, unit }) {
  return (
    <View style={styles.period}>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Previous ${unit}`} style={styles.close} onPress={onPrevious}>
        <Text style={styles.arrow}>‹</Text>
      </TouchableOpacity>
      <Text style={styles.periodText}>{children}</Text>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Next ${unit}`} style={styles.close} onPress={onNext}>
        <Text style={styles.arrow}>›</Text>
      </TouchableOpacity>
    </View>
  );
}

export function MonthPicker({ month, onSelect, onClose }) {
  const [year, setYear] = useState(month.getFullYear());

  return (
    <Dialog title="Choose month" onClose={onClose}>
      <Period unit="year" onPrevious={() => setYear(year - 1)} onNext={() => setYear(year + 1)}>{year}</Period>
      <View style={styles.grid}>
        {Array.from({ length: 12 }, (_, index) => {
          const date = new Date(year, index, 1);
          const active = year === month.getFullYear() && index === month.getMonth();
          return (
            <TouchableOpacity key={index} accessibilityRole="button" accessibilityState={{ selected: active }}
              style={[styles.month, active && styles.selected]} onPress={() => onSelect(date)}>
              <Text style={[styles.choice, active && styles.selectedText]}>{date.toLocaleDateString('en-MY', { month: 'short' })}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </Dialog>
  );
}

export function DatePicker({ title = 'Choose date', date, cursor, onMonth, onSelect, onClose }) {
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const offset = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();

  return (
    <Dialog title={title} onClose={onClose}>
      <Period unit="month" onPrevious={() => onMonth(new Date(year, month - 1, 1))}
        onNext={() => onMonth(new Date(year, month + 1, 1))}>
        {cursor.toLocaleDateString('en-MY', { month: 'long', year: 'numeric' })}
      </Period>
      <View style={styles.grid}>
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => <Text key={day} style={styles.weekday}>{day}</Text>)}
        {Array.from({ length: offset + days }, (_, index) => {
          if (index < offset) return <View key={index} style={styles.day} />;
          const day = index - offset + 1;
          const value = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const active = value === date;
          return (
            <TouchableOpacity key={index} accessibilityRole="button" accessibilityState={{ selected: active }}
              accessibilityLabel={new Date(year, month, day).toLocaleDateString('en-MY', { dateStyle: 'long' })}
              style={[styles.day, active && styles.selected]} onPress={() => onSelect(value)}>
              <Text style={[styles.choice, active && styles.selectedText]}>{day}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </Dialog>
  );
}

export function FilterPicker({ title, options, selected, onSelect, onClose, multiple = false }) {
  return (
    <Dialog title={title} onClose={onClose}>
      <ScrollView style={styles.filterList} contentContainerStyle={multiple && styles.filterChips} keyboardShouldPersistTaps="handled">
        {options.map(({ id, label }) => {
          const active = multiple ? (id == null ? selected.length === 0 : selected.includes(id)) : id === selected;
          return (
            <TouchableOpacity key={id ?? 'all'} accessibilityRole="button" accessibilityState={{ selected: active }}
              onPress={() => onSelect(id)} style={[multiple ? styles.filterChip : styles.filterRow, active && styles.activeFilter]}>
              <Text style={styles.choice}>{label}</Text>
              {active && <PocketIcon name="check" size={18} color={pocket.action} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      {multiple && <Submit onPress={onClose}>Done</Submit>}
    </Dialog>
  );
}

export function BudgetLimit({ value, onChange, onSave, onClose }) {
  const valid = /^\d+(?:\.\d{0,2})?$/.test(value.trim()) && Number.isSafeInteger(Math.round(Number(value) * 100));
  return (
    <Dialog title="Monthly budget" onClose={onClose}>
      <Text style={styles.label}>Limit (RM)</Text>
      <TextInput accessibilityLabel="Monthly budget in ringgit" style={[styles.input, pocketLayout.figures]} keyboardType="decimal-pad"
        value={value} onChangeText={onChange} placeholder="0.00" placeholderTextColor={pocket.muted} />
      <Text style={styles.label}>Enter 0 to clear your budget limit.</Text>
      <Submit disabled={!valid} onPress={() => onSave(Number(value))}>Save budget</Submit>
    </Dialog>
  );
}

export function NewCategory({ name, appearance, onName, onAppearance, onSave, onClose }) {
  return (
    <Dialog title="New category" onClose={onClose}>
      <ScrollView style={styles.categoryForm} contentContainerStyle={styles.categoryFields} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Category name</Text>
        <TextInput accessibilityLabel="Category name" style={styles.input} value={name} onChangeText={onName} autoFocus />
        <IconPicker appearance={appearance} suggestedIcons={categoryIconKeys} onChange={onAppearance} />
      </ScrollView>
      <Submit disabled={!name.trim()} onPress={onSave}>Add category</Submit>
    </Dialog>
  );
}

function Submit({ disabled, children, onPress }) {
  return (
    <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
      style={[styles.submit, disabled && styles.disabled]}>
      <Text style={[styles.submitText, disabled && styles.label]}>{children}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  categoryForm: { flexGrow: 0, flexShrink: 1 },
  categoryFields: { gap: 8 },
  filterList: { maxHeight: 360 },
  filterChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingBottom: 6 },
  filterChip: { minHeight: 48, paddingHorizontal: 12, borderRadius: 24, flexDirection: 'row', alignItems: 'center', gap: 6, borderColor: pocket.line, borderWidth: 1, maxWidth: '100%' },
  filterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, minHeight: 48, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 4, borderRadius: 12, backgroundColor: pocket.white },
  activeFilter: { backgroundColor: pocket.blush },
  overlay: { flex: 1, backgroundColor: '#2F29266E', justifyContent: 'center', alignItems: 'center', padding: 16 },
  dialog: { width: '100%', maxWidth: 385, maxHeight: '100%', padding: 16, borderRadius: 12, backgroundColor: pocket.paper, gap: 8 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { flex: 1, color: pocket.ink, fontSize: 22, fontWeight: '800' },
  close: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: pocket.white },
  arrow: { color: pocket.action, fontSize: 27, lineHeight: 30 },
  period: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 4 },
  periodText: { flexShrink: 1, textAlign: 'center', color: pocket.ink, fontSize: 17, fontWeight: '800' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  month: { width: '31.33%', margin: '1%', minHeight: 46, justifyContent: 'center', alignItems: 'center', borderRadius: 13, backgroundColor: pocket.white },
  day: { width: '14.28%', minHeight: 44, justifyContent: 'center', alignItems: 'center', borderRadius: 12 },
  weekday: { width: '14.28%', textAlign: 'center', color: pocket.muted, marginBottom: 4, fontSize: 13 },
  choice: { color: pocket.ink, fontSize: 15, fontWeight: '700' },
  selected: { backgroundColor: pocket.action },
  selectedText: { color: pocket.white },
  label: { color: pocket.muted, fontSize: 14 },
  input: { minHeight: 47, paddingHorizontal: 11, paddingVertical: 8, borderRadius: 12, borderColor: pocket.line, borderWidth: 1, backgroundColor: pocket.white, color: pocket.ink, fontSize: 17 },
  submit: { minHeight: 48, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginTop: 4, backgroundColor: pocket.action },
  submitText: { color: pocket.white, fontSize: 15, fontWeight: '800' },
  disabled: { backgroundColor: '#EDE1D7' },
});
