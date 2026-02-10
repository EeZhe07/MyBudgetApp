import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

export function InfoWidget({ expense, budget, theme }) {
  const bgColor = theme === 'dark' ? '#1E293B' : '#FFFFFF';
  const textColor = theme === 'dark' ? '#F8FAFC' : '#000000';
  const subTextColor = theme === 'dark' ? '#94A3B8' : '#666666';

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: bgColor,
        borderRadius: 16,
        padding: 16,
        flexDirection: 'column',
        justifyContent: 'space-between'
      }}
      clickAction="OPEN_APP"
    >
      <FlexWidget style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <TextWidget
          text="今日支出"
          style={{ fontSize: 14, color: subTextColor, fontWeight: 'bold' }}
        />
        <TextWidget
          text="📊"
          style={{ fontSize: 14 }}
        />
      </FlexWidget>

      <TextWidget
        text={`RM ${expense || '0.00'}`}
        style={{ fontSize: 28, color: textColor, fontWeight: 'bold', marginTop: 4 }}
      />

      <FlexWidget style={{ height: 1, backgroundColor: '#334155', marginVertical: 8, width: '100%' }} />

      <FlexWidget style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <TextWidget
          text="剩余预算"
          style={{ fontSize: 12, color: subTextColor }}
        />
        <TextWidget
          text={`RM ${budget || '0.00'}`}
          style={{ fontSize: 12, color: '#10B981', fontWeight: 'bold' }}
        />
      </FlexWidget>
    </FlexWidget>
  );
}
