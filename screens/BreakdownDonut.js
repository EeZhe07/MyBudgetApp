import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { Text } from './PocketText';
import { MoneyText, PocketIcon, SectionHeader, TextAction, money, pocket, pocketLayout } from './budgetUi';

const radius = 53;
const point = angle => [72 + radius * Math.cos(angle), 72 + radius * Math.sin(angle)];

export default function BreakdownDonut({ title, total, rows, empty, action, onOpen }) {
  const [selectedId, setSelectedId] = useState(null);
  const selected = rows.find(row => row.id === selectedId);
  let start = -Math.PI / 2;

  return (
    <View style={[pocketLayout.card, styles.panel]}>
      <SectionHeader title={title} action={action} />
      {total <= 0 ? <Text style={styles.caption}>{empty}</Text> : (
        <>
          <View style={styles.chart}>
            <Svg width={164} height={164} viewBox="0 0 144 144" importantForAccessibility="no-hide-descendants">
              <Circle cx={72} cy={72} r={radius} stroke={pocket.line} strokeWidth={20} fill="none" />
              {rows.map(row => {
                const span = row.amount / total * Math.PI * 2;
                const from = point(start);
                start += span;
                const to = point(start);
                const strokeWidth = selected?.id === row.id ? 26 : 20;
                const opacity = selected && selected.id !== row.id ? 0.4 : 1;
                return rows.length === 1
                  ? <Circle key={row.id} cx={72} cy={72} r={radius} stroke={row.color} strokeWidth={strokeWidth} fill="none" onPress={() => setSelectedId(row.id)} />
                  : <Path key={row.id} d={`M${from.join(',')} A${radius},${radius} 0 ${span > Math.PI ? 1 : 0} 1 ${to.join(',')}`}
                      stroke={row.color} strokeWidth={strokeWidth} fill="none" opacity={opacity} onPress={() => setSelectedId(row.id)} />;
              })}
            </Svg>
            <View pointerEvents="none" style={styles.center}>
              <Text style={styles.caption}>{selected ? 'Selected' : 'Total'}</Text>
              <MoneyText value={selected?.amount ?? total} style={styles.centerMoney} />
            </View>
          </View>
          {rows.map(row => {
            const active = row.id === selectedId;
            const percent = row.amount / total * 100;
            const share = percent < 0.1 ? '<0.1%' : percent.toFixed(1) + '%';
            return (
              <View key={row.id}>
                <TouchableOpacity accessibilityRole="button" accessibilityState={{ selected: active }}
                  accessibilityLabel={`${row.label}, ${money(row.amount)}, ${share}`}
                  style={[styles.row, active && styles.active]}
                  onPress={() => onOpen && !row.children ? onOpen(row) : setSelectedId(active ? null : row.id)}>
                  <View style={[styles.dot, { backgroundColor: row.color }]} />
                  <Text style={styles.label}>{row.label}</Text>
                  <View style={styles.values}>
                    <MoneyText value={row.amount} style={styles.money} />
                    <Text style={styles.caption}>{share}</Text>
                  </View>
                  {onOpen && <PocketIcon name={row.children ? 'down' : 'chevron'} size={15} color={pocket.muted} />}
                </TouchableOpacity>
                {active && row.children?.map(child => (
                  <TextAction key={child.id} label={child.label + ' · ' + money(child.amount)} labelStyle={pocketLayout.figures}
                    icon="chevron" onPress={() => onOpen(child)} />
                ))}
                {active && onOpen && !row.children && (
                  <TextAction label="View records" icon="chevron" onPress={() => onOpen(row)} />
                )}
              </View>
            );
          })}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { padding: 14, gap: 4 },
  chart: { alignSelf: 'center', marginVertical: 5 },
  center: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28 },
  centerMoney: { fontSize: 15, textAlign: 'center' },
  caption: { color: pocket.muted, fontSize: 12 },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 48, paddingHorizontal: 6, paddingVertical: 5, gap: 8, borderRadius: 9 },
  active: { backgroundColor: pocket.blush },
  dot: { width: 9, height: 9, borderRadius: 5 },
  label: { flex: 1, color: pocket.ink, fontWeight: '700' },
  values: { alignItems: 'flex-end', flexShrink: 1 },
  money: { fontSize: 14 },
});
