import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { readBackup } from './budget-store';

export async function saveGoalPicture(uri, base64) {
  const destination = FileSystem.documentDirectory + `goal-${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
  if (base64) {
    await FileSystem.writeAsStringAsync(destination, base64, { encoding: FileSystem.EncodingType.Base64 });
  } else {
    await FileSystem.copyAsync({ from: uri, to: destination });
  }
  return destination;
}

export async function exportBudgetBackup(data) {
  let missingImages = 0;
  const goals = await Promise.all(data.goals.map(async goal => {
    const uri = goal.backgroundImage;
    if (!uri || uri.startsWith('data:')) return goal;
    try {
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
      return { ...goal, backgroundImage: `data:image/jpeg;base64,${base64}` };
    } catch {
      missingImages += 1;
      return { ...goal, backgroundImage: null };
    }
  }));
  const uri = FileSystem.cacheDirectory + `mybudget-${Date.now()}.json`;
  await FileSystem.writeAsStringAsync(uri, JSON.stringify({
    format: 'MyBudgetApp', version: 3, exportedAt: new Date().toISOString(), data: { ...data, goals },
  }));
  await Sharing.shareAsync(uri, { mimeType: 'application/json', dialogTitle: 'Save MyBudgetApp backup' });
  return missingImages;
}

export async function restoreBudgetBackup(restore, showAlert) {
  try {
    const picked = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
    if (picked.canceled) return;
    const file = await FileSystem.readAsStringAsync(picked.assets[0].uri);
    const data = readBackup(file);
    const exportedAt = new Date(JSON.parse(file).exportedAt);
    const backupDate = Number.isFinite(exportedAt.valueOf())
      ? exportedAt.toLocaleString('en-MY', { dateStyle: 'medium', timeStyle: 'short' }) : 'Unavailable';
    const count = (total, singular, plural = singular + 's') => total + ' ' + (total === 1 ? singular : plural);
    const scope = `${count(data.assets.length, 'account')}, ${count(data.transactions.length, 'entry', 'entries')}, ${count(data.goals.length, 'goal')}, ${count(Object.keys(data.monthlyBudgets).length, 'monthly budget')} and ${count(data.recurringRules?.length ?? 0, 'scheduled rule')}`;
    showAlert('Restore budget?', `Backup date: ${backupDate}\n${scope}.\n\nRestoring replaces your local accounts, activity, categories, goals, budgets and scheduled rules and clears pending payment reviews.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Restore', style: 'destructive', onPress: async () => {
          try {
            const goals = await Promise.all(data.goals.map(async goal => {
              const image = goal.backgroundImage?.match(/^data:image\/(?:jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/);
              return { ...goal, backgroundImage: image ? await saveGoalPicture(null, image[1]) : null };
            }));
            await restore({ ...data, goals });
          } catch (error) {
            showAlert('Could not restore backup', error.message);
          }
        },
      },
    ]);
  } catch (error) {
    showAlert('Could not read backup', error.message);
  }
}
