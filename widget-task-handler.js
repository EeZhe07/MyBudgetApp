import React from 'react';
import { InfoWidget } from './widgets/InfoWidget';
import { ActionWidget } from './widgets/ActionWidget';
import { budgetStore } from './lib/budget-db';
import { widgetTotals } from './lib/budget-store';

export async function widgetTaskHandler(props) {
  const widgetInfo = props.widgetInfo;
  const widgetName = widgetInfo.widgetName;

  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED': {
      if (widgetName === 'InfoWidget') {
        const data = await budgetStore.read().catch(() => null);
        if (data) props.renderWidget(<InfoWidget {...widgetTotals(data)} />);
      } else if (widgetName === 'ActionWidget') {
        props.renderWidget(<ActionWidget />);
      }
      break;
    }

    default:
      break;
  }
}
