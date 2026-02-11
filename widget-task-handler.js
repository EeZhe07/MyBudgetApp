import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { InfoWidget } from './widgets/InfoWidget';
import { ActionWidget } from './widgets/ActionWidget';

const STORAGE_KEY = '@my_budget_data';
const BUDGET_KEY = '@my_budget_plan';

async function getWidgetData() {
  try {
    // Read transactions
    const transJson = await AsyncStorage.getItem(STORAGE_KEY);
    const transactions = transJson ? JSON.parse(transJson) : [];

    // Read budget
    const budgetStr = await AsyncStorage.getItem(BUDGET_KEY);
    const monthlyBudget = budgetStr ? parseFloat(budgetStr) : 0;

    // Calculate today's expense
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const todayExpense = transactions
      .filter(t => t.type === 'expense' && t.date && t.date.startsWith(todayStr))
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    // Calculate this month's expense
    const monthStr = todayStr.substring(0, 7); // YYYY-MM
    const monthExpense = transactions
      .filter(t => t.type === 'expense' && t.date && t.date.startsWith(monthStr))
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    return {
      todayExpense,
      monthExpense,
      monthlyBudget,
      remaining: monthlyBudget - monthExpense,
    };
  } catch (e) {
    console.log('Widget data read error:', e);
    return { todayExpense: 0, monthExpense: 0, monthlyBudget: 0, remaining: 0 };
  }
}

export async function widgetTaskHandler(props) {
  const widgetInfo = props.widgetInfo;
  const widgetName = widgetInfo.widgetName;

  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED': {
      if (widgetName === 'InfoWidget') {
        const data = await getWidgetData();
        props.renderWidget(
          <InfoWidget
            monthlyBudget={data.monthlyBudget}
            totalExpense={data.todayExpense}
            monthExpense={data.monthExpense}
          />
        );
      } else if (widgetName === 'ActionWidget') {
        props.renderWidget(<ActionWidget />);
      }
      break;
    }

    case 'WIDGET_CLICK':
      // clickAction="OPEN_APP" handles opening automatically
      break;

    default:
      break;
  }
}
