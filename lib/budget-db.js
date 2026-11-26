import AsyncStorage from '@react-native-async-storage/async-storage';
import { openDatabaseAsync } from 'expo-sqlite';
import { createBudgetStore } from './budget-store';

export const budgetStore = createBudgetStore(
  () => openDatabaseAsync('mybudget.db'),
  keys => AsyncStorage.multiGet(keys),
);
