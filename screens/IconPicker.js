import React, { useState } from 'react';
import { Keyboard, StyleSheet, TouchableOpacity, View } from 'react-native';
import { iconCatalog } from '../assets/lucide-icons';
import { pastelSwatches } from '../lib/budget-icons';
import { Text } from './PocketText';
import { IdentityBadge, IdentityIcon, PocketIcon, pocket } from './budgetUi';

const allIcons = Object.keys(iconCatalog);

export default function IconPicker({ appearance, suggestedIcons, onChange }) {
  const [expanded, setExpanded] = useState(false);
  const { iconKey, colorKey } = appearance;
  const selected = pastelSwatches[colorKey];
  const shownIcons = [...new Set([...suggestedIcons, ...(expanded ? allIcons : [iconKey])])];

  return (
    <View style={styles.picker}>
      <View style={styles.preview}>
        <IdentityBadge appearance={appearance} />
        <View style={styles.previewText}>
          <Text style={styles.iconName}>{iconCatalog[iconKey][0]}</Text>
          <Text style={styles.label}>{selected.label}</Text>
        </View>
      </View>
      <Text style={styles.label}>Icon</Text>
      <View style={styles.choices}>
        {shownIcons.map(key => {
          const active = key === iconKey;
          return (
            <TouchableOpacity key={key} accessibilityRole="button" accessibilityLabel={iconCatalog[key][0] + ' icon'}
              accessibilityState={{ selected: active }} onPress={() => onChange({ iconKey: key })}
              style={[styles.option, active && styles.selected, active && { backgroundColor: selected.fill }]}>
              <IdentityIcon iconKey={key} color={active ? selected.ink : pocket.ink} />
            </TouchableOpacity>
          );
        })}
      </View>
      <TouchableOpacity accessibilityRole="button" accessibilityState={{ expanded }}
        style={styles.more} onPress={() => { Keyboard.dismiss(); setExpanded(!expanded); }}>
        <Text style={styles.moreText}>{expanded ? 'Show fewer icons' : 'Show all ' + allIcons.length + ' icons'}</Text>
      </TouchableOpacity>
      <Text style={styles.label}>Color</Text>
      <View style={styles.choices}>
        {Object.entries(pastelSwatches).map(([key, swatch]) => {
          const active = key === colorKey;
          return (
            <TouchableOpacity key={key} accessibilityRole="button" accessibilityLabel={swatch.label}
              accessibilityState={{ selected: active }} onPress={() => onChange({ colorKey: key })}
              style={[styles.swatchButton, active && styles.selected]}>
              <View style={[styles.swatch, { backgroundColor: swatch.fill }]}>
                {active && <PocketIcon name="check" size={17} color={swatch.ink} />}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  picker: { gap: 6 },
  preview: { flexDirection: 'row', alignItems: 'center', padding: 9, gap: 9, borderRadius: 12, backgroundColor: pocket.paper },
  previewText: { flex: 1, gap: 2 },
  iconName: { fontSize: 15, fontWeight: '700', color: pocket.ink },
  label: { fontSize: 14, color: pocket.muted },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  option: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderWidth: 1, borderColor: pocket.line, backgroundColor: pocket.white },
  selected: { borderColor: pocket.action, borderWidth: 2 },
  more: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center', paddingRight: 10 },
  moreText: { color: pocket.action, fontSize: 14, fontWeight: '600' },
  swatchButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 24, borderWidth: 2, borderColor: 'transparent' },
  swatch: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: pocket.line },
});
