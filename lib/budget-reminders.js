import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo';
import { upcomingReminders } from './budget-recurring';

const channel = 'recurring-budget';
const prefix = 'budget-recurring:';
let loading;
let scheduled = Promise.resolve();

async function notifications() {
  if (!['android', 'ios'].includes(Platform.OS) || !requireOptionalNativeModule('ExpoNotificationScheduler')) {
    return null;
  }
  loading ??= import('expo-notifications').then(async api => {
    if (Platform.OS === 'android') {
      await api.setNotificationChannelAsync(channel, { name: 'Scheduled transactions', importance: api.AndroidImportance.DEFAULT });
    }
    api.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false,
      }),
    });
    return api;
  }).catch(error => { loading = undefined; throw error; });
  return loading;
}

export async function requestReminderPermission() {
  const api = await notifications();
  if (!api) return false;
  const existing = await api.getPermissionsAsync();
  if (existing.granted) return true;
  return existing.canAskAgain && (await api.requestPermissionsAsync()).granted;
}

export function syncBudgetReminders(rules, assets) {
  const result = scheduled.then(async () => {
    const api = await notifications();
    if (!api) return rules.some(rule => rule.reminderDays != null) ? 'unavailable' : true;
    const planned = new Map(upcomingReminders(rules, assets).map(reminder => [reminder.identifier, reminder]));
    for (const request of await api.getAllScheduledNotificationsAsync()) {
      if (!request.identifier.startsWith(prefix)) continue;
      const reminder = planned.get(request.identifier);
      if (reminder && reminder.body === request.content.body && reminder.date.getTime() === request.content.data?.timestamp) {
        planned.delete(request.identifier);
      } else {
        await api.cancelScheduledNotificationAsync(request.identifier);
      }
    }
    if (!(await api.getPermissionsAsync()).granted) return !rules.some(rule => rule.reminderDays != null);
    for (const { identifier, body, date } of planned.values()) {
      if (date <= new Date()) continue;
      await api.scheduleNotificationAsync({
        identifier,
        content: { title: 'Scheduled transaction', body, data: { timestamp: date.getTime() } },
        trigger: { type: api.SchedulableTriggerInputTypes.DATE, date, channelId: channel },
      });
    }
    return true;
  });
  scheduled = result.catch(() => {});
  return result;
}
