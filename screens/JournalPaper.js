import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

// Printed grid on the journal covers, with a quiet pearlescent finish for the dock.
export default function JournalPaper({ from, to, grid = false }) {
  return (
    <View pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%" viewBox="0 0 320 200" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="wash" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0" stopColor={from} />
            <Stop offset="0.55" stopColor={to} />
            <Stop offset="1" stopColor={from} />
          </LinearGradient>
        </Defs>
        <Rect width="320" height="200" fill="url(#wash)" />
        {grid && <Path d="M0 25h320 M0 50h320 M0 75h320 M0 100h320 M0 125h320 M0 150h320 M0 175h320 M25 0v200 M50 0v200 M75 0v200 M100 0v200 M125 0v200 M150 0v200 M175 0v200 M200 0v200 M225 0v200 M250 0v200 M275 0v200 M300 0v200"
          stroke="white" strokeOpacity={0.42} strokeWidth={1} />}
      </Svg>
    </View>
  );
}
