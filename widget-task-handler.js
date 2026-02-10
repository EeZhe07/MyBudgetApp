import React from 'react';
import { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { InfoWidget } from './widgets/InfoWidget';
import { ActionWidget } from './widgets/ActionWidget';

export async function widgetTaskHandler(props) {
  const { widgetInfo } = props;

  // This handler is called for background actions or updates.
  // Since we push data from the App, we might not strictly use this for data fetching
  // unless we implement periodical background updates later.
  
  // However, it's required for the library setup.
  
  if (props.widgetAction === 'WIDGET_ADDED') {
    // Initial render
    props.renderWidget(<InfoWidget expense="0.00" budget="Loading..." theme="dark" />);
  }
}
