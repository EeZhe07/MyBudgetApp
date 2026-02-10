import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

export function ActionWidget({ theme }) {
  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: '#6366F1', // Primary Indigo
        borderRadius: 24, // Circle-ish
        justifyContent: 'center',
        alignItems: 'center'
      }}
      clickAction="OPEN_APP" 
      // Note: We can pass data URI to open specific modal later
      clickActionData={{ uri: 'mybudgetapp://add' }}
    >
      <TextWidget
        text="+"
        style={{ fontSize: 32, color: '#FFFFFF', fontWeight: 'bold' }}
      />
    </FlexWidget>
  );
}
