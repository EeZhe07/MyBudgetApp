import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

export function ActionWidget() {
  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: '#6366F1',
        borderRadius: 24,
        padding: 16,
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
      }}
      clickAction="OPEN_APP"
      clickActionData={{ uri: 'mybudgetapp://add' }}
    >
      {/* Icon Circle */}
      <FlexWidget
        style={{
          width: 52,
          height: 52,
          borderRadius: 26,
          backgroundColor: 'rgba(255,255,255,0.2)',
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: 8,
        }}
      >
        <TextWidget
          text="✏️"
          style={{ fontSize: 24 }}
        />
      </FlexWidget>

      {/* Label */}
      <TextWidget
        text="快速记账"
        style={{ fontSize: 13, color: '#FFFFFF', fontWeight: 'bold' }}
      />
      <TextWidget
        text="Quick Add"
        style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}
      />
    </FlexWidget>
  );
}
