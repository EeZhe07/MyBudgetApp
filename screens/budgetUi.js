import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, PanResponder, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from './PocketText';
import Svg, { Path, SvgXml } from 'react-native-svg';
import { iconCatalog } from '../assets/lucide-icons';
import { categoryAppearance, categoryPresets, pastelSwatches } from '../lib/budget-icons';
import { accountMovement, formatMoney as money, localDay, transactionDay } from '../lib/budget-store';

export { money };

export const pocket = {
  paper: '#FBF5ED', white: '#FFFDF9', ink: '#342D32', muted: '#645B60',
  line: '#E7DCD1', action: '#22594F', blush: '#F8E2DE', peach: '#FBE7CF',
  green: '#396348', danger: '#9F3A43', lavender: '#EDE4F4', mint: '#E1EFE5',
  expense: '#C84B31', income: '#1E6F50', transfer: '#5C6B73',
};

export const journalSerif = Platform.select({ ios: 'Georgia', default: 'serif' });

export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then(value => { if (active) setReduced(value); });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => { active = false; subscription.remove(); };
  }, []);
  return reduced;
}

const legacyCategoryNames = {
  food: '餐饮', transport: '交通', shopping: '购物', entertainment: '娱乐',
  housing: '居住', medical: '医疗', transfer: '转账', other: '其他',
  salary: '工资', invest: '理财', parttime: '兼职',
};

const drawings = {
  home: 'M2.5 11.5 12 3l9.5 8.5M5.5 10v10h13V10M10 20v-5h4v5',
  wallet: 'M19 7V5H6a3 3 0 0 0 0 6h13M3 8v10a2 2 0 0 0 2 2h15v-8H5M20 13h-4a2 2 0 0 0 0 4h4',
  chart: 'M4 4v16h16M8 15v-3m4 3V8m4 7v-5m4 5V5',
  settings: 'M5 6h14M5 12h14M5 18h14M9 4v4m6 2v4m-4 2v4',
  edit: 'M4 20l4-1 11-11-3-3L5 16l-1 4zm10-13 3 3',
  copy: 'M9 8h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2Zm7-4a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2',
  trash: 'M3 6h18M9 6V3h6v3M5 6l1 14h12l1-14M10 10v6m4-6v6',
  dots: 'M5 12h.1m6.9 0h.1m6.9 0h.1',
  calendar: 'M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm2-2v4m10-4v4M3 10h18m-13 4h1m5 0h1m-7 3h1',
  chevron: 'm9 6 6 6-6 6',
  back: 'm15 6-6 6 6 6',
  down: 'm6 9 6 6 6-6',
  plus: 'M12 5v14M5 12h14',
  close: 'm6 6 12 12M18 6 6 18',
  check: 'm5 12 4 4L19 6',
  receipt: 'M6 3h12v18l-3-2-3 2-3-2-3 2V3Zm3 5h6m-6 4h6m-6 4h3',
  goal: 'M12 21v-8m0 1c-5 0-8-3.5-8-8 5 0 8 3.5 8 8Zm0-3c0-4.5 3-7 8-7 0 4.5-3 7-8 7ZM8 21h8',
  search: 'M16 16l4.5 4.5M18 10.5a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z',
  archive: 'M4 7h16v13H4zM3 4h18v3H3zM9 11h6',
  upload: 'M12 15V4m-4 4 4-4 4 4M5 14v6h14v-6',
  download: 'M12 4v11m-4-4 4 4 4-4M5 14v6h14v-6',
  bell: 'M5 17h14l-2-4v-3a5 5 0 0 0-10 0v3l-2 4Zm5 3a2 2 0 0 0 4 0',
  refresh: 'M20 10a8 8 0 1 0-2 8m2-14v6h-6',
};

export function PocketIcon({ name, size = 22, color = pocket.ink }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessible={false}>
      <Path d={drawings[name]} fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function IdentityIcon({ iconKey, color, size = 22 }) {
  const markup = iconCatalog[iconKey][1];
  const xml = '<svg viewBox="0 0 24 24" fill="none" stroke="' + color +
    '" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">' + markup + '</svg>';
  return <SvgXml xml={xml} width={size} height={size} accessible={false} />;
}

export function IdentityBadge({ appearance, size = 40 }) {
  const { iconKey, colorKey } = appearance;
  const { fill, ink } = pastelSwatches[colorKey];
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
      style={[styles.badge, { width: size, height: size, borderRadius: Math.min(12, size * 0.3), backgroundColor: fill }]}>
      <IdentityIcon iconKey={iconKey} color={ink} size={size * 0.58} />
    </View>
  );
}

export function PageHeader({ icon, title, action, symbol, tint, appearance }) {
  return (
    <View style={styles.pageHeader}>
      <View style={styles.pageHeading}>
        {appearance ? <IdentityBadge appearance={appearance} /> : icon && <View style={[styles.pageIcon, tint && { backgroundColor: tint }]}>
          {symbol ? <Text style={styles.customIcon}>{symbol}</Text> : <PocketIcon name={icon} size={20} color={pocket.action} />}
        </View>}
        <Text style={styles.pageTitle} accessibilityRole="header">{title}</Text>
      </View>
      {action}
    </View>
  );
}

export function ScreenTitle({ children }) {
  return <Text style={styles.screenTitle} accessibilityRole="header">{children}</Text>;
}

export function SectionHeader({ title, action }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle} accessibilityRole="header">{title}</Text>
      {action}
    </View>
  );
}

export function TextAction({ icon, label, onPress, labelStyle }) {
  return (
    <TouchableOpacity accessibilityRole="button" onPress={onPress} style={styles.textAction}>
      {icon && <PocketIcon name={icon} size={16} color={pocket.action} />}
      <Text style={[styles.actionLabel, labelStyle]}>{label}</Text>
    </TouchableOpacity>
  );
}

export function PrimaryButton({ icon, label, onPress }) {
  return (
    <TouchableOpacity accessibilityRole="button" onPress={onPress} style={styles.primary}>
      {icon && <PocketIcon name={icon} size={20} color={pocket.white} />}
      <Text style={styles.primaryText}>{label}</Text>
    </TouchableOpacity>
  );
}

export function MoneyText({ value, style, ...props }) {
  return <Text {...props} style={[pocketLayout.amount, style]}>{money(value)}</Text>;
}

export function EmptyState({ title, description }) {
  return (
    <View style={[pocketLayout.card, styles.empty]}>
      <Text style={styles.rowTitle}>{title}</Text>
      {description && <Text style={styles.meta}>{description}</Text>}
    </View>
  );
}

export function dateLabel(day) {
  const now = new Date();
  if (day === localDay(now)) return 'Today';
  const year = now.getFullYear();
  now.setDate(now.getDate() - 1);
  if (day === localDay(now)) return 'Yesterday';
  const date = new Date(`${day}T12:00:00`);
  return date.toLocaleDateString('en-MY', {
    weekday: 'short', day: 'numeric', month: 'short', ...(date.getFullYear() !== year && { year: 'numeric' }),
  });
}

export function groupTransactions(transactions) {
  const groups = new Map();
  for (const entry of [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date))) {
    const day = transactionDay(entry.date);
    if (!groups.has(day)) groups.set(day, []);
    groups.get(day).push(entry);
  }
  return [...groups];
}

export function isTngAccount(name) {
  return /^(?:tng(?:\s+e-?wallet)?|t&g|touch\s*['’]?n\s*go(?:\s+e-?wallet)?)$/i.test(name.trim());
}

function WalletBadge({ name }) {
  const color = isTngAccount(name) ? '#3679B0' : /^maybank\b/i.test(name.trim()) ? '#B28114' : pocket.transfer;
  return (
    <View style={styles.walletBadge}>
      <View style={[styles.walletDot, { backgroundColor: color }]} />
      <Text style={styles.walletName}>{name}</Text>
    </View>
  );
}

const swipeButtonWidth = 66;

function SwipeLedgerRow({ children, onOpen, onCopy, onDelete, openSwipe, reduced }) {
  const [position] = useState(() => new Animated.Value(0));
  const [tray, setTray] = useState('closed');
  const offset = useRef(0);
  const actionWidth = swipeButtonWidth * (onCopy ? 2 : 1);

  const settle = useCallback(next => {
    offset.current = next;
    if (reduced) {
      position.setValue(next);
      setTray(next === 0 ? 'closed' : 'open');
      return;
    }
    setTray(next === 0 ? 'moving' : 'open');
    Animated.timing(position, { toValue: next, duration: 160, useNativeDriver: true, isInteraction: false }).start(({ finished }) => {
      if (finished && next === 0) setTray('closed');
    });
  }, [position, reduced]);

  const close = useCallback(() => {
    if (openSwipe.current === close) openSwipe.current = null;
    settle(0);
  }, [openSwipe, settle]);

  useEffect(() => () => {
    if (openSwipe.current === close) openSwipe.current = null;
  }, [openSwipe, close]);

  const { panHandlers } = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponderCapture: (_, { dx, dy }) =>
      (dx < -10 || (offset.current < 0 && dx > 10)) && Math.abs(dx) > Math.abs(dy) * 1.5,
    onPanResponderGrant: () => {
      if (openSwipe.current !== close) openSwipe.current?.();
      openSwipe.current = close;
      position.stopAnimation();
      setTray('moving');
    },
    onPanResponderMove: (_, { dx }) => position.setValue(Math.min(0, Math.max(-actionWidth, offset.current + dx))),
    onPanResponderRelease: (_, { dx }) => {
      if (offset.current + dx < -actionWidth / 3) settle(-actionWidth);
      else close();
    },
    onPanResponderTerminate: close,
  }), [actionWidth, close, openSwipe, position, settle]);

  const run = action => {
    openSwipe.current?.();
    action();
  };
  const actions = [
    ...(onCopy ? [{ name: 'copy', label: 'Copy', color: pocket.action, handler: onCopy }] : []),
    { name: 'trash', label: 'Delete', color: pocket.danger, handler: onDelete },
  ];

  return (
    <View {...panHandlers} style={styles.swipeRow}>
      {tray !== 'closed' && (
        <View style={styles.swipeTray} pointerEvents={tray === 'open' ? 'auto' : 'none'}
          accessibilityElementsHidden={tray !== 'open'} importantForAccessibility={tray === 'open' ? 'auto' : 'no-hide-descendants'}>
          {actions.map(({ name, label, color, handler }) => (
            <TouchableOpacity key={name} accessibilityRole="button" accessibilityLabel={label + ' transaction'}
              onPress={() => run(handler)} style={[styles.swipeButton, { backgroundColor: color }]}>
              <PocketIcon name={name} size={18} color={pocket.white} />
              <Text style={styles.swipeLabel}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      <Animated.View style={{ transform: [{ translateX: position }] }}>
        <TouchableOpacity accessibilityRole="button" accessibilityHint="Swipe left to reveal transaction actions"
          onPress={() => run(onOpen)} onLongPress={onCopy ? () => run(onCopy) : undefined} style={styles.ledgerRow}
          accessibilityActions={actions.map(({ name, label }) => ({ name, label: label + ' transaction' }))}
          onAccessibilityAction={({ nativeEvent }) => {
            const action = actions.find(({ name }) => name === nativeEvent.actionName);
            if (action) run(action.handler);
          }}>
          {children}
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

export function LedgerGroup({ day, entries, categories, accountId, goalId, onOpen, recordActions, showTimes = false }) {
  return (
    <View>
      <Text style={styles.groupLabel}>{dateLabel(day)}</Text>
      {entries.map(entry => {
        const category = categories[entry.type]?.find(item => item.id === entry.categoryId);
        const title = transactionLabel(entry, category);
        const categoryName = categoryLabel(category, entry.categoryId);
        const accounts = [entry.assetName, entry.toAssetName].filter(Boolean);
        const time = showTimes && entry.date?.includes('T')
          ? new Date(entry.date).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit', hour12: false }) : '';
        const details = [time, entry.reimbursementFor != null ? 'Repayment' : title === categoryName ? '' : categoryName,
          entry.reimbursable && 'Split expense'].filter(Boolean).join(' · ');
        const movement = accountId != null ? accountMovement(entry, accountId)
          : goalId != null ? Math.abs(entry.amount) : null;
        const amount = movement == null ? transactionAmount(entry) : signedMoney(movement);
        return (
          <SwipeLedgerRow key={entry.id} onOpen={() => onOpen(entry)} openSwipe={recordActions.openSwipe} reduced={recordActions.reduced}
            onCopy={recordActions.canCopy(entry) ? () => recordActions.onCopy(entry) : undefined}
            onDelete={() => recordActions.onDelete(entry)}>
            <CategoryBadge category={category} entry={entry} />
            <View style={styles.rowDetails}>
              <Text style={styles.rowTitle}>{title}</Text>
              {(details || accounts.length > 0) && (
                <View style={styles.rowMeta}>
                  {details ? <Text style={[styles.meta, styles.metaPart]}>{details}</Text> : null}
                  {accounts[0] && <WalletBadge name={accounts[0]} />}
                  {accounts[1] && <><Text style={styles.meta}>→</Text><WalletBadge name={accounts[1]} /></>}
                </View>
              )}
            </View>
            <Text style={[pocketLayout.amount, styles.rowAmount, { color: pocket[entry.type] ?? pocket.ink }]}>{amount}</Text>
          </SwipeLedgerRow>
        );
      })}
    </View>
  );
}

export function LedgerList({ groups, ...props }) {
  return (
    <View style={[pocketLayout.card, styles.ledger]}>
      {groups.map(([day, entries]) => <LedgerGroup key={day} day={day} entries={entries} {...props} />)}
    </View>
  );
}

export const pocketLayout = StyleSheet.create({
  screen: { flex: 1, backgroundColor: pocket.paper },
  content: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 26, gap: 16 },
  navClearance: { paddingBottom: 92 },
  card: { backgroundColor: pocket.white, borderColor: pocket.line, borderWidth: 1, borderRadius: 20 },
  amount: { color: pocket.ink, fontWeight: '600', fontVariant: ['tabular-nums'] },
  figures: { fontVariant: ['tabular-nums'] },
});

export function categoryLabel(category, id = category?.id) {
  const name = category?.name;
  return name && name !== legacyCategoryNames[id] ? name : categoryPresets[id]?.name ?? name ?? '';
}

export function transactionLabel(transaction, category) {
  const id = transaction.type === 'transfer' ? 'transfer' : transaction.categoryId;
  const name = transaction.title || category?.name;
  if (transaction.subType === 'goal_deposit' && name?.startsWith('存入目标: ')) return 'Deposit to ' + name.slice(6);
  return categoryLabel({ name }, id) || 'Transaction';
}

export function transactionAmount(transaction) {
  if (transaction.type === 'expense') return signedMoney(-Math.abs(transaction.amount));
  if (transaction.type === 'income') return signedMoney(Math.abs(transaction.amount));
  if (['opening', 'adjustment'].includes(transaction.subType)) return signedMoney(transaction.amount);
  return money(Math.abs(transaction.amount));
}

export function signedMoney(value) {
  const sign = value < 0 ? '−' : value > 0 ? '+' : '';
  return `${sign}${money(Math.abs(value))}`;
}

export function CategoryBadge({ category, entry, size }) {
  return <IdentityBadge appearance={categoryAppearance(category, entry)} size={size} />;
}

const styles = StyleSheet.create({
  badge: { alignItems: 'center', justifyContent: 'center' },
  customIcon: { fontSize: 18, color: pocket.ink },
  pageHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48 },
  pageHeading: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 9 },
  pageIcon: { width: 38, height: 38, borderRadius: 12, borderBottomLeftRadius: 4, transform: [{ rotate: '-6deg' }], backgroundColor: pocket.peach, alignItems: 'center', justifyContent: 'center' },
  pageTitle: { color: pocket.ink, flexShrink: 1, fontSize: 32, fontFamily: journalSerif, fontStyle: 'italic', letterSpacing: -1 },
  screenTitle: { color: pocket.ink, fontSize: 38, fontFamily: journalSerif, fontStyle: 'italic', letterSpacing: -1.5 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 6, minHeight: 33 },
  sectionTitle: { color: pocket.ink, flexShrink: 1, fontSize: 23, fontFamily: journalSerif, letterSpacing: -0.6 },
  textAction: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 },
  actionLabel: { color: pocket.action, fontWeight: '600', fontSize: 14, flexShrink: 1 },
  primary: { minHeight: 48, borderRadius: 24, backgroundColor: pocket.action, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 20 },
  primaryText: { color: pocket.white, fontSize: 16, fontWeight: '600', textAlign: 'center', flexShrink: 1 },
  empty: { padding: 16, gap: 4 },
  ledger: { paddingHorizontal: 12, paddingBottom: 2 },
  groupLabel: { color: pocket.muted, fontSize: 14, fontWeight: '500', paddingTop: 12, paddingBottom: 8 },
  swipeRow: { overflow: 'hidden', borderTopWidth: StyleSheet.hairlineWidth, borderColor: pocket.line },
  swipeTray: { position: 'absolute', right: 0, top: 4, bottom: 4, flexDirection: 'row', borderRadius: 12, overflow: 'hidden' },
  swipeButton: { width: swipeButtonWidth, alignItems: 'center', justifyContent: 'center', gap: 3 },
  swipeLabel: { color: pocket.white, fontSize: 12, fontWeight: '600', textAlign: 'center' },
  ledgerRow: { minHeight: 64, flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 8, backgroundColor: pocket.white },
  rowDetails: { flex: 1, gap: 2 },
  rowTitle: { color: pocket.ink, fontSize: 16, fontWeight: '600' },
  meta: { color: pocket.muted, fontSize: 14 },
  rowMeta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 4 },
  metaPart: { flexShrink: 1 },
  walletBadge: { flexDirection: 'row', alignItems: 'center', flexShrink: 1, gap: 4, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2, backgroundColor: pocket.paper },
  walletDot: { width: 6, height: 6, borderRadius: 3 },
  walletName: { color: pocket.muted, fontSize: 12, flexShrink: 1 },
  rowAmount: { maxWidth: '45%', fontSize: 16, textAlign: 'right' },
});
