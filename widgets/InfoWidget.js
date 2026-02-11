import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

export function InfoWidget({ monthlyBudget, totalExpense, monthExpense }) {
  const budget = parseFloat(monthlyBudget) || 0;
  const todayExp = parseFloat(totalExpense) || 0;
  const monthExp = parseFloat(monthExpense) || todayExp;
  const remaining = budget - monthExp;
  const isOver = remaining < 0;
  const hasBudget = budget > 0;

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: '#1A1F36',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 12,
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
      clickAction="OPEN_APP"
    >
      {/* Header */}
      <FlexWidget style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
        <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TextWidget
            text="💰"
            style={{ fontSize: 14 }}
          />
          <TextWidget
            text=" MyBudget"
            style={{ fontSize: 12, color: '#8B95B0', fontWeight: 'bold' }}
          />
        </FlexWidget>
        <TextWidget
          text={hasBudget ? (isOver ? '🔴' : '🟢') : '📊'}
          style={{ fontSize: 12 }}
        />
      </FlexWidget>

      {/* Today's Expense */}
      <FlexWidget style={{ width: '100%' }}>
        <TextWidget
          text="今日支出 Today"
          style={{ fontSize: 10, color: '#6B7599', fontWeight: '600' }}
        />
        <TextWidget
          text={`RM ${todayExp.toFixed(2)}`}
          style={{ fontSize: 22, color: '#FFFFFF', fontWeight: 'bold', marginTop: 1 }}
        />
      </FlexWidget>

      {/* Divider */}
      <FlexWidget style={{ height: 1, backgroundColor: '#2D3555', width: '100%' }} />

      {/* Budget Status */}
      <FlexWidget style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
        <TextWidget
          text={hasBudget ? '本月剩余' : '月预算未设'}
          style={{ fontSize: 10, color: '#6B7599', fontWeight: '600' }}
        />
        <TextWidget
          text={hasBudget ? `RM ${Math.abs(remaining).toFixed(2)}${isOver ? ' ⚠️' : ''}` : 'Tap to set'}
          style={{ fontSize: 12, color: isOver ? '#EF4444' : '#10B981', fontWeight: 'bold' }}
        />
      </FlexWidget>
    </FlexWidget>
  );
}
