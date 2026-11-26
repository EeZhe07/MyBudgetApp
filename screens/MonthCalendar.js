import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { localDay } from '../lib/budget-store';
import { Text } from './PocketText';
import { money, pocket } from './budgetUi';

const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const shortAmount = new Intl.NumberFormat('en-MY', { notation: 'compact', maximumFractionDigits: 1 });

export default function MonthCalendar({ month, selected, onSelect, valuesForDay }) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const offset = (new Date(year, monthIndex, 1).getDay() + 6) % 7;
  const last = new Date(year, monthIndex + 1, 0).getDate();
  const today = localDay(new Date());

  return (
    <View style={styles.calendar}>
      <View style={styles.week}>{weekdays.map(label => <Text key={label} style={styles.weekday}>{label}</Text>)}</View>
      {Array.from({ length: Math.ceil((last + offset) / 7) }, (_, week) => (
        <View key={week} style={styles.week}>
          {Array.from({ length: 7 }, (_, column) => {
            const day = week * 7 + column - offset + 1;
            if (day < 1 || day > last) return <View key={column} style={styles.spacer} />;
            const date = new Date(year, monthIndex, day);
            const key = localDay(date);
            const active = selected === key;
            const isToday = today === key;
            const values = valuesForDay(key, day);
            const label = date.toLocaleDateString('en-MY', { dateStyle: 'full' });
            return (
              <TouchableOpacity key={key} accessibilityRole="button" accessibilityState={{ selected: active }}
                accessibilityLabel={[label, isToday && 'Today', ...values.map(item => item.label + ' ' + money(item.amount))].filter(Boolean).join(', ')}
                onPress={() => onSelect(key)} style={[styles.day, values.length > 0 && styles.hasValues, active && styles.selected]}>
                <View style={[styles.dateBadge, isToday && styles.today]}>
                  <Text style={[styles.number, isToday && styles.todayText]}>{day}</Text>
                </View>
                {values.map(({ label: itemLabel, amount, sign }) => (
                  <Text key={itemLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}
                    style={[styles.value, sign === '−' && styles.spent, sign === '+' && styles.earned]}>
                    {sign}{amount >= 1000 ? shortAmount.format(amount) : amount.toFixed(2)}
                  </Text>
                ))}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  calendar: { gap: 4 },
  week: { flexDirection: 'row', gap: 3 },
  weekday: { flex: 1, textAlign: 'center', fontSize: 11, color: pocket.muted, paddingVertical: 8 },
  spacer: { flex: 1 },
  day: { flex: 1, minHeight: 52, alignItems: 'center', paddingVertical: 4, gap: 1, borderRadius: 9, borderWidth: 1, borderColor: 'transparent', backgroundColor: pocket.white },
  hasValues: { backgroundColor: pocket.blush },
  selected: { borderColor: pocket.action, backgroundColor: pocket.mint },
  dateBadge: { paddingHorizontal: 4, borderRadius: 6 },
  today: { backgroundColor: pocket.action },
  number: { color: pocket.ink, fontWeight: '800', fontSize: 14 },
  todayText: { color: pocket.white },
  value: { color: pocket.muted, width: '100%', fontSize: 10, textAlign: 'center', fontVariant: ['tabular-nums'] },
  spent: { color: pocket.danger },
  earned: { color: pocket.green },
});
