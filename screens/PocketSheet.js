import React, { useEffect, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Modal, Platform, StyleSheet, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from './PocketText';
import { PocketIcon, pocket, useReducedMotion } from './budgetUi';

export default function PocketSheet({ title, onClose, children, footer, compact = false }) {
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const { height: windowHeight } = useWindowDimensions();
  const [height, setHeight] = useState(0);
  const [keyboardVisible, setKeyboardVisible] = useState(() => Keyboard.isVisible());
  const android = Platform.OS === 'android';
  const keyboardOpen = keyboardVisible || (android && height > 0 && height < windowHeight - insets.top - insets.bottom - 96);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

  return (
    <Modal animationType={reduced ? 'none' : 'slide'} transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior="padding" onLayout={event => setHeight(event.nativeEvent.layout.height)}
        style={[styles.overlay, !android && { paddingTop: insets.top, paddingLeft: insets.left, paddingRight: insets.right }]}>
        <View style={[styles.sheet, compact ? styles.compact : styles.full,
          { paddingBottom: keyboardOpen ? 8 : Math.max(12, compact || !android ? insets.bottom : 0) }]}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text accessibilityRole="header" style={styles.title}>{title}</Text>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} style={styles.close}>
              <PocketIcon name="close" size={20} />
            </TouchableOpacity>
          </View>
          {children}
          {footer?.(keyboardOpen)}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#2F29266E' },
  sheet: { backgroundColor: pocket.paper, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 16 },
  full: { height: '96%' },
  compact: { maxHeight: '94%', flexShrink: 1 },
  handle: { width: 34, height: 4, borderRadius: 3, alignSelf: 'center', marginTop: 8, backgroundColor: pocket.line },
  header: { minHeight: 49, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  title: { flex: 1, color: pocket.ink, fontSize: 21, fontWeight: '800', letterSpacing: -0.4 },
  close: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: pocket.white, borderRadius: 8 },
});
