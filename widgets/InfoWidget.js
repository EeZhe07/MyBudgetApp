import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import { cents, formatMoney } from '../lib/budget-store';
import { pocket } from '../screens/budgetUi';

export function InfoWidget({ monthlyBudget = 0, totalExpense = 0, monthExpense = 0 }) {
  const hasBudget = monthlyBudget > 0;
  const remaining = cents(monthlyBudget - monthExpense);
  const isOver = hasBudget && remaining < 0;
  const label = hasBudget ? (isOver ? 'Over budget by' : 'Left this month') : 'Spent this month';

  return (
    <FlexWidget style={{
      height: 'match_parent', width: 'match_parent', backgroundColor: pocket.paper, borderRadius: 12,
      paddingHorizontal: 16, paddingVertical: 12, justifyContent: 'space-between',
    }} clickAction="OPEN_APP">
      <TextWidget text="MyBudget" style={{ fontSize: 14, color: pocket.action, fontWeight: 'bold' }} />
      <TextWidget text={label} style={{ fontSize: 13, color: pocket.muted }} />
      <TextWidget text={formatMoney(hasBudget ? Math.abs(remaining) : monthExpense)}
        style={{ fontSize: 23, color: isOver ? pocket.danger : pocket.ink, fontWeight: 'bold' }} />
      <TextWidget text={'Today · ' + formatMoney(totalExpense)} style={{ fontSize: 12, color: pocket.muted }} />
    </FlexWidget>
  );
}
