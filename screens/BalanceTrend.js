import React, { useCallback, useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Line, Path, Stop } from 'react-native-svg';
import { balanceTrendDomain } from '../lib/budget-insights';
import { Text } from './PocketText';
import { MoneyText, money, pocket, pocketLayout } from './budgetUi';

const height = 110;
const insetX = 5;
const top = 8;
const bottom = height - top;
const compact = new Intl.NumberFormat('en-MY', { notation: 'compact', maximumFractionDigits: 1 });

function axisLabel(value) {
  return (value < 0 ? '−' : '') + 'RM ' + compact.format(Math.abs(value)).toLowerCase();
}

export default function BalanceTrend({ points, label = 'Estimated net worth' }) {
  const [width, setWidth] = useState(300);
  const [selectedDay, setSelectedDay] = useState(null);
  const plotLeft = useRef(0);
  const lastIndex = points.length - 1;
  const selectedIndex = points.findIndex(point => point.day === selectedDay);
  const index = selectedIndex < 0 ? lastIndex : selectedIndex;
  const scrubAt = useCallback(x => {
    const position = Math.max(0, Math.min(1, (x - insetX) / Math.max(1, width - 2 * insetX)));
    if (lastIndex >= 0) setSelectedDay(points[Math.round(position * lastIndex)].day);
  }, [lastIndex, points, width]);
  const { panHandlers } = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, { dx, dy }) => Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(dy) * 1.5,
    onPanResponderGrant: ({ nativeEvent }) => {
      plotLeft.current = nativeEvent.pageX - nativeEvent.locationX;
      scrubAt(nativeEvent.locationX);
    },
    onPanResponderMove: ({ nativeEvent }) => scrubAt(nativeEvent.pageX - plotLeft.current),
  }), [scrubAt]);
  if (lastIndex < 0) return null;

  const { low, high } = balanceTrendDomain(points);
  const coordinates = points.map((point, position) => [
    insetX + (width - 2 * insetX) * (lastIndex === 0 ? 0.5 : position / lastIndex),
    top + (high - point.value) / (high - low) * (bottom - top),
  ]);
  const line = coordinates.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x},${y}`).join(' ');
  const [x, y] = coordinates[index];
  const point = points[index];
  const date = new Date(point.day + 'T12:00:00').toLocaleDateString('en-MY', { day: 'numeric', month: 'short' });

  return (
    <View style={styles.trend}>
      <View style={styles.row}>
        <View style={styles.plot} onLayout={event => setWidth(Math.max(2 * insetX + 1, event.nativeEvent.layout.width))}
          {...panHandlers} accessible accessibilityRole="adjustable" accessibilityLabel={label}
          accessibilityValue={{ min: 0, max: lastIndex, now: index, text: date + ', ' + money(point.value) }}
          accessibilityHint="Tap or drag to inspect daily balances."
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={({ nativeEvent }) => {
            const next = index + (nativeEvent.actionName === 'increment' ? 1 : -1);
            setSelectedDay(points[Math.max(0, Math.min(lastIndex, next))].day);
          }}>
          <Svg pointerEvents="none" width="100%" height={height} viewBox={`0 0 ${width} ${height}`} accessible={false}>
            <Defs>
              <LinearGradient id="trendFill" x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0" stopColor={pocket.action} stopOpacity={0.18} />
                <Stop offset="1" stopColor={pocket.action} stopOpacity={0.01} />
              </LinearGradient>
            </Defs>
            {[top, height / 2, bottom].map(guide => (
              <Line key={guide} x1={insetX} x2={width} y1={guide} y2={guide}
                stroke={pocket.line} strokeDasharray="4 4" />
            ))}
            {lastIndex > 0 && <Path d={`${line} L${width - insetX},${height} H${insetX} Z`} fill="url(#trendFill)" />}
            <Path d={line} fill="none" stroke={pocket.action} strokeWidth={2.2} strokeLinejoin="round" />
            <Line x1={x} x2={x} y1={top} y2={bottom} stroke={pocket.action} strokeOpacity={0.35} />
            <Circle cx={x} cy={y} r={4} fill={pocket.action} />
          </Svg>
          <Pressable accessible={false} style={StyleSheet.absoluteFill} onPress={event => scrubAt(event.nativeEvent.locationX)} />
        </View>
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.axis}>
          <Text style={[styles.caption, pocketLayout.figures]}>{axisLabel(high)}</Text>
          <Text style={[styles.caption, pocketLayout.figures]}>{axisLabel(low)}</Text>
        </View>
      </View>
      <View style={styles.detail}>
        <Text style={styles.caption}>{date}</Text>
        <MoneyText value={point.value} style={styles.amount} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  trend: { gap: 5 },
  row: { flexDirection: 'row', gap: 7 },
  plot: { flex: 1, minWidth: 1 },
  axis: { minHeight: height, justifyContent: 'space-between', alignItems: 'flex-end' },
  caption: { color: pocket.muted, fontSize: 12, fontWeight: '600' },
  detail: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', gap: 6,
    backgroundColor: pocket.paper, paddingVertical: 7, paddingHorizontal: 9, borderRadius: 9 },
  amount: { fontSize: 14, color: pocket.action, textAlign: 'right' },
});
