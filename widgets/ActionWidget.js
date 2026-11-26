import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import { createURL } from 'expo-linking';
import { pocket } from '../screens/budgetUi';

export function ActionWidget() {
  return (
    <FlexWidget style={{
      height: 'match_parent', width: 'match_parent', backgroundColor: pocket.action, borderRadius: 12,
      padding: 12, justifyContent: 'center', alignItems: 'center',
    }} clickAction="OPEN_URI" clickActionData={{ uri: createURL('add') }}>
      <TextWidget text="+" style={{ fontSize: 28, color: pocket.white, fontWeight: 'bold' }} />
      <TextWidget text="Record expense" style={{ fontSize: 13, color: pocket.white, fontWeight: 'bold' }} />
    </FlexWidget>
  );
}
